import { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { showError } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { SendEvents } from 'src/analytics/Events'
import { ErrorMessages } from 'src/app/ErrorMessages'
import BackButton from 'src/components/BackButton'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes } from 'src/components/Button'
import InfoBottomSheet, { InfoBottomSheetContentBlock } from 'src/components/InfoBottomSheet'
import {
  buildAmounts,
  ReviewContent,
  ReviewDetails,
  ReviewDetailsItem,
  ReviewFooter,
  ReviewSummary,
  ReviewSummaryItem,
  ReviewSummaryItemContact,
  ReviewTransaction,
} from 'src/components/ReviewTransaction'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon from 'src/components/TokenIcon'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencyCode, getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import { noHeader } from 'src/navigator/Headers'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { sendPayment } from 'src/send/actions'
import { isSendingSelector } from 'src/send/selectors'
import { usePrepareSendTransactions } from 'src/send/usePrepareSendTransactions'
import { NETWORK_NAMES } from 'src/shared/conts'
import { useAmountAsUsd, useTokenInfo, useTokenToLocalAmount } from 'src/tokens/hooks'
import { feeCurrenciesSelector } from 'src/tokens/selectors'
import Logger from 'src/utils/Logger'
import { getFeeCurrencyAndAmounts } from 'src/viem/prepareTransactions'
import {
  getPreparedTransactionsPossible,
  getSerializablePreparedTransaction,
} from 'src/viem/preparedTransactionSerialization'
import { walletAddressSelector } from 'src/web3/selectors'

type Props = NativeStackScreenProps<StackParamList, Screens.SendConfirmation>

const TAG = 'send/SendConfirmation'

export const sendConfirmationScreenNavOptions = noHeader

function usePreparedTransaction(params: Props['route']['params']) {
  const { prepareTransactionsResult, refreshPreparedTransactions, prepareTransactionLoading } =
    usePrepareSendTransactions()

  const deserializedTx = useMemo(() => {
    return params.prepareTransactionsResult
      ? getPreparedTransactionsPossible(params.prepareTransactionsResult)
      : null
  }, [params.prepareTransactionsResult])

  return {
    prepareTransactionsResult: deserializedTx ?? prepareTransactionsResult,
    prepareTransactionLoading: deserializedTx ? false : prepareTransactionLoading,
    refreshPreparedTransactions,
  }
}

export default function SendConfirmation({ route: { params } }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const feesBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const totalBottomSheetRef = useRef<BottomSheetModalRefType>(null)
  const openedViaDeeplink = !params.prepareTransactionsResult

  const {
    origin,
    transactionData: { recipient, tokenAmount, tokenAddress, tokenId },
  } = params

  const { prepareTransactionsResult, refreshPreparedTransactions, prepareTransactionLoading } =
    usePreparedTransaction(params)

  const tokenInfo = useTokenInfo(tokenId)
  const isSending = useSelector(isSendingSelector)
  const localCurrencyCode = useSelector(getLocalCurrencyCode)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const localAmount = useTokenToLocalAmount(tokenAmount, tokenId)
  const usdAmount = useAmountAsUsd(tokenAmount, tokenId)
  const walletAddress = useSelector(walletAddressSelector)
  const feeCurrencies = useSelector((state) => feeCurrenciesSelector(state, tokenInfo!.networkId))
  const {
    maxFeeAmount,
    estimatedFeeAmount,
    feeCurrency: feeTokenInfo,
  } = getFeeCurrencyAndAmounts(prepareTransactionsResult)
  const tokenMaxFeeAmount = maxFeeAmount ?? new BigNumber(0)
  const localMaxFeeAmount = useTokenToLocalAmount(tokenMaxFeeAmount, feeTokenInfo?.tokenId)
  const tokenEstimatedFeeAmount = estimatedFeeAmount ?? new BigNumber(0)
  const localEstimatedFeeAmount = useTokenToLocalAmount(
    tokenEstimatedFeeAmount,
    feeTokenInfo?.tokenId
  )

  useEffect(() => {
    if (!openedViaDeeplink) {
      return
    }

    if (!walletAddress || !tokenInfo) {
      return // should never happen
    }

    void refreshPreparedTransactions({
      amount: tokenAmount,
      token: tokenInfo,
      recipientAddress: recipient.address,
      walletAddress,
      feeCurrencies,
    })
  }, [tokenInfo, tokenAmount, recipient, walletAddress, feeCurrencies, openedViaDeeplink])

  const disableSend =
    isSending || !prepareTransactionsResult || prepareTransactionsResult.type !== 'possible'

  const onSend = () => {
    const preparedTransaction =
      prepareTransactionsResult &&
      prepareTransactionsResult.type === 'possible' &&
      prepareTransactionsResult.transactions[0]
    if (!preparedTransaction) {
      // This should never happen because the confirm button is disabled if this happens.
      dispatch(showError(ErrorMessages.SEND_PAYMENT_FAILED))
      return
    }

    AppAnalytics.track(SendEvents.send_confirm_send, {
      origin,
      recipientType: recipient.recipientType,
      isScan: params.isFromScan,
      localCurrency: localCurrencyCode,
      usdAmount: usdAmount?.toString() ?? null,
      localCurrencyAmount: localAmount?.toString() ?? null,
      tokenAmount: tokenAmount.toString(),
      tokenSymbol: tokenInfo?.symbol ?? '',
      tokenAddress: tokenAddress ?? null,
      networkId: tokenInfo?.networkId ?? null,
      tokenId,
      isTokenManuallyImported: !!tokenInfo?.isManuallyImported,
    })

    dispatch(
      sendPayment(
        tokenAmount,
        tokenId,
        usdAmount,
        recipient,
        openedViaDeeplink,
        getSerializablePreparedTransaction(preparedTransaction)
      )
    )
  }

  // Should never happen
  if (!tokenInfo) {
    Logger.error(TAG, `tokenInfo is missing`)
    return null
  }

  return (
    <ReviewTransaction
      title={t('reviewTransaction.title')}
      headerLeftButton={<BackButton eventName={SendEvents.send_confirm_back} />}
    >
      <ReviewContent>
        <ReviewSummary>
          <ReviewSummaryItem
            testID="SendConfirmationToken"
            label={t('sending')}
            icon={<TokenIcon token={tokenInfo} />}
            primaryValue={t('tokenAmount', {
              tokenAmount: formatValueToDisplay(tokenAmount),
              tokenSymbol: tokenInfo.symbol ?? '',
            })}
            secondaryValue={t('localAmount', {
              localAmount: formatValueToDisplay(localAmount ?? new BigNumber(0)),
              localCurrencySymbol,
              context: localAmount ? undefined : 'noFiatPrice',
            })}
          />

          <ReviewSummaryItemContact testID="SendConfirmationRecipient" recipient={recipient} />
        </ReviewSummary>

        <ReviewDetails>
          <ReviewDetailsItem
            testID="SendConfirmationNetwork"
            type="plain-text"
            label={t('transactionDetails.network')}
            value={NETWORK_NAMES[tokenInfo.networkId]}
          />
          <ReviewDetailsItem
            approx
            testID="SendConfirmationFee"
            type="token-amount"
            label={t('networkFee')}
            isLoading={prepareTransactionLoading}
            tokenAmount={tokenEstimatedFeeAmount}
            localAmount={localEstimatedFeeAmount}
            tokenInfo={feeTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
            onInfoPress={() => feesBottomSheetRef.current?.snapToIndex(0)}
          />

          <ReviewDetailsItem
            approx
            testID="SendConfirmationTotal"
            type="total-token-amount"
            label={t('reviewTransaction.totalPlusFees')}
            isLoading={prepareTransactionLoading}
            localCurrencySymbol={localCurrencySymbol}
            onInfoPress={() => totalBottomSheetRef.current?.snapToIndex(0)}
            amounts={buildAmounts([
              { tokenInfo, tokenAmount, localAmount },
              {
                tokenInfo: feeTokenInfo,
                tokenAmount: tokenEstimatedFeeAmount,
                localAmount: localEstimatedFeeAmount,
              },
            ])}
          />
        </ReviewDetails>
      </ReviewContent>

      <ReviewFooter>
        <Button
          testID="ConfirmButton"
          text={t('send')}
          accessibilityLabel={t('send')}
          onPress={onSend}
          showLoading={isSending}
          size={BtnSizes.FULL}
          disabled={disableSend}
        />
      </ReviewFooter>

      <InfoBottomSheet forwardedRef={feesBottomSheetRef} title={t('networkFee')}>
        <InfoBottomSheetContentBlock>
          <ReviewDetailsItem
            approx
            fontSize="small"
            type="token-amount"
            label={t('estimatedNetworkFee')}
            tokenAmount={tokenEstimatedFeeAmount}
            localAmount={localEstimatedFeeAmount}
            tokenInfo={feeTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            fontSize="small"
            type="token-amount"
            label={t('maxNetworkFee')}
            tokenAmount={tokenMaxFeeAmount}
            localAmount={localMaxFeeAmount}
            tokenInfo={feeTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        </InfoBottomSheetContentBlock>
      </InfoBottomSheet>

      <InfoBottomSheet
        forwardedRef={totalBottomSheetRef}
        title={t('reviewTransaction.totalPlusFees')}
      >
        <InfoBottomSheetContentBlock>
          <ReviewDetailsItem
            fontSize="small"
            type="token-amount"
            label={t('sending')}
            tokenAmount={tokenAmount}
            localAmount={localAmount}
            tokenInfo={tokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            approx
            fontSize="small"
            type="token-amount"
            label={t('fees')}
            tokenAmount={tokenEstimatedFeeAmount}
            localAmount={localEstimatedFeeAmount}
            tokenInfo={feeTokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />

          <ReviewDetailsItem
            approx
            fontSize="small"
            type="total-token-amount"
            label={t('reviewTransaction.totalPlusFees')}
            localCurrencySymbol={localCurrencySymbol}
            amounts={buildAmounts([
              { tokenInfo, tokenAmount, localAmount },
              {
                tokenInfo: feeTokenInfo,
                tokenAmount: tokenEstimatedFeeAmount,
                localAmount: localEstimatedFeeAmount,
              },
            ])}
          />
        </InfoBottomSheetContentBlock>
      </InfoBottomSheet>
    </ReviewTransaction>
  )
}
