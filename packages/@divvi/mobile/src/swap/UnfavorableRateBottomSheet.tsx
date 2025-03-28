import React, { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import BottomSheet, { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import ArrowRightThick from 'src/icons/ArrowRightThick'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

export default function UnfavorableRateBottomSheet({
  forwardedRef,
  onConfirm,
  onCancel,
  fromTokenAmountDisplay,
  fromLocalAmountDisplay,
  toTokenAmountDisplay,
  toLocalAmountDisplay,
}: {
  forwardedRef: RefObject<BottomSheetModalRefType>
  onConfirm: () => void
  onCancel: () => void
  fromTokenAmountDisplay: string
  fromLocalAmountDisplay: string
  toTokenAmountDisplay: string
  toLocalAmountDisplay: string
}) {
  const { t } = useTranslation()

  return (
    <BottomSheet
      forwardedRef={forwardedRef}
      title={t('swapUnfavorableRateBottomSheet.title')}
      description={t('swapUnfavorableRateBottomSheet.description')}
      testId="UnfavorableSwapBottomSheet"
    >
      {/* TODO: use new TokenDisplay component proposed in https://github.com/divvi-xyz/divvi-mobile/pull/181 */}
      <View style={styles.amountContainer} testID="AmountContainer">
        <Text style={styles.tokenAmount}>
          {fromTokenAmountDisplay}
          {!!fromLocalAmountDisplay && (
            <Text style={styles.localAmount}> ({fromLocalAmountDisplay})</Text>
          )}
        </Text>
        <ArrowRightThick />
        <Text style={styles.tokenAmount}>
          {toTokenAmountDisplay}
          {!!toLocalAmountDisplay && (
            <Text style={styles.localAmount}> ({toLocalAmountDisplay})</Text>
          )}
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
