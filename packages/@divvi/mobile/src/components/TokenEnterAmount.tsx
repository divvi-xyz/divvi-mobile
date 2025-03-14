import BigNumber from 'bignumber.js'
import React, { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Platform,
  TextInput as RNTextInput,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native'
import { getNumberFormatSettings } from 'react-native-localize'
import SkeletonPlaceholder from 'src/components/SkeletonPlaceholder'
import TextInput from 'src/components/TextInput'
import TokenDisplay from 'src/components/TokenDisplay'
import TokenIcon, { IconSize } from 'src/components/TokenIcon'
import Touchable from 'src/components/Touchable'
import DownArrowIcon from 'src/icons/DownArrowIcon'
import SwapArrows from 'src/icons/SwapArrows'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol, usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import { useSelector } from 'src/redux/hooks'
import { type AmountEnteredIn } from 'src/send/types'
import { NETWORK_NAMES } from 'src/shared/conts'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'
import { type TokenBalance } from 'src/tokens/slice'
import { convertLocalToTokenAmount, convertTokenToLocalAmount } from 'src/tokens/utils'
import { parseInputAmount } from 'src/utils/parsing'

export const APPROX_SYMBOL = '≈'

const BORDER_RADIUS = 12
export const FETCH_UPDATED_TRANSACTIONS_DEBOUNCE_TIME_MS = 250

/**
 * This function formats numbers in a "1234.5678" format into the correct format according to the
 * return value of the `getNumberFormatSettings` function.
 * E.g.
 *   - With decimal "." and grouping ",": 1234.5678 -> 1,234.5678
 *   - With decimal "," and grouping ".": 1234.5678 -> 1.234,5678
 */
export function formatNumber(value: string) {
  const { decimalSeparator, groupingSeparator } = getNumberFormatSettings()
  return value
    .replace(/\B(?=(\d{3})+(?!\d))(?<!\.\d*)/g, '_')
    .replaceAll('.', decimalSeparator)
    .replaceAll('_', groupingSeparator)
}

/**
 * Unformats value from the phone's selected number format to a standard "1234.5678" js number.
 * Do not use this function with values that are not formatted according to the device number
 * format settings, e.g. values that are returned by API's in the standard js format.
 */
export function unformatNumberForProcessing(value: string) {
  const { decimalSeparator, groupingSeparator } = getNumberFormatSettings()
  return value.replaceAll(groupingSeparator, '').replaceAll(decimalSeparator, '.')
}

export function roundFiatValue(value: BigNumber | null) {
  if (!value) return ''
  return value.isLessThan(0.01) ? value.toPrecision(1) : value.toFixed(2)
}

/**
 * This function returns complete formatted value for a token (crypto) amount when it is being a
 * converted value (in "ExchangeAmount" element).
 */
export function getDisplayTokenAmount(bignum: BigNumber | null, token: TokenBalance) {
  const { decimalSeparator } = getNumberFormatSettings()
  if (bignum === null || bignum.isZero()) {
    return ''
  }

  if (bignum.isLessThan(0.000001)) {
    return `<0${decimalSeparator}000001 ${token.symbol}`
  }

  const formattedAmount = formatNumber(bignum.decimalPlaces(6).toString())
  return `${formattedAmount} ${token.symbol}`
}

/**
 * This function returns complete formatted value for a local (fiat) amount when it is being a
 * converted value (in "ExchangeAmount" element).
 */
export function getDisplayLocalAmount(
  bignum: BigNumber | null,
  localCurrencySymbol: LocalCurrencySymbol
) {
  const { decimalSeparator } = getNumberFormatSettings()
  if (bignum === null || bignum.isZero()) {
    return ''
  }

  if (bignum.isLessThan(0.000001)) {
    return `<${localCurrencySymbol}0${decimalSeparator}000001`
  }

  const roundedAmount = roundFiatValue(bignum)
  const formattedAmount = formatNumber(roundedAmount.toString())
  return `${localCurrencySymbol}${formattedAmount}`
}

/**
 * This hook is only used in tandem with `TokenEnterAmount` component. It provides all the necessary
 * variables and handlers that manage "enter amount" functionality, including rate calculations.
 */
export function useEnterAmount(props: {
  token: TokenBalance | undefined
  inputRef: React.RefObject<RNTextInput>
  onHandleAmountInputChange?(amount: string): void
}) {
  /**
   * This field is formatted for processing purpose. It is a lot easier to process a number formatted
   * in a single format, rather than writing different logic for various combinations of decimal
   * and grouping separators. The format is "1234.5678".
   */
  const [amount, setAmount] = useState('')
  const [amountType, setAmountType] = useState<AmountEnteredIn>('token')

  // This should never be null, just adding a default to make TS happy
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const usdToLocalRate = useSelector(usdToLocalCurrencyRateSelector)

  /**
   * This field includes all the necessary processed derived state. It is recalculated once whenever
   * the input amount changes. Please, add new processed/calculated values to this variable.
   *
   * This field consists of two values: token and local. Both values represent calculated values for the
   * corresponding amount type. Whenever we change token amount - we  need to recalculate both token and
   * local amounts. Each object consists of:
   *   - `bignum` - this is a BigNumber representation of the "amount" field. Necessary for easier
   *     condition checks and various processing things.
   *   - `displayAmount` - this is a read-only component-friendly value that contains all of the necessary
   *     formatting, including: grouping, decimals, token symbol/fiat sign, small amounts format. This
   *     value is only necessary to be passed to TokenEnterAmount component fields as:
   *       - `token.displayAmount` -> `tokenDisplayAmount`
   *       - `local.displayAmount` -> `localDisplayAmount`
   */
  const processedAmounts = useMemo(() => {
    const { decimalSeparator } = getNumberFormatSettings()

    if (!props.token) {
      return {
        token: { bignum: null, displayAmount: '' },
        local: { bignum: null, displayAmount: '' },
      }
    }

    if (amountType === 'token') {
      const parsedTokenAmount = amount === '' ? null : parseInputAmount(amount)

      const tokenToLocal = convertTokenToLocalAmount({
        tokenAmount: parsedTokenAmount,
        tokenInfo: props.token,
        usdToLocalRate,
      })

      return {
        token: {
          bignum: parsedTokenAmount,
          displayAmount: getDisplayTokenAmount(parsedTokenAmount, props.token),
        },
        local: {
          bignum: tokenToLocal,
          displayAmount: getDisplayLocalAmount(tokenToLocal, localCurrencySymbol),
        },
      }
    }

    /**
     * At this point, we can be sure that we are processing local (fiat) input.
     */
    const parsedLocalAmount = amount === '' ? null : parseInputAmount(amount)

    const localToToken = convertLocalToTokenAmount({
      localAmount: parsedLocalAmount,
      tokenInfo: props.token,
      usdToLocalRate,
    })

    const convertedLocalToToken =
      localToToken && localToToken.gt(0)
        ? // no group separator for token amount, round to token.decimals and strip trailing zeros
          localToToken
            .toFormat(props.token.decimals, { decimalSeparator })
            .replace(new RegExp(`[${decimalSeparator}]?0+$`), '')
        : ''

    const parsedTokenAmount =
      amount === '' ? null : parseInputAmount(convertedLocalToToken, decimalSeparator)
    const balanceInLocal = convertTokenToLocalAmount({
      tokenAmount: props.token.balance,
      tokenInfo: props.token,
      usdToLocalRate,
    })?.decimalPlaces(2)

    const isMaxLocalAmount =
      parsedLocalAmount && balanceInLocal && balanceInLocal.eq(parsedLocalAmount)
    const tokenAmount = isMaxLocalAmount ? props.token.balance : parsedTokenAmount

    return {
      token: {
        bignum: tokenAmount,
        displayAmount: getDisplayTokenAmount(tokenAmount, props.token),
      },
      local: {
        bignum: parsedLocalAmount,
        displayAmount: getDisplayLocalAmount(parsedLocalAmount, localCurrencySymbol),
      },
    }
  }, [amount, amountType, localCurrencySymbol, usdToLocalRate, props.token])

  /**
   * @returns New amount type
   */
  function handleToggleAmountType(forcedAmountType?: AmountEnteredIn) {
    if (!props.token) return amountType

    const newAmountType = forcedAmountType ?? (amountType === 'local' ? 'token' : 'local')
    setAmountType(newAmountType)
    setAmount(
      newAmountType === 'local'
        ? processedAmounts.local.bignum?.toFixed(2) || ''
        : processedAmounts.token.bignum?.decimalPlaces(props.token.decimals).toString() || ''
    )
    return newAmountType
  }

  function handleAmountInputChange(val: string) {
    let value = val.startsWith(localCurrencySymbol) ? val.slice(localCurrencySymbol.length) : val
    value = unformatNumberForProcessing(value)
    value = value.startsWith('.') ? `0${value}` : value

    if (!value || !props.token) {
      setAmount('')
      props.onHandleAmountInputChange?.('')
      return
    }

    // only allow numbers, one decimal separator and 2 decimals
    const localAmountRegex = new RegExp(`^(\\d+([.])?\\d{0,2}|[.]\\d{0,2}|[.])$`)
    // only allow numbers, one decimal separator and amount of decimals equal to token.decimals
    const tokenAmountRegex = new RegExp(
      `^(?:\\d+[.]?\\d{0,${props.token.decimals}}|[.]\\d{0,${props.token.decimals}}|[.])$`
    )

    const isValidTokenAmount = amountType === 'token' && value.match(tokenAmountRegex)
    const isValidLocalAmount = amountType === 'local' && value.match(localAmountRegex)
    if (isValidTokenAmount || isValidLocalAmount) {
      setAmount(value)
      props.onHandleAmountInputChange?.(value)
      return
    }
  }

  /**
   * This function is intended for a full value replacement. This is mostly useful for the swap
   * flow when the "To" amount is always calculated by the API and have to be replaced while
   * keeping the intended number formatting logic.
   */
  function replaceAmount(value: string) {
    if (!props.token) return

    if (value === '') {
      setAmount('')
      return
    }

    const numericValue = new BigNumber(value)
    const rawValue = numericValue.isNaN()
      ? unformatNumberForProcessing(value)
      : numericValue.toFixed()

    const roundedAmount =
      amountType === 'token'
        ? new BigNumber(rawValue).decimalPlaces(props.token.decimals).toString()
        : roundFiatValue(
            convertTokenToLocalAmount({
              tokenAmount: new BigNumber(rawValue),
              tokenInfo: props.token,
              usdToLocalRate,
            })
          )
    setAmount(roundedAmount)
  }

  function handleSelectPercentageAmount(percentage: number) {
    if (!props.token) return
    if (percentage <= 0 || percentage > 1) return

    const percentageAmount = props.token.balance.multipliedBy(percentage)
    const newAmount =
      amountType === 'token'
        ? percentageAmount.decimalPlaces(props.token.decimals).toString()
        : roundFiatValue(
            convertTokenToLocalAmount({
              tokenAmount: percentageAmount,
              tokenInfo: props.token,
              usdToLocalRate,
            })
          )

    if (!newAmount) return

    setAmount(newAmount)
  }

  return {
    amount,
    amountType,
    processedAmounts,
    replaceAmount,
    handleToggleAmountType,
    handleAmountInputChange,
    handleSelectPercentageAmount,
  }
}

export default function TokenEnterAmount({
  token,
  inputValue,
  tokenAmount,
  localAmount,
  amountType,
  inputRef,
  inputStyle,
  autoFocus,
  testID,
  onInputChange,
  toggleAmountType,
  onOpenTokenPicker,
  loading,
}: {
  token?: TokenBalance
  inputValue: string
  tokenAmount: string
  localAmount: string
  amountType: AmountEnteredIn
  inputRef: React.MutableRefObject<RNTextInput | null>
  loading?: boolean
  inputStyle?: StyleProp<TextStyle>
  autoFocus?: boolean
  testID?: string
  onInputChange?(value: string): void
  toggleAmountType?(): void
  onOpenTokenPicker?(): void
}) {
  const { t } = useTranslation()
  /**
   * startPosition and inputRef variables exist to ensure TextInput displays the start of the value
   * for long values on Android: https://github.com/facebook/react-native/issues/14845
   */
  const [startPosition, setStartPosition] = useState<number | undefined>(0)
  // this should never be null, just adding a default to make TS happy
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD

  const placeholder = useMemo(() => {
    const { decimalSeparator } = getNumberFormatSettings()
    return {
      token: new BigNumber(0).toFormat(2),
      local: `${localCurrencySymbol}${new BigNumber(0).toFormat(2).replaceAll('.', decimalSeparator)}`,
    }
  }, [localCurrencySymbol])

  const formattedInputValue = useMemo(() => {
    const formattedNumber = formatNumber(inputValue)
    if (amountType === 'token') return formattedNumber
    return formattedNumber !== '' ? `${localCurrencySymbol}${formattedNumber}` : ''
  }, [inputValue, amountType, localCurrencySymbol])

  const handleSetStartPosition = (value?: number) => {
    if (Platform.OS === 'android') {
      setStartPosition(value)
    }
  }

  return (
    <View testID={testID}>
      <Touchable
        borderless
        onPress={onOpenTokenPicker}
        disabled={!onOpenTokenPicker}
        testID={`${testID}/TokenSelect`}
        borderRadius={{
          borderTopLeftRadius: BORDER_RADIUS,
          borderTopRightRadius: BORDER_RADIUS,
          borderBottomLeftRadius: token ? 0 : BORDER_RADIUS,
          borderBottomRightRadius: token ? 0 : BORDER_RADIUS,
        }}
      >
        <View
          style={[
            styles.rowContainer,
            {
              borderBottomLeftRadius: token ? 0 : BORDER_RADIUS,
              borderBottomRightRadius: token ? 0 : BORDER_RADIUS,
              borderBottomColor: Colors.borderSecondary,
            },
          ]}
        >
          <View style={styles.tokenInfoContainer}>
            {token ? (
              <>
                <TokenIcon token={token} size={IconSize.MEDIUM} />

                <View style={styles.tokenNameAndAvailable}>
                  <Text style={styles.tokenName} testID={`${testID}/TokenName`}>
                    {t('tokenEnterAmount.tokenDescription', {
                      tokenName: token.symbol,
                      tokenNetwork: NETWORK_NAMES[token.networkId],
                    })}
                  </Text>
                  <Text style={styles.tokenBalance} testID={`${testID}/TokenBalance`}>
                    <Trans i18nKey="tokenEnterAmount.availableBalance">
                      <TokenDisplay
                        tokenId={token.tokenId}
                        amount={token.balance}
                        showLocalAmount={false}
                      />
                    </Trans>
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.placeholderText}>{t('tokenEnterAmount.selectToken')}</Text>
            )}
          </View>

          {onOpenTokenPicker && <DownArrowIcon height={24} color={Colors.contentSecondary} />}
        </View>
      </Touchable>
      {token && (
        <View>
          <View
            style={[
              styles.rowContainer,
              { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 },
            ]}
          >
            <TextInput
              forwardedRef={inputRef}
              onChangeText={(value) => {
                handleSetStartPosition(undefined)
                onInputChange?.(value)
              }}
              value={formattedInputValue}
              placeholderTextColor={Colors.inactive}
              placeholder={amountType === 'token' ? placeholder.token : placeholder.local}
              keyboardType="decimal-pad"
              // Work around for RN issue with Samsung keyboards
              // https://github.com/facebook/react-native/issues/22005
              autoCapitalize="words"
              autoFocus={autoFocus}
              // unset lineHeight to allow ellipsis on long inputs on iOS. For
              // android, ellipses doesn't work and unsetting line height causes
              // height changes when amount is entered
              inputStyle={[
                styles.primaryAmountText,
                inputStyle,
                Platform.select({ ios: { lineHeight: undefined } }),
              ]}
              style={styles.input}
              onBlur={() => {
                handleSetStartPosition(0)
              }}
              onFocus={() => {
                const withCurrency = amountType === 'local' ? 1 : 0
                handleSetStartPosition((inputValue?.length ?? 0) + withCurrency)
              }}
              onSelectionChange={() => {
                handleSetStartPosition(undefined)
              }}
              selection={
                Platform.OS === 'android' && typeof startPosition === 'number'
                  ? { start: startPosition }
                  : undefined
              }
              showClearButton={false}
              editable={!!onInputChange}
              testID={`${testID}/TokenAmountInput`}
            />

            {token.priceUsd ? (
              <>
                {toggleAmountType && (
                  <Touchable
                    onPress={() => {
                      toggleAmountType()
                    }}
                    style={styles.swapArrowContainer}
                    testID={`${testID}/SwitchTokens`}
                    hitSlop={variables.iconHitslop}
                  >
                    <SwapArrows color={Colors.contentSecondary} size={24} />
                  </Touchable>
                )}

                <Text
                  numberOfLines={1}
                  style={[styles.secondaryAmountText, { flex: 0, textAlign: 'right' }]}
                  testID={`${testID}/ExchangeAmount`}
                >
                  {amountType === 'token'
                    ? `${APPROX_SYMBOL} ${localAmount ? localAmount : placeholder.local}`
                    : `${APPROX_SYMBOL} ${tokenAmount ? tokenAmount : placeholder.token}`}
                </Text>
              </>
            ) : (
              <Text style={styles.secondaryAmountText}>
                {t('tokenEnterAmount.fiatPriceUnavailable')}
              </Text>
            )}
          </View>

          {loading && (
            <View testID={`${testID}/Loader`} style={styles.loader}>
              <SkeletonPlaceholder>
                <View style={{ height: '100%', width: '100%' }} />
              </SkeletonPlaceholder>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  rowContainer: {
    borderWidth: 1,
    borderColor: Colors.borderSecondary,
    borderRadius: BORDER_RADIUS,
    padding: Spacing.Regular16,
    backgroundColor: Colors.backgroundSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.Tiny4,
  },
  tokenInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.Smallest8,
    flexShrink: 1,
  },
  tokenNameAndAvailable: {
    flexShrink: 1,
  },
  tokenName: {
    ...typeScale.labelMedium,
  },
  tokenBalance: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
  primaryAmountText: {
    ...typeScale.titleMedium,
    paddingTop: 0,
    paddingBottom: 0,
  },
  secondaryAmountText: {
    ...typeScale.bodyMedium,
    color: Colors.contentSecondary,
  },
  placeholderText: {
    ...typeScale.labelMedium,
    paddingHorizontal: 4,
    color: Colors.contentSecondary,
  },
  swapArrowContainer: {
    transform: [{ rotate: '90deg' }],
  },
  loader: {
    padding: Spacing.Regular16,
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
  },
})
