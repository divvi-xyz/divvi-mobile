import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import {
  ReviewContent,
  ReviewSummary,
  ReviewSummaryItem,
  ReviewTransaction,
} from 'src/components/ReviewTransaction'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon from 'src/components/TokenIcon'
import { getEarnPositionBalanceValues, getTotalYieldRate } from 'src/earn/utils'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol, usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import type { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import { positionsWithBalanceSelector } from 'src/positions/selectors'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { useTokenInfo, useTokensInfo, useTokenToLocalAmount } from 'src/tokens/hooks'
import { convertTokenToLocalAmount } from 'src/tokens/utils'
import Logger from 'src/utils/Logger'

const TAG = 'earn/EarnWithdrawConfirmationScreen'

type Props = NativeStackScreenProps<StackParamList, Screens.EarnWithdrawConfirmationScreen>

function useRewards(params: Props['route']['params']) {
  const { rewardsPositionIds } = params.pool.dataProps
  const rewardsPositions = useSelector(positionsWithBalanceSelector).filter((position) =>
    rewardsPositionIds?.includes(position.positionId)
  )
  const tokensInfo = useTokensInfo(rewardsPositions.map((position) => position.tokens[0]?.tokenId))
  const tokens = useMemo(
    () => rewardsPositions.flatMap((position) => position.tokens),
    [rewardsPositions]
  )

  return { tokens, tokensInfo }
}

function useWithdrawAmountInDepositToken(params: Props['route']['params']) {
  const depositToken = useTokenInfo(params.pool.dataProps.depositTokenId)
  const withdrawToken = useTokenInfo(params.pool.dataProps.withdrawTokenId)
  const tokenAmount = useMemo(() => {
    return params.mode === 'withdraw'
      ? new BigNumber(params.inputTokenAmount)
      : getEarnPositionBalanceValues({ pool: params.pool }).poolBalanceInDepositToken
  }, [params])

  const localAmount = useTokenToLocalAmount(tokenAmount, depositToken?.tokenId)
  return { tokenAmount, localAmount, depositToken, withdrawToken }
}

export default function EarnWithdrawConfirmationScreen({ route: { params } }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const providerUrl = params.pool.dataProps.manageUrl ?? params.pool.dataProps.termsUrl
  const usdToLocalRate = useSelector(usdToLocalCurrencyRateSelector)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const rewards = useRewards(params)
  const withdraw = useWithdrawAmountInDepositToken(params)

  if (!withdraw.depositToken || !withdraw.withdrawToken) {
    // should never happen
    Logger.error(TAG, 'there is neither deposit nor withdraw token available')
    return null
  }

  function onPressProvider() {
    if (withdraw.withdrawToken) {
      AppAnalytics.track(EarnEvents.earn_withdraw_provider_info_press, {
        depositTokenId: params.pool.dataProps.depositTokenId,
        tokenAmount: withdraw.tokenAmount.toString(),
        networkId: withdraw.withdrawToken.networkId,
        providerId: params.pool.appId,
        poolId: params.pool.positionId,
        rewards: rewards.tokens.map((token) => ({
          amount: token.balance.toString(),
          tokenId: token.tokenId,
        })),
        mode: params.mode,
      })
    }

    if (providerUrl) {
      dispatch(openUrl(providerUrl, true))
    }
  }

  return (
    <ReviewTransaction title={t('earnFlow.withdrawConfirmation.title')}>
      <ReviewContent>
        <ReviewSummary>
          {(params.mode === 'withdraw' || params.mode === 'exit') && (
            <ReviewSummaryItem
              testID="EarnWithdrawConfirmation/Withdraw"
              label={t('earnFlow.withdrawConfirmation.withdrawing')}
              icon={<TokenIcon token={withdraw.depositToken} />}
              primaryValue={t('tokenAmount', {
                tokenAmount: formatValueToDisplay(withdraw.tokenAmount),
                tokenSymbol: withdraw.depositToken.symbol,
              })}
              secondaryValue={t('localAmount', {
                context: withdraw.localAmount ? undefined : 'noFiatPrice',
                localAmount: withdraw.localAmount ? formatValueToDisplay(withdraw.localAmount) : '',
                localCurrencySymbol,
              })}
            />
          )}

          {(params.mode === 'claim-rewards' ||
            params.mode === 'exit' ||
            params.pool.dataProps.withdrawalIncludesClaim) &&
            rewards.tokens.map((rewardToken, idx) => {
              const tokenAmount = new BigNumber(rewardToken.balance)
              const tokenInfo = rewards.tokensInfo.find(
                (token) => token?.tokenId === rewardToken.tokenId
              )
              const localAmount = convertTokenToLocalAmount({
                tokenAmount,
                tokenInfo,
                usdToLocalRate,
              })
              return (
                <ReviewSummaryItem
                  key={idx}
                  testID={`EarnWithdrawConfirmation/RewardClaim-${idx}`}
                  label={t('earnFlow.withdrawConfirmation.rewardClaiming')}
                  icon={<TokenIcon token={rewardToken} />}
                  primaryValue={t('tokenAmount', {
                    tokenAmount: formatValueToDisplay(tokenAmount),
                    tokenSymbol: tokenInfo?.symbol,
                  })}
                  secondaryValue={t('localAmount', {
                    context: localAmount ? undefined : 'noFiatPrice',
                    localAmount: localAmount ? formatValueToDisplay(localAmount) : '',
                    localCurrencySymbol,
                  })}
                />
              )
            })}

          <ReviewSummaryItem
            testID="EarnWithdrawConfirmation/Pool"
            label={t('from')}
            onPress={providerUrl ? onPressProvider : undefined}
            icon={<TokenIcon token={params.pool.displayProps} />}
            primaryValue={t('earnFlow.withdrawConfirmation.pool', {
              providerName: params.pool.appName,
            })}
            secondaryValue={t('earnFlow.withdrawConfirmation.yieldRate', {
              apy: getTotalYieldRate(params.pool).toFixed(2),
            })}
          />
        </ReviewSummary>
      </ReviewContent>
    </ReviewTransaction>
  )
}
