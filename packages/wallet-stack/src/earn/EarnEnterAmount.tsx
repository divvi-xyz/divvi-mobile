import { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Keyboard, TextInput as RNTextInput, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents, SendEvents } from 'src/analytics/Events'
import BackButton from 'src/components/BackButton'
import { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes } from 'src/components/Button'
import FeeInfoBottomSheet from 'src/components/FeeInfoBottomSheet'
import GasFeeWarning from 'src/components/GasFeeWarning'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import InfoBottomSheet, {
  InfoBottomSheetContentBlock,
  InfoBottomSheetHeading,
  InfoBottomSheetParagraph,
} from 'src/components/InfoBottomSheet'
import KeyboardAwareScrollView from 'src/components/KeyboardAwareScrollView'
import { ReviewDetailsItem } from 'src/components/ReviewTransaction'
import TokenBottomSheet, {
  TokenBottomSheetProps,
  TokenPickerOrigin,
} from 'src/components/TokenBottomSheet'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenEnterAmount, {
  FETCH_UPDATED_TRANSACTIONS_DEBOUNCE_TIME_MS,
  useEnterAmount,
} from 'src/components/TokenEnterAmount'
import CustomHeader from 'src/components/header/CustomHeader'
import { useNetworkFee, usePrepareEnterAmountTransactionsCallback } from 'src/earn/hooks'
import { depositStatusSelector } from 'src/earn/selectors'
import { getSwapToAmountInDecimals, isGasSubsidizedForNetwork } from 'src/earn/utils'
import ArrowRightThick from 'src/icons/ArrowRightThick'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol, usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { hooksApiUrlSelector, positionsWithBalanceSelector } from 'src/positions/selectors'
import { EarnPosition, Position } from 'src/positions/types'
import { useSelector } from 'src/redux/hooks'
import EnterAmountOptions from 'src/send/EnterAmountOptions'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import getCrossChainFee from 'src/swap/getCrossChainFee'
import { SwapFeeAmount, SwapTransaction } from 'src/swap/types'
import {
  useSwappableTokens,
  useTokenInfo,
  useTokensInfo,
  useTokenToLocalAmount,
} from 'src/tokens/hooks'
import { feeCurrenciesSelector } from 'src/tokens/selectors'
import { TokenBalance } from 'src/tokens/slice'
import { convertTokenToLocalAmount, getSerializableTokenBalance } from 'src/tokens/utils'
import Logger from 'src/utils/Logger'
import { PreparedTransactionsResult } from 'src/viem/prepareTransactions'
import { getSerializablePreparedTransactionsPossible } from 'src/viem/preparedTransactionSerialization'
import { walletAddressSelector } from 'src/web3/selectors'
import { isAddress } from 'viem'

type Props = NativeStackScreenProps<StackParamList, Screens.EarnEnterAmount>

const TAG = 'EarnEnterAmount'

function useTokens({ pool }: { pool: EarnPosition }) {
  const depositToken = useTokenInfo(pool.dataProps.depositTokenId)
  const withdrawToken = useTokenInfo(pool.dataProps.withdrawTokenId)
  const { swappableFromTokens: swappableTokens } = useSwappableTokens()
  const allowCrossChainSwapAndDeposit = getFeatureGate(
    StatsigFeatureGates.ALLOW_CROSS_CHAIN_SWAP_AND_DEPOSIT
  )

  const eligibleSwappableTokens = useMemo(
    () =>
      swappableTokens
        .filter(
          ({ tokenId, balance, networkId }) =>
            (allowCrossChainSwapAndDeposit || networkId === pool.networkId) &&
            tokenId !== pool.dataProps.depositTokenId &&
            tokenId !== pool.dataProps.withdrawTokenId &&
            balance.gt(0)
        )
        .sort((token1, token2) => {
          // Sort pool network tokens first, otherwise by USD balance (which
          // should be the default already from the useSwappableTokens hook)
          if (token1.networkId === pool.networkId && token2.networkId !== pool.networkId) {
            return -1
          }
          if (token1.networkId !== pool.networkId && token2.networkId === pool.networkId) {
            return 1
          }
          return 0
        }),
    [
      swappableTokens,
      pool.dataProps.depositTokenId,
      pool.dataProps.withdrawTokenId,
      pool.networkId,
      allowCrossChainSwapAndDeposit,
    ]
  )

  if (!depositToken) {
    // should never happen
    throw new Error(`Token info not found for token ID ${pool.dataProps.depositTokenId}`)
  }

  if (!withdrawToken) {
    // should never happen
    throw new Error(`Token info not found for token ID ${pool.dataProps.withdrawTokenId}`)
  }

  return {
    depositToken,
    withdrawToken,
    eligibleSwappableTokens,
  }
}

export default function EarnEnterAmount({ route }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const { pool, mode = 'deposit' } = route.params
  const isWithdrawal = mode === 'withdraw'
  const { depositToken, withdrawToken, eligibleSwappableTokens } = useTokens({ pool })

  // We do not need to check withdrawal status/show a spinner for a pending
  // withdrawal, since withdrawals navigate to a separate confirmation screen.
  const depositStatus = useSelector(depositStatusSelector)
  const transactionSubmitted = depositStatus === 'loading'

  const availableInputTokens = useMemo(() => {
    switch (mode) {
      case 'deposit':
      case 'withdraw':
        return [depositToken]
      case 'swap-deposit':
      default:
        return eligibleSwappableTokens
    }
  }, [mode])

  /**
   * Use different balance for the withdrawal flow. As described in this discussion
   * (https://github.com/valora-xyz/wallet/pull/6246#discussion_r1883426564) the intent of this
   * is to abstract away the LP token from the user and just display the token they're depositing,
   * so we need to convert the LP token balance to deposit and back to LP token when transacting."
   */
  const [inputToken, setInputToken] = useState(() => ({
    ...availableInputTokens[0],
    balance: isWithdrawal
      ? withdrawToken.balance.multipliedBy(pool.pricePerShare[0])
      : availableInputTokens[0].balance,
  }))

  const inputRef = useRef<RNTextInput>(null)
  const tokenBottomSheetRef = useRef<BottomSheetModalRefType>(null)

  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const hooksApiUrl = useSelector(hooksApiUrlSelector)
  const walletAddress = useSelector(walletAddressSelector)

  const {
    prepareTransactionsResult: { prepareTransactionsResult, swapTransaction } = {},
    refreshPreparedTransactions,
    clearPreparedTransactions,
    prepareTransactionError,
    isPreparingTransactions,
  } = usePrepareEnterAmountTransactionsCallback(mode)

  const {
    amount,
    replaceAmount,
    amountType,
    processedAmounts,
    handleAmountInputChange,
    handleToggleAmountType,
    handleSelectPercentageAmount,
  } = useEnterAmount({
    token: inputToken,
    inputRef,
    onHandleAmountInputChange: () => {
      setSelectedPercentage(null)
    },
  })

  const onOpenTokenPicker = () => {
    tokenBottomSheetRef.current?.snapToIndex(0)
    AppAnalytics.track(SendEvents.token_dropdown_opened, {
      currentTokenId: inputToken.tokenId,
      currentTokenAddress: inputToken.address,
      currentNetworkId: inputToken.networkId,
    })
  }

  const onSelectToken: TokenBottomSheetProps['onTokenSelected'] = (selectedToken) => {
    // Use different balance for the withdrawal flow.
    setInputToken({
      ...selectedToken,
      balance: isWithdrawal
        ? withdrawToken.balance.multipliedBy(pool.pricePerShare[0])
        : selectedToken.balance,
    })
    replaceAmount('')
    tokenBottomSheetRef.current?.close()
    // NOTE: analytics is already fired by the bottom sheet, don't need one here
  }

  const handleRefreshPreparedTransactions = (
    amount: BigNumber,
    token: TokenBalance,
    feeCurrencies: TokenBalance[]
  ) => {
    if (!walletAddress || !isAddress(walletAddress)) {
      Logger.error(TAG, 'Wallet address not set. Cannot refresh prepared transactions.')
      return
    }

    return refreshPreparedTransactions({
      amount: amount.toString(),
      token,
      walletAddress,
      feeCurrencies,
      pool,
      hooksApiUrl,
      shortcutId: mode,
      useMax: selectedPercentage === 1,
    })
  }

  // This is for withdrawals as we want the user to be able to input the amounts in the deposit token
  const { transactionToken, transactionTokenAmount } = useMemo(() => {
    const transactionToken = isWithdrawal ? withdrawToken : inputToken
    const transactionTokenAmount = isWithdrawal
      ? processedAmounts.token.bignum &&
        processedAmounts.token.bignum.dividedBy(pool.pricePerShare[0])
      : processedAmounts.token.bignum

    return {
      transactionToken,
      transactionTokenAmount,
    }
  }, [inputToken, withdrawToken, processedAmounts.token.bignum, isWithdrawal, pool])

  const feeCurrencies = useSelector((state) =>
    feeCurrenciesSelector(state, transactionToken.networkId)
  )

  useEffect(() => {
    clearPreparedTransactions()

    if (
      !processedAmounts.token.bignum ||
      !transactionTokenAmount ||
      processedAmounts.token.bignum.isLessThanOrEqualTo(0) ||
      processedAmounts.token.bignum.isGreaterThan(inputToken.balance)
    ) {
      return
    }
    const debouncedRefreshTransactions = setTimeout(() => {
      return handleRefreshPreparedTransactions(
        transactionTokenAmount,
        transactionToken,
        feeCurrencies
      )
    }, FETCH_UPDATED_TRANSACTIONS_DEBOUNCE_TIME_MS)
    return () => clearTimeout(debouncedRefreshTransactions)
  }, [processedAmounts.token.bignum?.toString(), mode, transactionToken, inputToken, feeCurrencies])

  const showLowerAmountError =
    processedAmounts.token.bignum && processedAmounts.token.bignum.gt(inputToken.balance)
  const transactionIsPossible =
    !showLowerAmountError &&
    prepareTransactionsResult &&
    prepareTransactionsResult.type === 'possible' &&
    prepareTransactionsResult.transactions.length > 0

  const allPositionsWithBalance = useSelector(positionsWithBalanceSelector)

  const rewardsPositions = useMemo(
    () =>
      allPositionsWithBalance.filter((position) =>
        pool.dataProps.rewardsPositionIds?.includes(position.positionId)
      ),
    [allPositionsWithBalance, pool.dataProps.rewardsPositionIds]
  )

  const disabled =
    // Should disable if the user enters 0, has enough balance but the transaction
    // is not possible, does not have enough balance, or if transaction is already
    // submitted
    !!processedAmounts.token.bignum?.isZero() || !transactionIsPossible || transactionSubmitted

  const onSelectPercentageAmount = (percentage: number) => {
    handleSelectPercentageAmount(percentage)
    setSelectedPercentage(percentage)

    AppAnalytics.track(SendEvents.send_percentage_selected, {
      tokenId: inputToken.tokenId,
      tokenAddress: inputToken.address,
      networkId: inputToken.networkId,
      percentage: percentage * 100,
      flow: 'earn',
    })
  }

  const onPressContinue = () => {
    if (!processedAmounts.token.bignum || !transactionToken) {
      // should never happen
      return
    }
    AppAnalytics.track(EarnEvents.earn_enter_amount_continue_press, {
      // TokenAmount is always deposit token
      amountInUsd: processedAmounts.token.bignum.multipliedBy(inputToken.priceUsd ?? 0).toFixed(2),
      amountEnteredIn: amountType,
      depositTokenId: pool.dataProps.depositTokenId,
      networkId: pool.networkId,
      providerId: pool.appId,
      poolId: pool.positionId,
      fromTokenId: inputToken.tokenId,
      fromTokenAmount: processedAmounts.token.bignum.toString(),
      fromNetworkId: inputToken.networkId,
      swapType: swapTransaction?.swapType,
      mode,
      depositTokenAmount: isWithdrawal
        ? undefined
        : swapTransaction
          ? getSwapToAmountInDecimals({
              swapTransaction,
              fromAmount: processedAmounts.token.bignum,
            }).toString()
          : processedAmounts.token.bignum.toString(),
    })

    if (isWithdrawal) {
      return navigate(Screens.EarnWithdrawConfirmationScreen, {
        pool,
        mode,
        inputTokenAmount: processedAmounts.token.bignum.toString(),
        useMax: selectedPercentage === 1,
      })
    }

    if (prepareTransactionsResult?.type === 'possible') {
      return navigate(Screens.EarnDepositConfirmationScreen, {
        mode,
        pool,
        swapTransaction,
        inputTokenAmount: processedAmounts.token.bignum.toString(),
        inputTokenInfo: getSerializableTokenBalance(inputToken),
        preparedTransaction: getSerializablePreparedTransactionsPossible(prepareTransactionsResult),
      })
    }

    Logger.error(
      TAG,
      'Transaction is not a withdrawal and prepared transaction for deposit is not possible'
    )
  }

  const dropdownEnabled = availableInputTokens.length > 1

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <CustomHeader style={{ paddingHorizontal: Spacing.Thick24 }} left={<BackButton />} />
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.Thick24),
          },
        ]}
        onScrollBeginDrag={() => {
          Keyboard.dismiss()
        }}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.title}>
            {isWithdrawal
              ? t('earnFlow.enterAmount.titleWithdraw')
              : t('earnFlow.enterAmount.title')}
          </Text>
          <TokenEnterAmount
            autoFocus
            testID="EarnEnterAmount"
            token={inputToken}
            inputValue={amount}
            inputRef={inputRef}
            tokenAmount={processedAmounts.token.displayAmount}
            localAmount={processedAmounts.local.displayAmount}
            onInputChange={handleAmountInputChange}
            amountType={amountType}
            toggleAmountType={handleToggleAmountType}
            onOpenTokenPicker={dropdownEnabled ? onOpenTokenPicker : undefined}
          />
          {processedAmounts.token.bignum && prepareTransactionsResult && !isWithdrawal && (
            <TransactionDepositDetails
              pool={pool}
              token={inputToken}
              tokenAmount={processedAmounts.token.bignum}
              prepareTransactionsResult={prepareTransactionsResult}
              swapTransaction={swapTransaction}
            />
          )}
          {isWithdrawal && (
            <TransactionWithdrawDetails
              pool={pool}
              prepareTransactionsResult={prepareTransactionsResult}
              rewardsPositions={rewardsPositions}
            />
          )}
        </View>
        <GasFeeWarning
          prepareTransactionsResult={prepareTransactionsResult}
          flow={'Deposit'}
          onPressSmallerAmount={handleAmountInputChange}
        />
        {showLowerAmountError && (
          <InLineNotification
            variant={NotificationVariant.Warning}
            title={t('sendEnterAmountScreen.insufficientBalanceWarning.title', {
              tokenSymbol: inputToken.symbol,
            })}
            description={t('sendEnterAmountScreen.insufficientBalanceWarning.description', {
              tokenSymbol: inputToken.symbol,
            })}
            style={styles.warning}
            testID="EarnEnterAmount/NotEnoughBalanceWarning"
          />
        )}
        {prepareTransactionError && (
          <InLineNotification
            variant={NotificationVariant.Error}
            title={t('sendEnterAmountScreen.prepareTransactionError.title')}
            description={t('sendEnterAmountScreen.prepareTransactionError.description')}
            style={styles.warning}
            testID="EarnEnterAmount/PrepareTransactionError"
          />
        )}
        {isWithdrawal && pool.dataProps.withdrawalIncludesClaim && rewardsPositions.length > 0 && (
          <InLineNotification
            variant={NotificationVariant.Info}
            title={t('earnFlow.enterAmount.withdrawingAndClaimingCard.title')}
            description={t('earnFlow.enterAmount.withdrawingAndClaimingCard.description', {
              providerName: pool.appName,
            })}
            style={styles.warning}
            testID="EarnEnterAmount/WithdrawingAndClaimingCard"
          />
        )}
        <EnterAmountOptions
          onPressAmount={onSelectPercentageAmount}
          selectedAmount={selectedPercentage}
          testID="EarnEnterAmount/AmountOptions"
        />
        <Button
          onPress={onPressContinue}
          text={t('earnFlow.enterAmount.continue')}
          size={BtnSizes.FULL}
          disabled={disabled}
          style={styles.continueButton}
          showLoading={isPreparingTransactions || transactionSubmitted}
          testID="EarnEnterAmount/Continue"
        />
      </KeyboardAwareScrollView>
      <TokenBottomSheet
        forwardedRef={tokenBottomSheetRef}
        snapPoints={['90%']}
        origin={TokenPickerOrigin.Earn}
        onTokenSelected={onSelectToken}
        tokens={availableInputTokens}
        title={t('sendEnterAmountScreen.selectToken')}
        titleStyle={styles.title}
      />
    </SafeAreaView>
  )
}

function TransactionWithdrawDetails({
  pool,
  prepareTransactionsResult,
  rewardsPositions,
}: {
  pool: EarnPosition
  prepareTransactionsResult?: PreparedTransactionsResult
  rewardsPositions: Position[]
}) {
  const { t } = useTranslation()
  const networkFee = useNetworkFee(prepareTransactionsResult)
  const usdToLocalRate = useSelector(usdToLocalCurrencyRateSelector)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const feeBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const earningItemsTokenInfo = useTokensInfo(
    rewardsPositions.map((position) => position.tokens[0]?.tokenId)
  )

  /**
   * This details block renders only conditional sections. If no checks pass - the empty box will
   * be shown (and we don't want that). In order to omit the empty box - we don't render anything
   * if all the variables necessary for at least one successful condition is false.
   */
  if (!networkFee && !pool.dataProps.withdrawalIncludesClaim) {
    return null
  }

  return (
    <View style={styles.txDetailsContainer} testID="EnterAmountWithdrawDetails">
      {pool.dataProps.withdrawalIncludesClaim &&
        rewardsPositions.map((position, index) => {
          const tokenAmount = new BigNumber(position.tokens[0].balance)
          const tokenInfo = earningItemsTokenInfo.find(
            (token) => token?.tokenId === position.tokens[0].tokenId
          )
          const localAmount = convertTokenToLocalAmount({ tokenAmount, tokenInfo, usdToLocalRate })
          return (
            <ReviewDetailsItem
              type="token-amount"
              label={t('earnFlow.enterAmount.claimingReward')}
              testID={`EnterAmountWithdrawDetails/ClaimingReward-${index}`}
              tokenAmount={tokenAmount}
              localAmount={localAmount}
              tokenInfo={tokenInfo}
              localCurrencySymbol={localCurrencySymbol}
            />
          )
        })}

      {!!networkFee && (
        <>
          <ReviewDetailsItem
            approx
            type="token-amount"
            label={t('networkFee')}
            testID="EnterAmountWithdrawDetails/NetworkFee"
            tokenAmount={networkFee.amount}
            localAmount={networkFee.localAmount}
            tokenInfo={networkFee.token}
            localCurrencySymbol={localCurrencySymbol}
            onInfoPress={() => feeBottomSheetRef?.current?.snapToIndex(0)}
          />

          <FeeInfoBottomSheet forwardedRef={feeBottomSheetRef} networkFee={networkFee} />
        </>
      )}
    </View>
  )
}

function TransactionDepositDetails({
  pool,
  token,
  tokenAmount,
  prepareTransactionsResult,
  swapTransaction,
}: {
  pool: EarnPosition
  token: TokenBalance
  tokenAmount: BigNumber
  prepareTransactionsResult: PreparedTransactionsResult
  swapTransaction?: SwapTransaction
}) {
  const { t } = useTranslation()
  const feeBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const swapAndDepositBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const edtimatedDurationBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const crossChainFeeCurrency = useSelector((state) =>
    feeCurrenciesSelector(state, token.networkId)
  ).find((token) => token.isNative)

  const localAmount = useTokenToLocalAmount(tokenAmount, token.tokenId)
  const networkFee = useNetworkFee(prepareTransactionsResult)

  const depositTokenAmount = useMemo(
    () =>
      swapTransaction
        ? getSwapToAmountInDecimals({ swapTransaction, fromAmount: tokenAmount })
        : tokenAmount,
    [tokenAmount, swapTransaction]
  )
  const depositTokenInfo = useTokenInfo(pool.dataProps.depositTokenId)
  const depositLocalAmount = useTokenToLocalAmount(depositTokenAmount, depositTokenInfo?.tokenId)

  const swapAppFee = useMemo(() => {
    if (!swapTransaction?.appFeePercentageIncludedInPrice) {
      return undefined
    }

    const percentage = new BigNumber(swapTransaction.appFeePercentageIncludedInPrice)
    return {
      token,
      percentage,
      amount: tokenAmount.multipliedBy(percentage.shiftedBy(-2)), // To convert from percentage to decimal
    }
  }, [swapTransaction?.appFeePercentageIncludedInPrice, token, tokenAmount])

  const crossChainFee = useMemo((): SwapFeeAmount | undefined => {
    if (swapTransaction?.swapType !== 'cross-chain' || !prepareTransactionsResult) {
      return undefined
    }

    const crossChainFee = getCrossChainFee({
      feeCurrency: crossChainFeeCurrency,
      preparedTransactions: prepareTransactionsResult,
      estimatedCrossChainFee: swapTransaction.estimatedCrossChainFee,
      maxCrossChainFee: swapTransaction.maxCrossChainFee,
      fromTokenId: token.tokenId,
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
  }, [swapTransaction, prepareTransactionsResult, crossChainFeeCurrency, token])

  const isGasSubsidized =
    prepareTransactionsResult.type === 'possible' &&
    isGasSubsidizedForNetwork(prepareTransactionsResult.feeCurrency.networkId)

  if (!networkFee?.maxAmount || !networkFee.token) {
    return null
  }

  return (
    <View testID="EnterAmountDepositDetails" style={styles.enterAmountDepositDetails}>
      {swapTransaction && (
        <>
          <ReviewDetailsItem
            type="plain-text"
            label={t('earnFlow.enterAmount.swap')}
            testID="EnterAmountDepositDetails/Swap"
            onInfoPress={() => swapAndDepositBottomSheetRef?.current?.snapToIndex(0)}
            value={
              <View style={styles.depositDetailsSwapValue}>
                <Text
                  style={styles.depositDetailsSwapValueText}
                  testID="EnterAmountDepositDetails/Swap/From"
                >
                  <Trans
                    i18nKey="tokenAmount"
                    tOptions={{
                      tokenAmount: formatValueToDisplay(tokenAmount),
                      tokenSymbol: token.symbol,
                    }}
                  />
                </Text>
                <ArrowRightThick size={20} color={Colors.contentPrimary} />
                <Text
                  style={styles.depositDetailsSwapValueText}
                  testID="EnterAmountDepositDetails/Swap/To"
                >
                  <Trans
                    i18nKey="tokenAmount"
                    tOptions={{
                      tokenAmount: formatValueToDisplay(depositTokenAmount),
                      tokenSymbol: depositTokenInfo?.symbol,
                    }}
                  />
                </Text>
              </View>
            }
          />

          <InfoBottomSheet
            title={t('earnFlow.swapAndDepositInfoSheet.title')}
            forwardedRef={swapAndDepositBottomSheetRef}
            testID="SwapAndDepositInfoSheet"
          >
            <InfoBottomSheetContentBlock>
              <ReviewDetailsItem
                testID="SwapAndDepositInfoSheet/SwapFrom"
                fontSize="small"
                type="token-amount"
                label={t('earnFlow.swapAndDepositInfoSheet.swapFrom')}
                tokenAmount={tokenAmount}
                localAmount={localAmount}
                tokenInfo={token}
                localCurrencySymbol={localCurrencySymbol}
              />

              <ReviewDetailsItem
                testID="SwapAndDepositInfoSheet/SwapTo"
                fontSize="small"
                type="token-amount"
                label={t('earnFlow.swapAndDepositInfoSheet.swapTo')}
                tokenAmount={depositTokenAmount}
                localAmount={depositLocalAmount}
                tokenInfo={depositTokenInfo}
                localCurrencySymbol={localCurrencySymbol}
              />
            </InfoBottomSheetContentBlock>

            <InfoBottomSheetContentBlock testID="SwapAndDepositInfoSheet/Disclaimer">
              <InfoBottomSheetHeading>
                <Trans i18nKey="earnFlow.swapAndDepositInfoSheet.whySwap" />
              </InfoBottomSheetHeading>

              <InfoBottomSheetParagraph>
                <Trans i18nKey="earnFlow.swapAndDepositInfoSheet.swapDescription" />
              </InfoBottomSheetParagraph>
            </InfoBottomSheetContentBlock>
          </InfoBottomSheet>
        </>
      )}

      <ReviewDetailsItem
        type="token-amount"
        label={t('deposit')}
        testID="EnterAmountDepositDetails/Deposit"
        tokenAmount={depositTokenAmount}
        tokenInfo={depositTokenInfo}
        localAmount={depositLocalAmount}
        localCurrencySymbol={localCurrencySymbol}
      />

      <ReviewDetailsItem
        approx
        caption={isGasSubsidized ? t('gasSubsidized') : undefined}
        captionColor={isGasSubsidized ? Colors.accent : undefined}
        strikeThrough={isGasSubsidized}
        testID="EnterAmountDepositDetails/Fee"
        type="token-amount"
        label={swapAppFee || crossChainFee ? t('fees') : t('networkFee')}
        tokenAmount={networkFee.amount}
        localAmount={networkFee.localAmount}
        tokenInfo={networkFee.token}
        localCurrencySymbol={localCurrencySymbol}
        onInfoPress={() => feeBottomSheetRef.current?.snapToIndex(0)}
      />

      {swapTransaction?.swapType === 'cross-chain' && !!swapTransaction.estimatedDuration && (
        <>
          <ReviewDetailsItem
            type="plain-text"
            onInfoPress={() => edtimatedDurationBottomSheetRef.current?.snapToIndex(0)}
            label={t('earnFlow.enterAmount.estimatedDuration')}
            testID="EnterAmountDepositDetails/EstimatedDuration"
            value={t('swapScreen.transactionDetails.estimatedTransactionTimeInMinutes', {
              minutes: Math.ceil(swapTransaction.estimatedDuration / 60),
            })}
          />
          <InfoBottomSheet
            forwardedRef={edtimatedDurationBottomSheetRef}
            testID="EnterAmountDepositDetailsDuration/InfoSheet"
            title={t('swapScreen.transactionDetails.estimatedTransactionTime')}
            description={t('swapScreen.transactionDetails.estimatedTransactionTimeInfo')}
          />
        </>
      )}

      <FeeInfoBottomSheet
        forwardedRef={feeBottomSheetRef}
        networkFee={networkFee}
        appFee={swapAppFee}
        crossChainFee={crossChainFee}
      />
    </View>
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
  continueButton: {
    paddingTop: Spacing.Thick24,
    marginTop: 'auto',
  },
  warning: {
    marginTop: Spacing.Regular16,
    paddingHorizontal: Spacing.Regular16,
    borderRadius: 16,
  },
  txDetailsContainer: {
    marginVertical: Spacing.Regular16,
    gap: Spacing.Smallest8,
  },
  depositDetailsSwapValue: {
    gap: Spacing.Tiny4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  depositDetailsSwapValueText: {
    ...typeScale.bodyMedium,
  },
  enterAmountDepositDetails: {
    gap: Spacing.Smallest8,
    marginVertical: Spacing.Regular16,
  },
})
