import BigNumber from 'bignumber.js'
import React from 'react'
import { Trans } from 'react-i18next'
import { StyleProp, Text, TextStyle } from 'react-native'
import { useSelector } from 'react-redux'
import { APPROX_SYMBOL } from 'src/components/TokenEnterAmount'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import { useTokenInfo, useTokenToLocalAmount } from 'src/tokens/hooks'
import type { TokenBalance } from 'src/tokens/slice'
import Logger from 'src/utils/Logger'

const TAG = 'components/TokenDisplayV2'
const DEFAULT_DISPLAY_DECIMALS = 2

function calculateDecimalsToShow(value: BigNumber) {
  const exponent = value?.e ?? 0
  if (exponent >= 0) {
    return DEFAULT_DISPLAY_DECIMALS
  }

  return Math.abs(exponent) + 1
}

// Formats |value| so that it shows at least 2 significant figures and at least 2 decimal places without trailing zeros.
export function formatValueToDisplay(value: BigNumber) {
  let decimals = calculateDecimalsToShow(value)
  let text = value.toFormat(decimals)
  while (text[text.length - 1] === '0' && decimals-- > 2) {
    text = text.substring(0, text.length - 1)
  }
  return text
}

function getSign(sign: Props['sign'] = 'none', amount: BigNumber) {
  if (sign === 'only-negative') return amount.isNegative() ? '- ' : ''
  if (sign === 'show-all') return amount.isNegative() ? '- ' : '+ '
  return ''
}

function getTokenAmountDisplay(tokenAmount: BigNumber, tokenInfo: TokenBalance) {
  return `${formatValueToDisplay(tokenAmount.abs())} ${tokenInfo.symbol}`
}

function getLocalAmountDisplay(
  localAmount: BigNumber | null,
  localCurrencySymbol: LocalCurrencySymbol
) {
  const localAmountDisplay = localAmount ? formatValueToDisplay(localAmount.abs()) : ''
  return localAmountDisplay ? `${localCurrencySymbol}${localAmountDisplay}` : ''
}

interface Props {
  approx?: boolean
  /**
   * Optional test ID for testing purposes.
   */
  testID?: string

  /**
   * Optional style for the text component.
   */
  style?: StyleProp<TextStyle>

  /**
   * Optional sign to indicate the type of token amount display.
   *   - `none`: shows number without the sign
   *   - `only-negative` adds `-` sign in front of the negative amount, positive amount is ignored
   *   - `show-all` adds whether `+` or `-` based on the amount
   */
  sign?: 'none' | 'only-negative' | 'show-all'

  /**
   * ID of the token to display. If not provided – error will be thrown.
   */
  tokenId: string | undefined

  /**
   * The amount of the token to display.
   */
  tokenAmount: BigNumber.Value
}

/**
 * @returns
 * - if token cannot be found by `tokenId` then returns `null` and logs an error
 * - otherwise returns value in the format: `1.123456 USDC`
 */
export function TokenAmountDisplay(props: Props) {
  const tokenInfo = useTokenInfo(props.tokenId)
  const tokenAmount = new BigNumber(props.tokenAmount)
  const sign = getSign(props.sign, tokenAmount)

  if (!tokenInfo) {
    Logger.error(TAG, 'tokenInfo not found')
    return null
  }

  return (
    <Text testID={props.testID} style={props.style}>
      <>
        {props.approx && `${APPROX_SYMBOL} `}
        {sign}
        {getTokenAmountDisplay(tokenAmount, tokenInfo)}
      </>
    </Text>
  )
}

/**
 * @returns Returns value in the following formats:
 * - `Price Unavailable` when local amount cannot be determined
 * - `$1.23`
 */
export function LocalAmountDisplay(props: Props) {
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const tokenInfo = useTokenInfo(props.tokenId)
  const tokenAmount = new BigNumber(props.tokenAmount)
  const localAmount = useTokenToLocalAmount(tokenAmount, tokenInfo?.tokenId)
  const sign = getSign(props.sign, tokenAmount)

  return (
    <Text testID={props.testID} style={props.style}>
      {localAmount ? (
        <>
          {props.approx && `${APPROX_SYMBOL} `}
          {sign}
          {getLocalAmountDisplay(localAmount, localCurrencySymbol)}
        </>
      ) : (
        <Trans i18nKey="localAmount_noFiatPrice" />
      )}
    </Text>
  )
}

/**
 * @returns
 * - if token cannot be found by `tokenId` then returns `null` and logs an error
 * - otherwise returns value in the following formats:
 *   - `1.123456 USDC ($1.23)` - when local amount is available
 *   - `1.123456 USDC` - when local amount is not available
 */
export function TokenAndLocalAmountDisplay(props: Props) {
  const tokenInfo = useTokenInfo(props.tokenId)
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const tokenAmount = new BigNumber(props.tokenAmount)
  const localAmount = useTokenToLocalAmount(tokenAmount, tokenInfo?.tokenId)
  const localAmountDisplay = getLocalAmountDisplay(localAmount, localCurrencySymbol)
  const sign = getSign(props.sign, tokenAmount)

  if (!tokenInfo) {
    Logger.error(TAG, 'tokenInfo not found')
    return null
  }

  return (
    <Text testID={props.testID} style={props.style}>
      <>
        {props.approx && `${APPROX_SYMBOL} `}
        {sign}
        {getTokenAmountDisplay(tokenAmount, tokenInfo)}
        {localAmountDisplay ? ` (${localAmountDisplay})` : ''}
      </>
    </Text>
  )
}
