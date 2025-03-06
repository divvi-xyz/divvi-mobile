import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useMemo, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import BackButton from 'src/components/BackButton'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes } from 'src/components/Button'
import FeeInfoBottomSheet from 'src/components/FeeInfoBottomSheet'
import InfoBottomSheet, {
  InfoBottomSheetContentBlock,
  InfoBottomSheetHeading,
  InfoBottomSheetParagraph,
} from 'src/components/InfoBottomSheet'
import {
  ReviewContent,
  ReviewDetails,
  ReviewDetailsItem,
  ReviewFooter,
  ReviewParagraph,
  ReviewSummary,
  ReviewSummaryItem,
  ReviewTransaction,
} from 'src/components/ReviewTransaction'
import RowDivider from 'src/components/RowDivider'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon, { IconSize, IconSizeToStyle } from 'src/components/TokenIcon'
import Touchable from 'src/components/Touchable'
import { APP_NAME } from 'src/config'
import { depositTransactionSubmittedSelector } from 'src/earn/selectors'
import { depositStart } from 'src/earn/slice'
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
import { default as Colors, default as themeColors } from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import getCrossChainFee from 'src/swap/getCrossChainFee'
import type { AppFeeAmount, SwapFeeAmount } from 'src/swap/types'
import { useTokenInfo, useTokenToLocalAmount } from 'src/tokens/hooks'
import { feeCurrenciesSelector } from 'src/tokens/selectors'
import type { TokenBalance } from 'src/tokens/slice'
import Logger from 'src/utils/Logger'
import { getFeeCurrencyAndAmounts } from 'src/viem/prepareTransactions'
import { getSerializablePreparedTransactions } from 'src/viem/preparedTransactionSerialization'

const TAG = 'send/EarnDepositConfirmationScreen'
const APP_TERMS_AND_CONDITIONS_URL = 'https://valora.xyz/terms'
const APP_ID_TO_PROVIDER_DOCUMENTS_URL: Record<string, string | undefined> = {
  beefy: 'https://docs.beefy.finance/',
}

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
  const { pool, preparedTransaction, inputTokenAmount, swapTransaction, inputTokenInfo, mode } =
    params
  return {
    providerId: pool.appId,
    depositTokenId: pool.dataProps.depositTokenId,
    depositTokenAmount: depositAmount.toString(),
    fromTokenId: inputTokenInfo.tokenId,
    fromTokenAmount: inputTokenAmount.toString(),
    fromNetworkId: preparedTransaction.feeCurrency.networkId,
    networkId: pool.networkId,
    poolId: pool.positionId,
    mode,
    swapType: swapTransaction?.swapType,
  }
}

export default function EarnDepositConfirmationScreen({ route: { params } }: Props) {
  const { preparedTransaction, inputTokenAmount, inputTokenInfo, mode, pool, swapTransaction } =
    params
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const transactionSubmitted = useSelector(depositTransactionSubmittedSelector)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const localInputAmount = useTokenToLocalAmount(inputTokenAmount, inputTokenInfo.tokenId)
  const depositAmount = useDepositAmount(params)
  const commonAnalyticsProperties = useCommonAnalyticsProperties(params, depositAmount.tokenAmount)

  const feeBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const totalBottomSheetRef = useRef<BottomSheetModalRefType>(null)

  const networkFee = useNetworkFee(params)
  const swapAppFee = useSwapAppFee(params)
  const crossChainFee = useCrossChainFee(params)

  if (!networkFee.token || !networkFee.amount.gt(0)) {
    // should never happen since a possible prepared tx should include fee currency and amount
    return null
  }

  const isGasSubsidized = isGasSubsidizedForNetwork(preparedTransaction.feeCurrency.networkId)
  const { termsUrl } = pool.dataProps

  function onPressProvider() {
    AppAnalytics.track(EarnEvents.earn_deposit_provider_info_press, commonAnalyticsProperties)
    termsUrl && dispatch(openUrl(termsUrl, true))
  }

  function onPressTermsAndConditions() {
    AppAnalytics.track(EarnEvents.earn_deposit_terms_and_conditions_press, {
      type: 'providerTermsAndConditions',
      ...commonAnalyticsProperties,
    })
    termsUrl && dispatch(openUrl(termsUrl, true))
  }

  function onPressProviderDocuments() {
    AppAnalytics.track(EarnEvents.earn_deposit_terms_and_conditions_press, {
      type: 'providerDocuments',
      ...commonAnalyticsProperties,
    })
    const providerDocumentsUrl = APP_ID_TO_PROVIDER_DOCUMENTS_URL[pool.appId]
    providerDocumentsUrl && dispatch(openUrl(providerDocumentsUrl, true))
  }

  function onPressAppTermsAndConditions() {
    AppAnalytics.track(EarnEvents.earn_deposit_terms_and_conditions_press, {
      type: 'appTermsAndConditions',
      ...commonAnalyticsProperties,
    })
    dispatch(openUrl(APP_TERMS_AND_CONDITIONS_URL, true))
  }

  function onPressComplete() {
    dispatch(
      depositStart({
        amount: depositAmount.tokenAmount.toString(),
        pool,
        preparedTransactions: getSerializablePreparedTransactions(preparedTransaction.transactions),
        mode,
        fromTokenId: inputTokenInfo.tokenId,
        fromTokenAmount: inputTokenAmount.toString(),
      })
    )
    AppAnalytics.track(EarnEvents.earn_deposit_complete, commonAnalyticsProperties)
  }

  // Should never happen
  if (!inputTokenInfo) {
    Logger.error(TAG, `tokenInfo is missing`)
    return null
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
            icon={<TokenIcon token={inputTokenInfo!} />}
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
            icon={
              <FastImage
                source={{ uri: pool.displayProps.imageUrl }}
                style={[
                  {
                    position: 'relative',
                    top: 0,
                    left: 0,
                    width: IconSizeToStyle[IconSize.MEDIUM].tokenImageSize,
                    height: IconSizeToStyle[IconSize.MEDIUM].tokenImageSize,
                    borderRadius: IconSizeToStyle[IconSize.MEDIUM].tokenImageSize / 2,
                  },
                ]}
              />
            }
            primaryValue={t('earnFlow.depositConfirmation.pool', { providerName: pool.appName })}
            secondaryValue={t('earnFlow.depositConfirmation.yieldRate', {
              apy: getTotalYieldRate(pool).toFixed(2),
            })}
          />

          <SwapAndDepositSummaryItem
            mode={mode}
            inputTokenAmount={inputTokenAmount}
            localTokenAmount={localInputAmount}
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
            color={Colors.contentSecondary}
            value={NETWORK_NAMES[inputTokenInfo.networkId]}
          />

          <ReviewDetailsItem
            approx
            caption={isGasSubsidized ? t('gasSubsidized') : undefined}
            captionColor={isGasSubsidized ? themeColors.accent : undefined}
            strikeThrough={true}
            testID="EarnDepositConfirmationFee"
            type="token-amount"
            label={!!(swapAppFee || crossChainFee) ? t('fees') : t('networkFee')}
            color={Colors.contentSecondary}
            tokenAmount={networkFee.amount}
            localAmount={networkFee.localAmount}
            tokenInfo={networkFee.token}
            localCurrencySymbol={localCurrencySymbol}
            onInfoPress={() => feeBottomSheetRef.current?.snapToIndex(0)}
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
            onInfoPress={() => totalBottomSheetRef.current?.snapToIndex(0)}
          />
        </ReviewDetails>
      </ReviewContent>

      <ReviewFooter>
        <ReviewParagraph>
          {termsUrl ? (
            <Trans
              i18nKey="earnFlow.depositConfirmation.disclaimer"
              tOptions={{ providerName: pool.appName }}
            >
              <Text
                testID="EarnDepositConfirmation/TermsAndConditions"
                style={{ textDecorationLine: 'underline' }}
                onPress={onPressTermsAndConditions}
              />
            </Trans>
          ) : (
            <Trans
              i18nKey="earnFlow.depositConfirmation.noTermsUrlDisclaimer"
              tOptions={{ appName: APP_NAME, providerName: pool.appName }}
            >
              <Text
                testID="EarnDepositConfirmation/ProviderDocuments"
                style={{ textDecorationLine: 'underline' }}
                onPress={onPressProviderDocuments}
              />
              <Text
                testID="EarnDepositConfirmation/AppTermsAndConditions"
                style={{ textDecorationLine: 'underline' }}
                onPress={onPressAppTermsAndConditions}
              />
            </Trans>
          )}
        </ReviewParagraph>
        <Button
          testID="EarnDepositConfirmation/ConfirmButton"
          size={BtnSizes.FULL}
          text={t('deposit')}
          accessibilityLabel={t('deposit')}
          showLoading={transactionSubmitted}
          onPress={onPressComplete}
          disabled={transactionSubmitted}
        />
      </ReviewFooter>

      <FeeInfoBottomSheet
        forwardedRef={feeBottomSheetRef}
        networkFee={networkFee}
        appFee={swapAppFee}
        crossChainFee={crossChainFee}
        footerDisclaimer={
          <Trans
            i18nKey="earnFlow.depositConfirmation.description"
            context={
              swapAppFee
                ? crossChainFee
                  ? 'depositCrossChainWithSwapFee'
                  : 'depositSwapFee'
                : crossChainFee
                  ? 'depositCrossChain'
                  : 'deposit'
            }
            tOptions={{ appFeePercentage: swapTransaction?.appFeePercentageIncludedInPrice }}
          />
        }
      />

      <InfoBottomSheet
        forwardedRef={totalBottomSheetRef}
        title={t('reviewTransaction.totalPlusFees')}
      >
        <InfoBottomSheetContentBlock>
          <ReviewDetailsItem
            fontSize="small"
            type="token-amount"
            label={t('earnFlow.depositConfirmation.depositing')}
            tokenAmount={depositAmount.tokenAmount}
            localAmount={depositAmount.localAmount}
            tokenInfo={inputTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            approx
            fontSize="small"
            type="token-amount"
            label={t('fees')}
            tokenAmount={networkFee.amount}
            localAmount={networkFee.localAmount}
            tokenInfo={networkFee.token}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            approx
            fontSize="small"
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
        </InfoBottomSheetContentBlock>
      </InfoBottomSheet>
    </ReviewTransaction>
  )
}

function SwapAndDepositSummaryItem(
  props: {
    localTokenAmount: BigNumber | undefined | null
    tokenDepositAmount: BigNumber
    localDepositAmount: BigNumber | undefined | null
    depositTokenInfo: TokenBalance | undefined
  } & Pick<Props['route']['params'], 'mode' | 'inputTokenAmount' | 'inputTokenInfo'>
) {
  const { t } = useTranslation()
  const bottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD

  if (props.mode !== 'swap-deposit') {
    return null
  }

  return (
    <>
      <RowDivider spacing={null} />
      <Touchable style={styles.wrapper} onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
        <>
          <View style={styles.label}>
            <SwapAndDeposit size={20} color={Colors.contentSecondary} />
            <Text style={styles.labelText}>
              <Trans i18nKey="earnFlow.depositConfirmation.swapAndDeposit" />
            </Text>
          </View>
          <View style={styles.value}>
            <Text style={styles.valueText}>
              <Trans
                i18nKey="tokenIntoTokenAmount"
                tOptions={{
                  tokenAmountFrom: formatValueToDisplay(props.inputTokenAmount),
                  tokenSymbolFrom: props.inputTokenInfo.symbol,
                  tokenAmountTo: formatValueToDisplay(props.tokenDepositAmount),
                  tokenSymbolTo: props.depositTokenInfo?.symbol,
                }}
              />
            </Text>
            <InfoIcon size={14} color={Colors.contentSecondary} />
          </View>
        </>
      </Touchable>

      <InfoBottomSheet
        title={t('earnFlow.enterAmount.swapBottomSheet.swapDetails')}
        forwardedRef={bottomSheetRef}
      >
        <InfoBottomSheetContentBlock>
          <ReviewDetailsItem
            testID="EarnDepositConfirmation/SwapFrom"
            fontSize="small"
            type="token-amount"
            label={t('earnFlow.enterAmount.swapBottomSheet.swapFrom')}
            tokenAmount={props.inputTokenAmount}
            localAmount={props.localTokenAmount}
            tokenInfo={props.inputTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            testID="EarnDepositConfirmation/SwapTo"
            fontSize="small"
            type="token-amount"
            label={t('earnFlow.enterAmount.swapBottomSheet.swapTo')}
            tokenAmount={props.tokenDepositAmount}
            localAmount={props.localDepositAmount}
            tokenInfo={props.depositTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        </InfoBottomSheetContentBlock>

        <InfoBottomSheetContentBlock>
          <InfoBottomSheetHeading>
            <Trans i18nKey="earnFlow.enterAmount.swapBottomSheet.whySwap" />
          </InfoBottomSheetHeading>

          <InfoBottomSheetParagraph>
            <Trans i18nKey="earnFlow.enterAmount.swapBottomSheet.swapDescription" />
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
    color: Colors.contentSecondary,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Smallest8,
  },
  valueText: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
})
