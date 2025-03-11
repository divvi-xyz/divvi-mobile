import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useMemo, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import BackButton from 'src/components/BackButton'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import InfoBottomSheet, {
  InfoBottomSheetContentBlock,
  InfoBottomSheetHeading,
  InfoBottomSheetParagraph,
} from 'src/components/InfoBottomSheet'
import {
  ReviewContent,
  ReviewDetails,
  ReviewDetailsItem,
  ReviewSummary,
  ReviewSummaryItem,
  ReviewTransaction,
} from 'src/components/ReviewTransaction'
import RowDivider from 'src/components/RowDivider'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon from 'src/components/TokenIcon'
import Touchable from 'src/components/Touchable'
import {
  getSwapToAmountInDecimals,
  getTotalYieldRate,
  isGasSubsidizedForNetwork,
} from 'src/earn/utils'
import InfoIcon from 'src/icons/InfoIcon'
import SwapAndDeposit from 'src/icons/SwapAndDeposit'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import type { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { NETWORK_NAMES } from 'src/shared/conts'
import themeColors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import getCrossChainFee from 'src/swap/getCrossChainFee'
import type { AppFeeAmount, SwapFeeAmount } from 'src/swap/types'
import { useTokenInfo, useTokenToLocalAmount } from 'src/tokens/hooks'
import { feeCurrenciesSelector } from 'src/tokens/selectors'
import type { TokenBalance } from 'src/tokens/slice'
import { getFeeCurrencyAndAmounts } from 'src/viem/prepareTransactions'

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

export function useNetworkFee(
  params: Props['route']['params']
): SwapFeeAmount & { localAmount: BigNumber } {
  const { preparedTransaction } = params
  const networkFee = getFeeCurrencyAndAmounts(preparedTransaction)
  const estimatedNetworkFee = networkFee.estimatedFeeAmount ?? new BigNumber(0)
  const localAmount = useTokenToLocalAmount(estimatedNetworkFee, networkFee.feeCurrency?.tokenId)
  return {
    amount: estimatedNetworkFee,
    maxAmount: networkFee.maxFeeAmount ?? new BigNumber(0),
    token: networkFee.feeCurrency,
    localAmount: localAmount ?? new BigNumber(0),
  }
}

export function useSwapAppFee(params: Props['route']['params']) {
  const { swapTransaction, inputTokenInfo, inputTokenAmount } = params

  return useMemo((): AppFeeAmount | undefined => {
    if (!swapTransaction || !swapTransaction.appFeePercentageIncludedInPrice) {
      return undefined
    }

    const percentage = new BigNumber(swapTransaction.appFeePercentageIncludedInPrice)
    return {
      percentage,
      token: inputTokenInfo,
      amount: inputTokenAmount.multipliedBy(percentage.shiftedBy(-2)), // To convert from percentage to decimal
    }
  }, [swapTransaction, inputTokenInfo])
}

export function useCrossChainFee(params: Props['route']['params']) {
  const { swapTransaction, inputTokenInfo, preparedTransaction } = params
  const crossChainFeeCurrency = useSelector((state) =>
    feeCurrenciesSelector(state, inputTokenInfo.networkId)
  ).find((token) => token.isNative)

  return useMemo((): SwapFeeAmount | undefined => {
    if (swapTransaction?.swapType !== 'cross-chain' || !preparedTransaction) {
      return undefined
    }

    const crossChainFee = getCrossChainFee({
      feeCurrency: crossChainFeeCurrency,
      preparedTransactions: preparedTransaction,
      estimatedCrossChainFee: swapTransaction.estimatedCrossChainFee,
      maxCrossChainFee: swapTransaction.maxCrossChainFee,
      fromTokenId: inputTokenInfo.tokenId,
      sellAmount: swapTransaction.sellAmount,
    })

    if (!crossChainFee) {
      return undefined
    }

    return {
      amount: crossChainFee.amount,
      maxAmount: crossChainFee.maxAmount,
      token: crossChainFee.token,
    }
  }, [swapTransaction, preparedTransaction, crossChainFeeCurrency, inputTokenInfo])
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
  const { inputTokenInfo, pool, mode, inputTokenAmount, preparedTransaction } = params
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const depositAmount = useDepositAmount(params)
  const commonAnalyticsProperties = useCommonAnalyticsProperties(params, depositAmount.tokenAmount)
  const providerUrl = pool.dataProps.manageUrl ?? pool.dataProps.termsUrl
  const isGasSubsidized = isGasSubsidizedForNetwork(preparedTransaction.feeCurrency.networkId)
  const networkFee = useNetworkFee(params)
  const swapAppFee = useSwapAppFee(params)
  const crossChainFee = useCrossChainFee(params)

  function onPressProvider() {
    AppAnalytics.track(EarnEvents.earn_deposit_provider_info_press, commonAnalyticsProperties)
    providerUrl && dispatch(openUrl(providerUrl, true))
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
            onPress={providerUrl ? onPressProvider : undefined}
            icon={<TokenIcon token={pool.displayProps} />}
            primaryValue={t('earnFlow.depositConfirmation.pool', { providerName: pool.appName })}
            secondaryValue={t('earnFlow.depositConfirmation.yieldRate', {
              apy: getTotalYieldRate(pool).toFixed(2),
            })}
          />

          <SwapAndDepositSummaryItem
            mode={mode}
            inputTokenAmount={inputTokenAmount}
            inputTokenInfo={inputTokenInfo}
            tokenDepositAmount={depositAmount.tokenAmount}
            localDepositAmount={depositAmount.localAmount}
            depositTokenInfo={depositAmount.tokenInfo}
          />
        </ReviewSummary>

        <ReviewDetails>
          <ReviewDetailsItem
            testID="EarnDepositConfirmationNetwork"
            type="plain-text"
            label={t('transactionDetails.network')}
            color={themeColors.contentSecondary}
            value={NETWORK_NAMES[inputTokenInfo.networkId]}
          />

          <ReviewDetailsItem
            approx
            caption={isGasSubsidized ? t('gasSubsidized') : undefined}
            captionColor={isGasSubsidized ? themeColors.accent : undefined}
            strikeThrough={isGasSubsidized}
            testID="EarnDepositConfirmationFee"
            type="token-amount"
            label={swapAppFee || crossChainFee ? t('fees') : t('networkFee')}
            color={themeColors.contentSecondary}
            tokenAmount={networkFee.amount}
            localAmount={networkFee.localAmount}
            tokenInfo={networkFee.token}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            approx
            testID="EarnDepositConfirmationTotal"
            type="total-token-amount"
            label={t('reviewTransaction.totalPlusFees')}
            tokenInfo={inputTokenInfo}
            feeTokenInfo={networkFee.token}
            tokenAmount={depositAmount.tokenAmount}
            localAmount={depositAmount.localAmount}
            feeTokenAmount={networkFee.amount}
            feeLocalAmount={networkFee.localAmount}
            localCurrencySymbol={localCurrencySymbol}
          />
        </ReviewDetails>
      </ReviewContent>
    </ReviewTransaction>
  )
}

function SwapAndDepositSummaryItem(
  props: {
    tokenDepositAmount: BigNumber
    localDepositAmount: BigNumber | undefined | null
    depositTokenInfo: TokenBalance | undefined
  } & Pick<Props['route']['params'], 'mode' | 'inputTokenAmount' | 'inputTokenInfo'>
) {
  const {
    mode,
    depositTokenInfo,
    inputTokenAmount,
    inputTokenInfo,
    localDepositAmount,
    tokenDepositAmount,
  } = props
  const { t } = useTranslation()
  const bottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const inputLocalAmount = useTokenToLocalAmount(inputTokenAmount, inputTokenInfo.tokenId)

  if (mode !== 'swap-deposit') {
    return null
  }

  return (
    <>
      <RowDivider marginVertical={null} testID="SwapAndDeposit/Divider" />
      <Touchable style={styles.wrapper} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
        <>
          <View style={styles.label} testID="SwapAndDeposit/PrimaryValue">
            <SwapAndDeposit
              size={20}
              color={themeColors.contentSecondary}
              testID="SwapAndDeposit/Icon"
            />
            <Text style={styles.labelText}>
              <Trans i18nKey="earnFlow.depositConfirmation.swapAndDeposit" />
            </Text>
          </View>
          <View style={styles.value} testID="SwapAndDeposit/SecondaryValue">
            <Text style={styles.valueText}>
              <Trans
                i18nKey="tokenIntoTokenAmount"
                tOptions={{
                  tokenAmountFrom: formatValueToDisplay(inputTokenAmount),
                  tokenSymbolFrom: inputTokenInfo.symbol,
                  tokenAmountTo: formatValueToDisplay(tokenDepositAmount),
                  tokenSymbolTo: depositTokenInfo?.symbol,
                }}
              />
            </Text>
            <InfoIcon
              size={14}
              color={themeColors.contentSecondary}
              testID="SwapAndDeposit/InfoIcon"
            />
          </View>
        </>
      </Touchable>

      <InfoBottomSheet
        title={t('earnFlow.depositConfirmation.swapAndDepositInfoSheet.title')}
        forwardedRef={bottomSheetRef}
        testID="SwapAndDepositInfoSheet"
      >
        <InfoBottomSheetContentBlock>
          <ReviewDetailsItem
            testID="SwapAndDepositInfoSheet/SwapFrom"
            fontSize="small"
            type="token-amount"
            label={t('earnFlow.depositConfirmation.swapAndDepositInfoSheet.swapFrom')}
            tokenAmount={inputTokenAmount}
            localAmount={inputLocalAmount}
            tokenInfo={inputTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            testID="SwapAndDepositInfoSheet/SwapTo"
            fontSize="small"
            type="token-amount"
            label={t('earnFlow.depositConfirmation.swapAndDepositInfoSheet.swapTo')}
            tokenAmount={tokenDepositAmount}
            localAmount={localDepositAmount}
            tokenInfo={depositTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        </InfoBottomSheetContentBlock>

        <InfoBottomSheetContentBlock testID="SwapAndDepositInfoSheet/Disclaimer">
          <InfoBottomSheetHeading>
            <Trans i18nKey="earnFlow.depositConfirmation.swapAndDepositInfoSheet.whySwap" />
          </InfoBottomSheetHeading>

          <InfoBottomSheetParagraph>
            <Trans i18nKey="earnFlow.depositConfirmation.swapAndDepositInfoSheet.swapDescription" />
          </InfoBottomSheetParagraph>
        </InfoBottomSheetContentBlock>
      </InfoBottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.Tiny4,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Tiny4,
  },
  labelText: {
    ...typeScale.labelSmall,
    color: themeColors.contentSecondary,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Smallest8,
  },
  valueText: {
    ...typeScale.bodySmall,
    color: themeColors.contentSecondary,
  },
})
