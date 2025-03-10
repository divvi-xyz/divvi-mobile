import BigNumber from 'bignumber.js'
import React, { useMemo, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import BackButton from 'src/components/BackButton'
import ContactCircle from 'src/components/ContactCircle'
import CustomHeader from 'src/components/header/CustomHeader'
import SkeletonPlaceholder from 'src/components/SkeletonPlaceholder'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import { APPROX_SYMBOL } from 'src/components/TokenEnterAmount'
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
              <Text
                style={styles.reviewSummaryItemSecondaryValue}
                testID={`${props.testID}/SecondaryValue`}
              >
                {props.secondaryValue}
              </Text>
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
        <Text style={[styles.reviewDetailsItemCaption, { color: captionColor || color }]}>
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

type ReviewDetailsItemTotalValueProps = {
  approx?: boolean
  tokenInfo: TokenBalance | undefined
  feeTokenInfo: TokenBalance | undefined
  tokenAmount: BigNumber | null
  localAmount: BigNumber | null
  feeTokenAmount: BigNumber | undefined
  feeLocalAmount: BigNumber | null
  localCurrencySymbol: LocalCurrencySymbol
}

export function ReviewDetailsItemTotalValue({
  approx,
  tokenInfo,
  feeTokenInfo,
  tokenAmount,
  localAmount,
  feeTokenAmount,
  feeLocalAmount,
  localCurrencySymbol,
}: ReviewDetailsItemTotalValueProps) {
  const { t } = useTranslation()
  const withApprox = approx ? `${APPROX_SYMBOL} ` : ''

  // if there are not token info or token amount then it should not even be possible to get to the review screen
  if (!tokenInfo || !tokenAmount) {
    return null
  }

  // if there are no fees then just format token amount
  if (!feeTokenInfo || !feeTokenAmount) {
    // if fiat amount is availabke then show both token and fiat amounts
    if (localAmount) {
      return (
        <ReviewDetailsItemTokenValue
          approx={approx}
          tokenAmount={tokenAmount}
          localAmount={localAmount}
          tokenInfo={tokenInfo}
          localCurrencySymbol={localCurrencySymbol}
        >
          <Text style={styles.totalPlusFeesLocalAmount} />
        </ReviewDetailsItemTokenValue>
      )
    }

    // otherwise only show token amount

    return withApprox
      ? t('tokenAmountApprox', {
          tokenAmount: formatValueToDisplay(tokenAmount),
          tokenSymbol: tokenInfo.symbol,
        })
      : t('tokenAmount', {
          tokenAmount: formatValueToDisplay(tokenAmount),
          tokenSymbol: tokenInfo.symbol,
        })
  }

  const sameToken = tokenInfo.tokenId === feeTokenInfo.tokenId
  const haveLocalPrice = !!localAmount && !!feeLocalAmount

  // if single token and have local price - return token and local amounts
  if (sameToken && haveLocalPrice) {
    return (
      <ReviewDetailsItemTokenValue
        approx={approx}
        tokenAmount={tokenAmount.plus(feeTokenAmount)}
        localAmount={localAmount.plus(feeLocalAmount)}
        tokenInfo={tokenInfo}
        localCurrencySymbol={localCurrencySymbol}
      >
        <Text style={styles.totalPlusFeesLocalAmount} />
      </ReviewDetailsItemTokenValue>
    )
  }

  // if single token but no local price - return token amount
  if (sameToken && !haveLocalPrice) {
    return withApprox
      ? t('tokenAmountApprox', {
          tokenAmount: formatValueToDisplay(tokenAmount.plus(feeTokenAmount)),
          tokenSymbol: tokenInfo.symbol,
        })
      : t('tokenAmount', {
          tokenAmount: formatValueToDisplay(tokenAmount.plus(feeTokenAmount)),
          tokenSymbol: tokenInfo.symbol,
        })
  }

  // if multiple tokens and have local price - return local amount
  if (!sameToken && haveLocalPrice) {
    return withApprox
      ? t('localAmountApprox', {
          localAmount: formatValueToDisplay(localAmount.plus(feeLocalAmount)),
          localCurrencySymbol,
        })
      : t('localAmount', {
          localAmount: formatValueToDisplay(localAmount.plus(feeLocalAmount)),
          localCurrencySymbol,
        })
  }

  // otherwise there are multiple tokens with no local prices so return multiple token amounts
  return t('reviewTransaction.multipleTokensWithPlusSign', {
    amount1: formatValueToDisplay(tokenAmount),
    symbol1: tokenInfo.symbol,
    amount2: formatValueToDisplay(feeTokenAmount),
    symbol2: feeTokenInfo.symbol,
  })
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
  totalPlusFeesLocalAmount: {
    color: colors.contentSecondary,
  },
})
