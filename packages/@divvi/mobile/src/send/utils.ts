import { SendOrigin } from 'src/analytics/types'
import { LocalCurrencyCode } from 'src/localCurrency/consts'
import {
  convertDollarsToLocalAmount,
  convertLocalAmountToDollars,
  convertToMaxSupportedPrecision,
} from 'src/localCurrency/convert'
import { fetchExchangeRate } from 'src/localCurrency/saga'
import { getLocalCurrencyCode, usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { UriData, uriDataFromUrl } from 'src/qrcode/schema'
import { AddressRecipient, Recipient, RecipientType } from 'src/recipients/recipient'
import { updateAppRecipientCache } from 'src/recipients/reducer'
import { TransactionDataInput } from 'src/send/types'
import { tokensListSelector } from 'src/tokens/selectors'
import { TokenBalance } from 'src/tokens/slice'
import { convertLocalToTokenAmount } from 'src/tokens/utils'
import { Currency } from 'src/utils/currencies'
import Logger from 'src/utils/Logger'
import { call, put, select } from 'typed-redux-saga'

const TAG = 'send/utils'

export function* handleSendPaymentData({
  data,
  isFromScan,
  cachedRecipient,
  defaultTokenIdOverride,
}: {
  data: UriData
  isFromScan: boolean
  cachedRecipient?: Recipient
  defaultTokenIdOverride?: string
}) {
  const recipient: AddressRecipient = {
    address: data.address.toLowerCase(),
    name: data.displayName || cachedRecipient?.name,
    e164PhoneNumber: data.e164PhoneNumber,
    displayNumber: cachedRecipient?.displayNumber,
    thumbnailPath: cachedRecipient?.thumbnailPath,
    contactId: cachedRecipient?.contactId,
    recipientType: RecipientType.Address,
  }
  yield* put(
    updateAppRecipientCache({
      [data.address.toLowerCase()]: recipient,
    })
  )

  const tokens: TokenBalance[] = yield* select(tokensListSelector)
  const tokenInfo = tokens.find((token) => token?.symbol === (data.token ?? Currency.Dollar))

  if (!tokenInfo?.priceUsd) {
    navigate(Screens.SendEnterAmount, {
      recipient,
      isFromScan,
      origin: SendOrigin.AppSendFlow,
      defaultTokenIdOverride: data.token ? tokenInfo?.tokenId : undefined,
      forceTokenId: !!(data.token && tokenInfo?.tokenId),
    })
    return
  }

  if (data.amount && tokenInfo?.address) {
    const currency: LocalCurrencyCode = data.currencyCode
      ? (data.currencyCode as LocalCurrencyCode)
      : yield* select(getLocalCurrencyCode)
    const exchangeRate = yield* call(fetchExchangeRate, currency)
    const dollarAmount = convertLocalAmountToDollars(data.amount, exchangeRate)
    const usdToLocalRate = yield* select(usdToLocalCurrencyRateSelector)
    const localAmount = convertDollarsToLocalAmount(dollarAmount, usdToLocalRate)
    const inputAmount = localAmount && convertToMaxSupportedPrecision(localAmount)
    const tokenAmount = convertLocalToTokenAmount({
      localAmount: inputAmount,
      tokenInfo,
      usdToLocalRate,
    })
    if (!inputAmount || !tokenAmount) {
      Logger.warn(TAG, '@handleSendPaymentData null amount')
      return
    }
    const transactionData: TransactionDataInput = {
      recipient,
      inputAmount,
      amountIsInLocalCurrency: true,
      tokenAddress: tokenInfo.address,
      tokenAmount,
      tokenId: tokenInfo.tokenId,
    }

    navigate(Screens.SendConfirmation, {
      transactionData,
      isFromScan,
      origin: SendOrigin.AppSendFlow,
    })
  } else {
    navigate(Screens.SendEnterAmount, {
      recipient,
      isFromScan,
      origin: SendOrigin.AppSendFlow,
      defaultTokenIdOverride:
        defaultTokenIdOverride ?? (data.token ? tokenInfo?.tokenId : undefined),
      forceTokenId: !!(data.token && tokenInfo?.tokenId),
    })
  }
}

export function* handlePaymentDeeplink(deeplink: string) {
  try {
    const paymentData = uriDataFromUrl(deeplink)
    yield* call(handleSendPaymentData, { data: paymentData, isFromScan: true })
  } catch (e) {
    Logger.warn('handlePaymentDeepLink', `deeplink ${deeplink} failed with ${e}`)
  }
}
