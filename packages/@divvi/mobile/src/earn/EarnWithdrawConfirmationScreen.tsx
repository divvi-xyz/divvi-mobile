import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import { groupBy } from 'lodash'
import React, { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes } from 'src/components/Button'
import FeeInfoBottomSheet from 'src/components/FeeInfoBottomSheet'
import InfoBottomSheet, { InfoBottomSheetContentBlock } from 'src/components/InfoBottomSheet'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import {
  buildAmounts,
  ReviewContent,
  ReviewDetails,
  ReviewDetailsItem,
  ReviewFooter,
  ReviewSummary,
  ReviewSummaryItem,
  ReviewTransaction,
} from 'src/components/ReviewTransaction'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon from 'src/components/TokenIcon'
import { useNetworkFee, usePrepareEarnConfirmationScreenTransactions } from 'src/earn/hooks'
import { withdrawStatusSelector } from 'src/earn/selectors'
import { withdrawStart } from 'src/earn/slice'
import {
  getEarnPositionBalanceValues,
  getTotalYieldRate,
  isGasSubsidizedForNetwork,
} from 'src/earn/utils'
import { CICOFlow } from 'src/fiatExchanges/types'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol, usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import { hooksApiUrlSelector, positionsWithBalanceSelector } from 'src/positions/selectors'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { NETWORK_NAMES } from 'src/shared/conts'
import themeColors from 'src/styles/colors'
import { useTokenInfo, useTokensInfo, useTokenToLocalAmount } from 'src/tokens/hooks'
import { feeCurrenciesSelector } from 'src/tokens/selectors'
import type { TokenBalance } from 'src/tokens/slice'
import { convertTokenToLocalAmount } from 'src/tokens/utils'
import Logger from 'src/utils/Logger'
import { getSerializablePreparedTransactions } from 'src/viem/preparedTransactionSerialization'
import { walletAddressSelector } from 'src/web3/selectors'
import { isAddress, type Address } from 'viem'

const TAG = 'earn/EarnWithdrawConfirmationScreen'

type Props = NativeStackScreenProps<StackParamList, Screens.EarnWithdrawConfirmationScreen>

type Amount = {
  tokenInfo: TokenBalance
  tokenAmount: BigNumber
  localAmount: BigNumber | null
}

function getTotalWithdrawAmountsPerToken(
  rewardTokens: Amount[],
  withdraw: ReturnType<typeof useWithdrawAmountInDepositToken>
) {
  if (!withdraw.depositToken) {
    Logger.error(TAG, 'depositToken is not available')
    return []
  }

  const allTokens = [
    ...rewardTokens,
    {
      tokenInfo: withdraw.depositToken,
      tokenAmount: withdraw.tokenAmount,
      localAmount: withdraw.localAmount,
    },
  ]
  const groupedTokens = groupBy(allTokens, (token) => token.tokenInfo.tokenId)
  const summedTokens: Record<string, Amount> = {}

  for (const [tokenId, amounts] of Object.entries(groupedTokens)) {
    summedTokens[tokenId] = {
      tokenInfo: amounts[0].tokenInfo,
      tokenAmount: amounts.reduce((acc, token) => acc.plus(token.tokenAmount), new BigNumber(0)),
      localAmount: amounts.reduce<Amount['localAmount']>(
        (acc, token) => (acc && token.localAmount ? acc.plus(token.localAmount) : null),
        new BigNumber(0)
      ),
    }
  }

  const sortedTokens = Object.values(summedTokens).sort((token) =>
    withdraw.depositToken && token.tokenInfo.tokenId === withdraw.depositToken.tokenId ? -1 : 0
  )

  return sortedTokens
}

function useRewards(params: Props['route']['params']) {
  const { rewardsPositionIds } = params.pool.dataProps
  const usdToLocalRate = useSelector(usdToLocalCurrencyRateSelector)
  const positions = useSelector(positionsWithBalanceSelector).filter((position) =>
    rewardsPositionIds?.includes(position.positionId)
  )
  const tokensInfo = useTokensInfo(positions.map((position) => position.tokens[0]?.tokenId))
  const flattenedPositionTokens = positions.flatMap((position) => position.tokens)
  const tokens = flattenedPositionTokens
    .map((token) => {
      const tokenAmount = new BigNumber(token.balance)
      const tokenInfo = tokensInfo.find((info) => info?.tokenId === token.tokenId)
      const localAmount = convertTokenToLocalAmount({
        tokenAmount,
        tokenInfo,
        usdToLocalRate,
      })
      return { tokenAmount, tokenInfo, localAmount, balance: token.balance }
    })
    .filter((token): token is Amount & { balance: string } => !!token.tokenInfo)

  return { tokens, tokensInfo, positions, flattenedPositionTokens }
}

function useWithdrawAmountInDepositToken(params: Props['route']['params']) {
  const depositToken = useTokenInfo(params.pool.dataProps.depositTokenId)
  const withdrawToken = useTokenInfo(params.pool.dataProps.withdrawTokenId)
  const tokenAmount = useMemo(
    () =>
      params.mode === 'withdraw'
        ? new BigNumber(params.inputTokenAmount)
        : getEarnPositionBalanceValues({ pool: params.pool }).poolBalanceInDepositToken,
    [params]
  )

  const localAmount = useTokenToLocalAmount(tokenAmount, depositToken?.tokenId)
  return { tokenAmount, localAmount, depositToken, withdrawToken }
}

export default function EarnWithdrawConfirmationScreen({ route: { params } }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const providerUrl = params.pool.dataProps.manageUrl ?? params.pool.dataProps.termsUrl
  const feeBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const totalBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const rewards = useRewards(params)
  const withdraw = useWithdrawAmountInDepositToken(params)
  const totalWithdrawAmountsPerToken = getTotalWithdrawAmountsPerToken(rewards.tokens, withdraw)
  const withdrawStatus = useSelector(withdrawStatusSelector)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const hooksApiUrl = useSelector(hooksApiUrlSelector)
  const walletAddress = (useSelector(walletAddressSelector) || '') as Address
  const feeCurrencies = useSelector((state) =>
    feeCurrenciesSelector(state, withdraw.depositToken?.networkId)
  )

  const isGasSubsidized = withdraw.depositToken
    ? isGasSubsidizedForNetwork(withdraw.depositToken.networkId)
    : false

  const preparedTransaction = usePrepareEarnConfirmationScreenTransactions(params.mode, {
    amount: withdraw.tokenAmount.dividedBy(params.pool.pricePerShare[0]).toString(),
    pool: params.pool,
    walletAddress,
    feeCurrencies,
    hooksApiUrl,
    rewardsPositions: rewards.positions,
    useMax: params.mode !== 'withdraw' || params.useMax,
  })
  const networkFee = useNetworkFee(preparedTransaction.result)

  function onPressProvider() {
    if (withdraw.withdrawToken) {
      AppAnalytics.track(EarnEvents.earn_withdraw_provider_info_press, {
        depositTokenId: params.pool.dataProps.depositTokenId,
        tokenAmount: withdraw.tokenAmount.toString(),
        networkId: withdraw.withdrawToken.networkId,
        providerId: params.pool.appId,
        poolId: params.pool.positionId,
        mode: params.mode,
        rewards: rewards.flattenedPositionTokens.map((token) => ({
          amount: token.balance.toString(),
          tokenId: token.tokenId,
        })),
      })
    }

    if (providerUrl) {
      dispatch(openUrl(providerUrl, true))
    }
  }

  function onPress() {
    if (preparedTransaction.result?.type !== 'possible') {
      // should never happen because button is disabled if withdraw is not possible
      throw new Error('Cannot be called without possible prepared transactions')
    }

    dispatch(
      withdrawStart({
        preparedTransactions: getSerializablePreparedTransactions(
          preparedTransaction.result.transactions
        ),
        rewardsTokens: rewards.flattenedPositionTokens,
        pool: params.pool,
        mode: params.mode,
        ...(params.mode !== 'claim-rewards' && { amount: withdraw.tokenAmount.toString() }),
      })
    )

    if (withdraw.withdrawToken) {
      AppAnalytics.track(EarnEvents.earn_collect_earnings_press, {
        depositTokenId: params.pool.dataProps.depositTokenId,
        tokenAmount: withdraw.tokenAmount.toString(),
        networkId: withdraw.withdrawToken.networkId,
        providerId: params.pool.appId,
        poolId: params.pool.positionId,
        rewards: rewards.flattenedPositionTokens.map((token) => ({
          amount: token.balance.toString(),
          tokenId: token.tokenId,
        })),
        mode: params.mode,
      })
    }
  }

  const ctaDisabled =
    preparedTransaction.loading ||
    preparedTransaction.error ||
    preparedTransaction.result?.type !== 'possible' ||
    withdrawStatus === 'loading'

  if (!withdraw.depositToken || !withdraw.withdrawToken) {
    // should never happen
    Logger.error(TAG, 'There is neither deposit nor withdraw token available')
    return null
  }

  if (!walletAddress || !isAddress(walletAddress)) {
    // should never happen
    Logger.error(TAG, 'Wallet address is not valid')
    return null
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
            rewards.tokens.map((rewardToken, idx) => (
              <ReviewSummaryItem
                key={idx}
                testID={`EarnWithdrawConfirmation/RewardClaim-${idx}`}
                label={t('earnFlow.withdrawConfirmation.rewardClaiming')}
                icon={<TokenIcon token={rewardToken.tokenInfo} />}
                primaryValue={t('tokenAmount', {
                  tokenAmount: formatValueToDisplay(rewardToken.tokenAmount),
                  tokenSymbol: rewardToken.tokenInfo?.symbol,
                })}
                secondaryValue={t('localAmount', {
                  context: rewardToken.localAmount ? undefined : 'noFiatPrice',
                  localAmount: rewardToken.localAmount
                    ? formatValueToDisplay(rewardToken.localAmount)
                    : '',
                  localCurrencySymbol,
                })}
              />
            ))}

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

        <ReviewDetails>
          <ReviewDetailsItem
            testID="EarnWithdrawConfirmation/Details/Network"
            type="plain-text"
            label={t('transactionDetails.network')}
            color={themeColors.contentSecondary}
            value={NETWORK_NAMES[withdraw.depositToken.networkId]}
          />

          <ReviewDetailsItem
            approx
            caption={isGasSubsidized ? t('gasSubsidized') : undefined}
            captionColor={isGasSubsidized ? themeColors.accent : undefined}
            strikeThrough={isGasSubsidized}
            testID="EarnWithdrawConfirmation/Details/NetworkFee"
            type="token-amount"
            label={t('networkFee')}
            isLoading={preparedTransaction.loading}
            color={themeColors.contentSecondary}
            tokenAmount={networkFee?.amount}
            localAmount={networkFee?.localAmount}
            tokenInfo={networkFee?.token}
            localCurrencySymbol={localCurrencySymbol}
            onInfoPress={() => feeBottomSheetRef.current?.snapToIndex(0)}
          />

          <ReviewDetailsItem
            approx
            testID="EarnWithdrawConfirmation/Details/Total"
            type="total-token-amount"
            label={t('reviewTransaction.totalLessFees')}
            localCurrencySymbol={localCurrencySymbol}
            isLoading={preparedTransaction.loading}
            onInfoPress={() => totalBottomSheetRef.current?.snapToIndex(0)}
            amounts={buildAmounts([
              params.mode !== 'claim-rewards' && {
                tokenInfo: withdraw.depositToken,
                tokenAmount: withdraw.tokenAmount,
                localAmount: withdraw.localAmount,
              },
              {
                isDeductible: true,
                tokenInfo: networkFee?.token,
                tokenAmount: networkFee?.amount,
                localAmount: networkFee?.localAmount,
              },
              ...rewards.tokens,
            ])}
          />
        </ReviewDetails>
      </ReviewContent>

      <ReviewFooter>
        {preparedTransaction.error && (
          <InLineNotification
            testID="EarnWithdrawConfirmation/PrepareError"
            variant={NotificationVariant.Error}
            title={t('earnFlow.collect.errorTitle')}
            description={t('earnFlow.collect.errorDescription')}
          />
        )}
        {preparedTransaction.result?.type === 'not-enough-balance-for-gas' && (
          <InLineNotification
            variant={NotificationVariant.Warning}
            testID="EarnWithdrawConfirmation/NoGasWarning"
            title={t('earnFlow.collect.noGasTitle', { symbol: feeCurrencies[0].symbol })}
            description={t('earnFlow.collect.noGasDescription', {
              symbol: feeCurrencies[0].symbol,
              network: NETWORK_NAMES[withdraw.depositToken.networkId],
            })}
            ctaLabel={t('earnFlow.collect.noGasCta', {
              symbol: feeCurrencies[0].symbol,
              network: NETWORK_NAMES[withdraw.depositToken.networkId],
            })}
            onPressCta={() => {
              AppAnalytics.track(EarnEvents.earn_withdraw_add_gas_press, {
                gasTokenId: feeCurrencies[0].tokenId,
                depositTokenId: params.pool.dataProps.depositTokenId,
                networkId: params.pool.networkId,
                providerId: params.pool.appId,
                poolId: params.pool.positionId,
              })
              navigate(Screens.FiatExchangeAmount, {
                tokenId: feeCurrencies[0].tokenId,
                flow: CICOFlow.CashIn,
                tokenSymbol: feeCurrencies[0].symbol,
              })
            }}
          />
        )}

        <Button
          size={BtnSizes.FULL}
          text={
            params.mode === 'withdraw'
              ? t('earnFlow.collect.ctaWithdraw')
              : params.mode === 'exit'
                ? t('earnFlow.collect.ctaExit')
                : t('earnFlow.collect.ctaReward')
          }
          onPress={onPress}
          testID="EarnWithdrawConfirmation/ConfirmButton"
          disabled={!!ctaDisabled}
          showLoading={withdrawStatus === 'loading'}
        />
      </ReviewFooter>

      <FeeInfoBottomSheet forwardedRef={feeBottomSheetRef} networkFee={networkFee} />

      <InfoBottomSheet
        forwardedRef={totalBottomSheetRef}
        title={t('reviewTransaction.totalLessFees')}
        testID="TotalInfoBottomSheet"
      >
        <InfoBottomSheetContentBlock>
          <View>
            {totalWithdrawAmountsPerToken.map((token, idx) => (
              <ReviewDetailsItem
                key={token.tokenInfo.tokenId}
                fontSize="small"
                type="token-amount"
                testID={`TotalInfoBottomSheet/Withdrawing-${idx}`}
                label={idx === 0 ? t('earnFlow.withdrawConfirmation.withdrawing') : ''}
                localCurrencySymbol={localCurrencySymbol}
                {...token}
              />
            ))}
          </View>

          {networkFee && (
            <ReviewDetailsItem
              approx
              fontSize="small"
              type="token-amount"
              testID="TotalInfoBottomSheet/Fees"
              label={t('fees')}
              caption={isGasSubsidized ? t('gasSubsidized') : undefined}
              captionColor={isGasSubsidized ? themeColors.accent : undefined}
              strikeThrough={isGasSubsidized}
              tokenAmount={networkFee.amount}
              localAmount={networkFee.localAmount}
              tokenInfo={networkFee.token}
              localCurrencySymbol={localCurrencySymbol}
            />
          )}

          <ReviewDetailsItem
            approx
            fontSize="small"
            type="total-token-amount"
            testID="TotalInfoBottomSheet/Total"
            label={t('reviewTransaction.totalLessFees')}
            localCurrencySymbol={localCurrencySymbol}
            amounts={buildAmounts([
              params.mode !== 'claim-rewards' && {
                tokenInfo: withdraw.depositToken,
                tokenAmount: withdraw.tokenAmount,
                localAmount: withdraw.localAmount,
              },
              {
                isDeductible: true,
                tokenInfo: networkFee?.token,
                tokenAmount: networkFee?.amount,
                localAmount: networkFee?.localAmount,
              },
              ...rewards.tokens,
            ])}
          />
        </InfoBottomSheetContentBlock>
      </InfoBottomSheet>
    </ReviewTransaction>
  )
}
