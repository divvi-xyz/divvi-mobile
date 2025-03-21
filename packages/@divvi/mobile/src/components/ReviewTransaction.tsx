import BigNumber from 'bignumber.js'
import { groupBy } from 'lodash'
import React, { useMemo, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import BackButton from 'src/components/BackButton'
import ContactCircle from 'src/components/ContactCircle'
import CustomHeader from 'src/components/header/CustomHeader'
import SkeletonPlaceholder from 'src/components/SkeletonPlaceholder'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import Touchable from 'src/components/Touchable'
import InfoIcon from 'src/icons/InfoIcon'
import WalletIcon from 'src/icons/navigator/Wallet'
import PhoneIcon from 'src/icons/Phone'
import UserIcon from 'src/icons/User'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { type Recipient } from 'src/recipients/recipient'
import colors, { type ColorValue } from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'
import { TokenBalance } from 'src/tokens/slice'
import Logger from 'src/utils/Logger'

export function ReviewTransaction(props: {
  title: string
  children: ReactNode
  headerLeftButton?: ReactNode
  testID?: string
}) {
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView style={styles.safeAreaView} edges={['top']} testID={props.testID}>
      <CustomHeader
        style={styles.header}
        left={props.headerLeftButton ?? <BackButton />}
        title={props.title}
      />
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          paddingBottom: Math.max(insets.bottom, Spacing.Thick24),
        }}
      >
        <View style={styles.reviewContainer}>{props.children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}

export function ReviewContent(props: { children: ReactNode }) {
  return <View style={styles.reviewContent}>{props.children}</View>
}

export function ReviewSummary(props: { children: ReactNode }) {
  return <View style={styles.reviewSummary}>{props.children}</View>
}

export function ReviewSummaryItem(props: {
  label: string
  icon: ReactNode
  primaryValue: string
  secondaryValue?: string
  testID?: string
  onPress?: () => void
}) {
  return (
    <View style={styles.reviewSummaryItem} testID={props.testID}>
      <Text style={styles.reviewSummaryItemLabel} testID={`${props.testID}/Label`}>
        {props.label}
      </Text>
      <Touchable
        style={styles.reviewSummaryItemContent}
        onPress={props.onPress}
        disabled={!props.onPress}
      >
        <>
          {props.icon}
          <View style={styles.reviewSummaryItemValuesWrapper}>
            <Text
              style={styles.reviewSummaryItemPrimaryValue}
              testID={`${props.testID}/PrimaryValue`}
            >
              {props.primaryValue}
            </Text>

            {!!props.secondaryValue && (
              <View style={styles.reviewSummaryItemSecondaryValueWrapper}>
                <Text
                  style={styles.reviewSummaryItemSecondaryValue}
                  testID={`${props.testID}/SecondaryValue`}
                >
                  {props.secondaryValue}
                </Text>
                {!!props.onPress && <InfoIcon size={14} color={colors.contentSecondary} />}
              </View>
            )}
          </View>
        </>
      </Touchable>
    </View>
  )
}

export function ReviewSummaryItemContact({
  testID,
  recipient,
}: {
  testID?: string
  recipient: Recipient
}) {
  const { t } = useTranslation()
  const contact = useMemo(() => {
    const phone = recipient.displayNumber || recipient.e164PhoneNumber
    if (recipient.name) {
      return { title: recipient.name, subtitle: phone, icon: UserIcon }
    }

    if (phone) {
      return { title: phone, icon: PhoneIcon }
    }

    if (recipient.address) {
      return { title: recipient.address, icon: WalletIcon }
    }
  }, [recipient])

  // This should never happen
  if (!contact) {
    Logger.error(
      'ReviewSummaryItemContact',
      `Transaction review could not render a contact item for recipient`
    )
    return null
  }

  return (
    <ReviewSummaryItem
      testID={testID}
      label={t('to')}
      primaryValue={contact.title}
      secondaryValue={contact.subtitle}
      icon={
        <ContactCircle
          size={32}
          backgroundColor={colors.backgroundTertiary}
          foregroundColor={colors.contentPrimary}
          recipient={recipient}
          DefaultIcon={contact.icon}
        />
      }
    />
  )
}

export function ReviewDetails(props: { children: ReactNode }) {
  return <View style={styles.reviewDetails}>{props.children}</View>
}

type WithCaption =
  | { caption: ReactNode; captionColor?: ColorValue }
  | { caption?: never; captionColor?: never }

export type ReviewDetailsItemProps = {
  label: ReactNode
  fontSize?: 'small' | 'medium'
  color?: ColorValue
  isLoading?: boolean
  testID?: string
  strikeThrough?: boolean
  onInfoPress?: () => void
} & ReviewDetailsItemValueProps &
  WithCaption

export function ReviewDetailsItem(props: ReviewDetailsItemProps) {
  const {
    label,
    fontSize = 'medium',
    color = colors.contentPrimary,
    isLoading,
    testID,
    strikeThrough,
    caption,
    captionColor,
    onInfoPress,
    ...valueProps
  } = props

  const fontStyle = useMemo((): StyleProp<TextStyle> => {
    const isTotal = props.type === 'total-token-amount'
    if (fontSize === 'small') {
      return isTotal ? typeScale.labelSemiBoldSmall : typeScale.bodySmall
    }
    return isTotal ? typeScale.labelSemiBoldMedium : typeScale.bodyMedium
  }, [fontSize])

  return (
    <View testID={testID}>
      <View style={styles.reviewDetailsItem}>
        <Touchable
          style={styles.reviewDetailsItemLabel}
          onPress={onInfoPress}
          disabled={!onInfoPress || isLoading}
        >
          <>
            <Text style={[fontStyle, { color }]} testID={`${testID}/Label`}>
              {label}
            </Text>
            {onInfoPress && <InfoIcon color={color} testID={`${testID}/InfoIcon`} />}
          </>
        </Touchable>
        <View style={styles.reviewDetailsItemValue}>
          {isLoading ? (
            <View testID={`${testID}/Loader`} style={styles.loaderContainer}>
              <SkeletonPlaceholder>
                <View style={styles.loader} />
              </SkeletonPlaceholder>
            </View>
          ) : (
            <Text
              style={[
                styles.reviewDetailsItemValueText,
                fontStyle,
                { color, textDecorationLine: strikeThrough ? 'line-through' : undefined },
              ]}
              testID={`${testID}/Value`}
            >
              <ReviewDetailsItemValue {...valueProps} />
            </Text>
          )}
        </View>
      </View>

      {!!caption && (
        <Text
          style={[styles.reviewDetailsItemCaption, { color: captionColor || color }]}
          testID={`${testID}/Caption`}
        >
          {caption}
        </Text>
      )}
    </View>
  )
}

type ReviewDetailsItemTokenValueProps = {
  tokenAmount: BigNumber | undefined | null
  localAmount: BigNumber | undefined | null
  tokenInfo: TokenBalance | undefined | null
  localCurrencySymbol: LocalCurrencySymbol
  approx?: boolean
  children?: ReactNode
}

function ReviewDetailsItemTokenValue(props: ReviewDetailsItemTokenValueProps) {
  if (!props.tokenAmount) return null

  return (
    <Trans
      i18nKey={props.approx ? 'tokenAndLocalAmountApprox' : 'tokenAndLocalAmount'}
      context={props.localAmount?.gt(0) ? undefined : 'noFiatPrice'}
      tOptions={{
        tokenAmount: formatValueToDisplay(props.tokenAmount),
        localAmount: props.localAmount ? formatValueToDisplay(props.localAmount) : '',
        tokenSymbol: props.tokenInfo?.symbol,
        localCurrencySymbol: props.localCurrencySymbol,
      }}
    >
      {props.children ?? <Text />}
    </Trans>
  )
}

type ReviewDetailsItemValueProps =
  | { type: 'plain-text'; value: ReactNode }
  | ({ type: 'token-amount' } & ReviewDetailsItemTokenValueProps)
  | ({ type: 'total-token-amount' } & ReviewDetailsItemTotalValueProps)

function ReviewDetailsItemValue(props: ReviewDetailsItemValueProps) {
  if (props.type === 'plain-text') return props.value
  if (props.type === 'token-amount') return <ReviewDetailsItemTokenValue {...props} />
  if (props.type === 'total-token-amount') return <ReviewDetailsItemTotalValue {...props} />
  return null
}

export function ReviewFooter(props: { children: ReactNode }) {
  return <View style={styles.reviewFooter}>{props.children}</View>
}

type Amount = {
  isDeductible?: boolean
  tokenInfo: TokenBalance | null | undefined
  tokenAmount: BigNumber | null | undefined
  localAmount: BigNumber | null | undefined
}

type FilteredAmount = {
  isDeductible?: boolean
  tokenInfo: TokenBalance
  tokenAmount: BigNumber
  localAmount: BigNumber | null | undefined
}

type ReviewDetailsItemTotalValueProps = {
  approx?: boolean
  localCurrencySymbol: LocalCurrencySymbol
  amounts: Amount[]
}

/**
 * This component doesn't do any memoization as the `amounts` array is always expected
 * to be really small (< 10 items) so the overhead of running array operations on every
 * re-render should be negligible.
 */
export function ReviewDetailsItemTotalValue({
  approx,
  amounts,
  localCurrencySymbol,
}: ReviewDetailsItemTotalValueProps) {
  const { t } = useTranslation()

  // filter out "broken" amounts with no token info or token amount
  const filteredAmounts = amounts.filter(
    (amount) => !!amount.tokenInfo && !!amount.tokenAmount
  ) as FilteredAmount[]

  // if all the amounts are "broken" (which should never happen) – then don't return anything
  if (filteredAmounts.length === 0) {
    return null
  }

  // if there's a single amount then no calculations needed and we show it as is
  if (filteredAmounts.length === 1) {
    const amount = filteredAmounts[0]

    // if fiat amount is available then show full amount
    if (amount.localAmount) {
      return (
        <ReviewDetailsItemTokenValue
          approx={approx}
          tokenAmount={amount.tokenAmount}
          localAmount={amount.localAmount}
          tokenInfo={amount.tokenInfo}
          localCurrencySymbol={localCurrencySymbol}
        >
          <Text style={styles.totalLocalAmount} />
        </ReviewDetailsItemTokenValue>
      )
    }

    // otherwise only show the token amount
    return approx
      ? t('tokenAmountApprox', {
          tokenAmount: formatValueToDisplay(amount.tokenAmount),
          tokenSymbol: amount.tokenInfo.symbol,
        })
      : t('tokenAmount', {
          tokenAmount: formatValueToDisplay(amount.tokenAmount),
          tokenSymbol: amount.tokenInfo.symbol,
        })
  }

  /**
   * At this point we have more than one token amount. Usually, this is an input amount
   * (e.g. send or earn deposit) and network fee but there can be many more. This implies that
   * there can be various variations of different tokens with variable availability of fiat prices.
   * Based on that, we need to detect the kind of variation and format it accordingly.
   */
  const grouped = groupBy(filteredAmounts, (amount) => amount.tokenInfo.tokenId)
  const tokenIds = Object.keys(grouped)
  const sameToken = tokenIds.length === 1
  const allTokensHaveLocalPrice = filteredAmounts.every((amount) => !!amount.localAmount)

  /**
   * If all the amounts are of the same token and we have a fiat price for it – then format the value
   * to the format like "1.00 USDC ($1.00)".
   */
  if (sameToken && allTokensHaveLocalPrice) {
    const tokenInfo = filteredAmounts[0].tokenInfo
    const tokenAmount = filteredAmounts.reduce(
      (acc, amount) =>
        amount.isDeductible ? acc.minus(amount.tokenAmount) : acc.plus(amount.tokenAmount),
      new BigNumber(0)
    )
    const localAmount = filteredAmounts.reduce(
      (acc, amount) =>
        amount.isDeductible ? acc.minus(amount.localAmount!) : acc.plus(amount.localAmount!),
      new BigNumber(0)
    )

    return (
      <ReviewDetailsItemTokenValue
        approx={approx}
        tokenInfo={tokenInfo}
        localCurrencySymbol={localCurrencySymbol}
        tokenAmount={tokenAmount}
        localAmount={localAmount}
      >
        <Text style={styles.totalLocalAmount} />
      </ReviewDetailsItemTokenValue>
    )
  }

  /**
   * If all the amounts are of the same token but we don't have its fiat price available –
   * then format the value to only show the sum of all token amounts like "1.00 USDC".
   */
  if (sameToken && !allTokensHaveLocalPrice) {
    const tokenSymbol = filteredAmounts[0].tokenInfo.symbol
    const tokenAmount = filteredAmounts.reduce(
      (acc, amount) =>
        amount.isDeductible ? acc.minus(amount.tokenAmount) : acc.plus(amount.tokenAmount),
      new BigNumber(0)
    )
    const displayTokenAmount = formatValueToDisplay(tokenAmount)
    return approx
      ? t('tokenAmountApprox', { tokenAmount: displayTokenAmount, tokenSymbol })
      : t('tokenAmount', { tokenAmount: displayTokenAmount, tokenSymbol })
  }

  /**
   * If there are multiple different tokens and we have fiat prices for all – then format the value
   * to only show the sum of all fiat amounts like "$1.00"
   */
  if (!sameToken && allTokensHaveLocalPrice) {
    const localAmount = filteredAmounts.reduce(
      (acc, amount) =>
        amount.isDeductible ? acc.minus(amount.localAmount!) : acc.plus(amount.localAmount!),
      new BigNumber(0)
    )
    const displayLocalAmount = formatValueToDisplay(localAmount)
    return approx
      ? t('localAmountApprox', { localAmount: displayLocalAmount, localCurrencySymbol })
      : t('localAmount', { localAmount: displayLocalAmount, localCurrencySymbol })
  }

  /**
   * At this point we can be sure that we have multiple different tokens some/all of which don't
   * have available fiat prices – then show the value as a written for of a sum of all the token
   * amounts like "1.00 USDC + 0.0003 ETH"
   */
  return filteredAmounts
    .map((amount) =>
      t('tokenAmount', { tokenAmount: amount.tokenAmount, tokenSymbol: amount.tokenInfo.symbol })
    )
    .join('\n+ ')
}

export function ReviewParagraph(props: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{props.children}</Text>
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: variables.contentPadding,
  },
  reviewContainer: {
    margin: Spacing.Regular16,
    gap: Spacing.Thick24,
    flex: 1,
    justifyContent: 'space-between',
  },
  reviewContent: {
    gap: Spacing.Thick24,
  },
  reviewSummary: {
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: Spacing.Small12,
    backgroundColor: colors.backgroundSecondary,
    padding: Spacing.Regular16,
    gap: Spacing.Regular16,
    flexShrink: 1,
  },
  reviewSummaryItem: {
    gap: Spacing.Tiny4,
  },
  reviewSummaryItemLabel: {
    ...typeScale.labelSmall,
    color: colors.contentSecondary,
  },
  reviewSummaryItemContent: {
    flexDirection: 'row',
    gap: Spacing.Smallest8,
    alignItems: 'center',
  },
  reviewSummaryItemValuesWrapper: {
    flexShrink: 1,
  },
  reviewSummaryItemPrimaryValue: {
    ...typeScale.labelSemiBoldLarge,
  },
  reviewSummaryItemSecondaryValue: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
  },
  reviewSummaryItemSecondaryValueWrapper: {
    flexDirection: 'row',
    gap: Spacing.Smallest8,
    alignItems: 'center',
  },
  reviewDetails: {
    gap: Spacing.Regular16,
    width: '100%',
  },
  reviewDetailsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.Smallest8,
  },
  reviewDetailsItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.Tiny4,
  },
  reviewDetailsItemValue: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  reviewDetailsItemValueText: {
    textAlign: 'right',
  },
  reviewDetailsItemCaption: {
    ...typeScale.labelSmall,
    textAlign: 'right',
  },
  reviewFooter: {
    gap: Spacing.Regular16,
  },
  loaderContainer: {
    height: 20,
    width: 96,
  },
  loader: {
    height: '100%',
    width: '100%',
  },
  totalLocalAmount: {
    color: colors.contentSecondary,
  },
  paragraph: {
    ...typeScale.bodyXSmall,
    color: colors.contentSecondary,
    textAlign: 'center',
  },
})
