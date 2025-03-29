import { BigNumber } from 'bignumber.js'
import React, { RefObject } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import BottomSheet, { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import ArrowRightThick from 'src/icons/ArrowRightThick'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import { useSelector } from 'src/redux/hooks'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import { TokenBalance } from 'src/tokens/slice'

export default function UnfavorableRateBottomSheet({
  forwardedRef,
  onConfirm,
  onCancel,
  fromTokenAmount,
  fromLocalAmount,
  toTokenAmount,
  toLocalAmount,
  fromTokenInfo,
  toTokenInfo,
}: {
  forwardedRef: RefObject<BottomSheetModalRefType>
  onConfirm: () => void
  onCancel: () => void
  fromTokenAmount: BigNumber | null
  fromLocalAmount: BigNumber | null
  toTokenAmount: BigNumber | null
  toLocalAmount: BigNumber | null
  fromTokenInfo: TokenBalance | undefined
  toTokenInfo: TokenBalance | undefined
}) {
  const { t } = useTranslation()

  const localCurrencySymbol = useSelector(getLocalCurrencySymbol)

  if (!fromTokenInfo || !toTokenInfo || !fromTokenAmount || !toTokenAmount) {
    // should never happen
    return null
  }

  return (
    <BottomSheet
      forwardedRef={forwardedRef}
      title={t('swapUnfavorableRateBottomSheet.title')}
      description={t('swapUnfavorableRateBottomSheet.description')}
      testId="UnfavorableSwapBottomSheet"
    >
      {/* TODO: use new TokenDisplay component proposed in https://github.com/divvi-xyz/divvi-mobile/pull/181 */}
      <View style={styles.amountContainer}>
        <Text style={styles.tokenAmount} testID="FromAmount">
          <Trans
            i18nKey={'tokenAndLocalAmount'}
            context={fromLocalAmount ? undefined : 'noFiatPrice'}
            tOptions={{
              tokenAmount: `${formatValueToDisplay(fromTokenAmount.abs())}`,
              localAmount: fromLocalAmount ? formatValueToDisplay(fromLocalAmount) : '',
              tokenSymbol: fromTokenInfo?.symbol,
              localCurrencySymbol,
            }}
          >
            <Text style={styles.localAmount} />
          </Trans>
        </Text>
        <ArrowRightThick />
        <Text style={styles.tokenAmount} testID="ToAmount">
          <Trans
            i18nKey={'tokenAndLocalAmount'}
            context={toLocalAmount ? undefined : 'noFiatPrice'}
            tOptions={{
              tokenAmount: `${formatValueToDisplay(toTokenAmount.abs())}`,
              localAmount: toLocalAmount ? formatValueToDisplay(toLocalAmount) : '',
              tokenSymbol: toTokenInfo?.symbol,
              localCurrencySymbol,
            }}
          >
            <Text style={styles.localAmount} />
          </Trans>
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          onPress={() => {
            forwardedRef.current?.close()
            onCancel()
          }}
          type={BtnTypes.PRIMARY}
          size={BtnSizes.FULL}
          text={t('swapUnfavorableRateBottomSheet.cancel')}
        />
        <Button
          onPress={() => {
            forwardedRef.current?.close()
            onConfirm()
          }}
          type={BtnTypes.SECONDARY}
          size={BtnSizes.FULL}
          text={t('swapUnfavorableRateBottomSheet.confirm')}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  amountContainer: {
    flexDirection: 'row',
    marginVertical: Spacing.Thick24,
    gap: Spacing.Smallest8,
    alignItems: 'center',
  },
  tokenAmount: {
    ...typeScale.labelSemiBoldSmall,
  },
  localAmount: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
  },
  buttonContainer: {
    gap: Spacing.Small12,
  },
})
