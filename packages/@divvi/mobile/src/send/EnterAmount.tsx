import BigNumber from 'bignumber.js'
import React, { ComponentType, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, TextInput as RNTextInput, StyleSheet, Text } from 'react-native'
import { View } from 'react-native-animatable'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import BackButton from 'src/components/BackButton'
import { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes } from 'src/components/Button'
import FeeInfoBottomSheet from 'src/components/FeeInfoBottomSheet'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import KeyboardAwareScrollView from 'src/components/KeyboardAwareScrollView'
import { ReviewDetailsItem } from 'src/components/ReviewTransaction'
import TokenBottomSheet, {
  TokenBottomSheetProps,
  TokenPickerOrigin,
} from 'src/components/TokenBottomSheet'
import TokenEnterAmount, {
  FETCH_UPDATED_TRANSACTIONS_DEBOUNCE_TIME_MS,
  useEnterAmount,
} from 'src/components/TokenEnterAmount'
import CustomHeader from 'src/components/header/CustomHeader'
import { useNetworkFee } from 'src/earn/hooks'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import { useSelector } from 'src/redux/hooks'
import EnterAmountOptions from 'src/send/EnterAmountOptions'
import { AmountEnteredIn } from 'src/send/types'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import { feeCurrenciesSelector } from 'src/tokens/selectors'
import { TokenBalance } from 'src/tokens/slice'
import { PreparedTransactionsResult } from 'src/viem/prepareTransactions'

export interface ProceedArgs {
  tokenAmount: BigNumber
  localAmount: BigNumber | null
  token: TokenBalance
  amountEnteredIn: AmountEnteredIn
}

type ProceedComponentProps = Omit<ProceedArgs, 'tokenAmount'> & {
  onPressProceed(args: ProceedArgs): void
  disabled: boolean
  tokenAmount: BigNumber | null
  showLoading?: boolean
}

interface Props {
  tokens: TokenBalance[]
  defaultToken?: TokenBalance
  prepareTransactionsResult?: PreparedTransactionsResult
  prepareTransactionsLoading: boolean
  onClearPreparedTransactions(): void
  onRefreshPreparedTransactions(
    amount: BigNumber,
    token: TokenBalance,
    feeCurrencies: TokenBalance[]
  ): void
  prepareTransactionError?: Error
  tokenSelectionDisabled?: boolean
  onPressProceed(args: ProceedArgs): void
  disableProceed?: boolean
  children?: React.ReactNode
  ProceedComponent: ComponentType<ProceedComponentProps>
  disableBalanceCheck?: boolean
}

export const SendProceed = ({
  tokenAmount,
  localAmount,
  token,
  amountEnteredIn,
  disabled,
  onPressProceed,
  showLoading,
}: ProceedComponentProps) => {
  const { t } = useTranslation()
  return (
    <Button
      onPress={() =>
        tokenAmount && onPressProceed({ tokenAmount, localAmount, token, amountEnteredIn })
      }
      text={t('review')}
      style={styles.reviewButton}
      size={BtnSizes.FULL}
      disabled={disabled}
      showLoading={showLoading}
      testID="SendEnterAmount/ReviewButton"
    />
  )
}

export default function EnterAmount({
  tokens,
  defaultToken,
  prepareTransactionsLoading,
  prepareTransactionsResult,
  onClearPreparedTransactions,
  onRefreshPreparedTransactions,
  prepareTransactionError,
  tokenSelectionDisabled = false,
  onPressProceed,
  disableProceed = false,
  children,
  ProceedComponent,
  disableBalanceCheck = false,
}: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [token, setToken] = useState<TokenBalance>(() => defaultToken ?? tokens[0])
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const feeCurrencies = useSelector((state) => feeCurrenciesSelector(state, token.networkId))
  const networkFee = useNetworkFee(prepareTransactionsResult)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD

  const inputRef = useRef<RNTextInput>(null)
  const feeInfoBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const tokenBottomSheetRef = useRef<BottomSheetModalRefType>(null)

  const {
    amount,
    amountType,
    processedAmounts,
    replaceAmount,
    handleAmountInputChange,
    handleToggleAmountType,
    handleSelectPercentageAmount,
  } = useEnterAmount({
    token,
    inputRef,
    onHandleAmountInputChange: () => {
      setSelectedPercentage(null)
    },
  })

  useEffect(() => {
    onClearPreparedTransactions()

    const canRefresh =
      processedAmounts.token.bignum &&
      processedAmounts.token.bignum.gt(0) &&
      processedAmounts.token.bignum.lte(token.balance)
    if (!canRefresh) return

    const debouncedRefreshTransactions = setTimeout(() => {
      return onRefreshPreparedTransactions(processedAmounts.token.bignum!, token, feeCurrencies)
    }, FETCH_UPDATED_TRANSACTIONS_DEBOUNCE_TIME_MS)

    return () => clearTimeout(debouncedRefreshTransactions)
  }, [processedAmounts.token.bignum?.toString(), token])

  const onOpenTokenPicker = () => {
    tokenBottomSheetRef.current?.snapToIndex(0)
    AppAnalytics.track(SendEvents.token_dropdown_opened, {
      currentTokenId: token.tokenId,
      currentTokenAddress: token.address,
      currentNetworkId: token.networkId,
    })
  }

  const onSelectToken: TokenBottomSheetProps['onTokenSelected'] = (selectedToken) => {
    setToken(selectedToken)
    replaceAmount('')
    setSelectedPercentage(null)
    tokenBottomSheetRef.current?.close()

    // NOTE: analytics is already fired by the bottom sheet, don't need one here
  }

  const onSelectPercentageAmount = (percentage: number) => {
    handleSelectPercentageAmount(percentage)
    setSelectedPercentage(percentage)

    AppAnalytics.track(SendEvents.send_percentage_selected, {
      tokenId: token.tokenId,
      tokenAddress: token.address,
      networkId: token.networkId,
      percentage: percentage * 100,
      flow: 'send',
    })
  }

  const showLowerAmountError =
    processedAmounts.token.bignum &&
    !processedAmounts.token.bignum.lte(token.balance) &&
    !disableBalanceCheck
  const showMaxAmountWarning =
    !showLowerAmountError &&
    prepareTransactionsResult &&
    prepareTransactionsResult.type === 'need-decrease-spend-amount-for-gas'
  const showNotEnoughBalanceForGasWarning =
    !showLowerAmountError &&
    prepareTransactionsResult &&
    prepareTransactionsResult.type === 'not-enough-balance-for-gas'
  const transactionIsPossible =
    !showLowerAmountError &&
    prepareTransactionsResult &&
    prepareTransactionsResult.type === 'possible' &&
    prepareTransactionsResult.transactions.length > 0

  const disabled =
    disableProceed ||
    (disableBalanceCheck ? !!processedAmounts.token.bignum?.isZero() : !transactionIsPossible)

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <CustomHeader style={{ paddingHorizontal: Spacing.Thick24 }} left={<BackButton />} />
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, Spacing.Thick24) },
        ]}
        onScrollBeginDrag={() => {
          Keyboard.dismiss()
        }}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.title}>{t('sendEnterAmountScreen.title')}</Text>
          <TokenEnterAmount
            autoFocus
            testID="SendEnterAmount"
            token={token}
            inputValue={amount}
            inputRef={inputRef}
            tokenAmount={processedAmounts.token.displayAmount}
            localAmount={processedAmounts.local.displayAmount}
            onInputChange={handleAmountInputChange}
            amountType={amountType}
            toggleAmountType={handleToggleAmountType}
            onOpenTokenPicker={tokenSelectionDisabled ? undefined : onOpenTokenPicker}
          />

          {prepareTransactionsResult?.type !== 'not-enough-balance-for-gas' && !!networkFee && (
            <View style={styles.feeContainer}>
              <ReviewDetailsItem
                approx
                testID="SendEnterAmount/NetworkFee"
                type="token-amount"
                label={t('networkFee')}
                tokenAmount={networkFee.amount}
                localAmount={networkFee.localAmount}
                tokenInfo={networkFee.token}
                localCurrencySymbol={localCurrencySymbol}
                onInfoPress={() => feeInfoBottomSheetRef.current?.snapToIndex(0)}
              />

              <FeeInfoBottomSheet forwardedRef={feeInfoBottomSheetRef} networkFee={networkFee} />
            </View>
          )}
        </View>

        {showLowerAmountError && (
          <InLineNotification
            variant={NotificationVariant.Warning}
            title={t('sendEnterAmountScreen.insufficientBalanceWarning.title', {
              tokenSymbol: token.symbol,
            })}
            description={t('sendEnterAmountScreen.insufficientBalanceWarning.description', {
              tokenSymbol: token.symbol,
            })}
            style={styles.warning}
            testID="SendEnterAmount/NotEnoughBalanceWarning"
          />
        )}
        {showMaxAmountWarning && (
          <InLineNotification
            variant={NotificationVariant.Warning}
            title={t('sendEnterAmountScreen.maxAmountWarning.title')}
            description={t('sendEnterAmountScreen.maxAmountWarning.description', {
              feeTokenSymbol: prepareTransactionsResult.feeCurrency.symbol,
            })}
            style={styles.warning}
            testID="SendEnterAmount/MaxAmountWarning"
          />
        )}
        {showNotEnoughBalanceForGasWarning && (
          <InLineNotification
            variant={NotificationVariant.Warning}
            title={t('sendEnterAmountScreen.notEnoughBalanceForGasWarning.title', {
              feeTokenSymbol: prepareTransactionsResult.feeCurrencies[0].symbol,
            })}
            description={t('sendEnterAmountScreen.notEnoughBalanceForGasWarning.description', {
              feeTokenSymbol: prepareTransactionsResult.feeCurrencies[0].symbol,
            })}
            style={styles.warning}
            testID="SendEnterAmount/NotEnoughForGasWarning"
          />
        )}
        {prepareTransactionError && (
          <InLineNotification
            variant={NotificationVariant.Error}
            title={t('sendEnterAmountScreen.prepareTransactionError.title')}
            description={t('sendEnterAmountScreen.prepareTransactionError.description')}
            style={styles.warning}
            testID="SendEnterAmount/PrepareTransactionError"
          />
        )}

        {children}

        <EnterAmountOptions
          onPressAmount={onSelectPercentageAmount}
          selectedAmount={selectedPercentage}
          testID="SendEnterAmount/AmountOptions"
        />

        <ProceedComponent
          tokenAmount={processedAmounts.token.bignum}
          localAmount={processedAmounts.local.bignum}
          token={token}
          amountEnteredIn={amountType}
          onPressProceed={onPressProceed}
          disabled={disabled}
          showLoading={prepareTransactionsLoading}
        />
      </KeyboardAwareScrollView>
      <TokenBottomSheet
        forwardedRef={tokenBottomSheetRef}
        snapPoints={['90%']}
        origin={TokenPickerOrigin.Send}
        onTokenSelected={onSelectToken}
        tokens={tokens}
        title={t('sendEnterAmountScreen.selectToken')}
        titleStyle={styles.title}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.Thick24,
    paddingTop: Spacing.Thick24,
    flexGrow: 1,
  },
  title: {
    ...typeScale.titleMedium,
    marginBottom: Spacing.Thick24,
  },
  inputContainer: {
    flex: 1,
  },
  feeContainer: {
    marginVertical: Spacing.Regular16,
  },
  reviewButton: {
    paddingTop: Spacing.Thick24,
  },
  warning: {
    marginBottom: Spacing.Regular16,
    paddingHorizontal: Spacing.Regular16,
    borderRadius: 16,
  },
})
