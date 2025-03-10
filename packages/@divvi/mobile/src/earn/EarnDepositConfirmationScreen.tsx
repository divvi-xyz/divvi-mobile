import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import BackButton from 'src/components/BackButton'
import {
  ReviewContent,
  ReviewSummary,
  ReviewSummaryItem,
  ReviewTransaction,
} from 'src/components/ReviewTransaction'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon from 'src/components/TokenIcon'
import { getSwapToAmountInDecimals, getTotalYieldRate } from 'src/earn/utils'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import type { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { useTokenInfo, useTokenToLocalAmount } from 'src/tokens/hooks'

type Props = NativeStackScreenProps<StackParamList, Screens.EarnDepositConfirmationScreen>

export function useDepositAmount(params: Props['route']['params']) {
  const { inputTokenAmount, mode, swapTransaction, pool } = params
  const tokenAmount =
    mode === 'swap-deposit' && swapTransaction
      ? getSwapToAmountInDecimals({ swapTransaction, fromAmount: inputTokenAmount })
      : inputTokenAmount
  const tokenInfo = useTokenInfo(pool.dataProps.depositTokenId)
  const localAmount = useTokenToLocalAmount(tokenAmount, pool.dataProps.depositTokenId)

  return {
    tokenAmount,
    localAmount,
    tokenInfo,
  }
}

export function useCommonAnalyticsProperties(
  params: Props['route']['params'],
  depositAmount: BigNumber
) {
  return useMemo(
    () => ({
      providerId: params.pool.appId,
      depositTokenId: params.pool.dataProps.depositTokenId,
      depositTokenAmount: depositAmount.toString(),
      fromTokenId: params.inputTokenInfo.tokenId,
      fromTokenAmount: params.inputTokenAmount.toString(),
      fromNetworkId: params.preparedTransaction.feeCurrency.networkId,
      networkId: params.pool.networkId,
      poolId: params.pool.positionId,
      mode: params.mode,
      swapType: params.swapTransaction?.swapType,
    }),
    [params, depositAmount.toString()]
  )
}

export default function EarnDepositConfirmationScreen({ route: { params } }: Props) {
  const { inputTokenInfo, pool } = params
  const { termsUrl } = pool.dataProps
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const depositAmount = useDepositAmount(params)
  const commonAnalyticsProperties = useCommonAnalyticsProperties(params, depositAmount.tokenAmount)

  function onPressProvider() {
    AppAnalytics.track(EarnEvents.earn_deposit_provider_info_press, commonAnalyticsProperties)
    termsUrl && dispatch(openUrl(termsUrl, true))
  }

  return (
    <ReviewTransaction
      title={t('earnFlow.depositConfirmation.title')}
      headerLeftButton={
        <BackButton
          eventName={EarnEvents.earn_deposit_cancel}
          eventProperties={commonAnalyticsProperties}
        />
      }
    >
      <ReviewContent>
        <ReviewSummary>
          <ReviewSummaryItem
            testID="EarnDepositConfirmationToken"
            label={t('earnFlow.depositConfirmation.depositing')}
            icon={<TokenIcon token={inputTokenInfo} />}
            primaryValue={t('tokenAmount', {
              tokenAmount: formatValueToDisplay(depositAmount.tokenAmount),
              tokenSymbol: depositAmount.tokenInfo?.symbol,
            })}
            secondaryValue={t('localAmount', {
              localAmount: formatValueToDisplay(depositAmount.localAmount ?? new BigNumber(0)),
              localCurrencySymbol,
              context: depositAmount.localAmount ? undefined : 'noFiatPrice',
            })}
          />

          <ReviewSummaryItem
            testID="EarnDepositConfirmationPool"
            label={t('earnFlow.depositConfirmation.into')}
            onPress={termsUrl ? onPressProvider : undefined}
            icon={<TokenIcon token={pool.displayProps} />}
            primaryValue={t('earnFlow.depositConfirmation.pool', { providerName: pool.appName })}
            secondaryValue={t('earnFlow.depositConfirmation.yieldRate', {
              apy: getTotalYieldRate(pool).toFixed(2),
            })}
          />
        </ReviewSummary>
      </ReviewContent>
    </ReviewTransaction>
  )
}
