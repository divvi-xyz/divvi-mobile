import React, { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import BottomSheet, { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

export default function UnfavorableRateBottomSheet({
  forwardedRef,
  onConfirm,
  onCancel,
  fromTokenAmount,
  toTokenAmount,
}: {
  forwardedRef: RefObject<BottomSheetModalRefType>
  onConfirm: () => void
  onCancel: () => void
  fromTokenAmount: string // amount with symbol
  toTokenAmount: string // amount with symbol
}) {
  const { t } = useTranslation()

  return (
    <BottomSheet
      forwardedRef={forwardedRef}
      title={t('swapUnfavorableRateBottomSheet.title')}
      description={t('swapUnfavorableRateBottomSheet.description')}
      testId="UnfavorableSwapBottomSheet"
    >
      <Text style={styles.tokenAmount}>{`${fromTokenAmount} → ${toTokenAmount}`}</Text>
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
  tokenAmount: {
    ...typeScale.labelSemiBoldSmall,
    marginVertical: Spacing.Thick24,
  },
  buttonContainer: {
    gap: Spacing.Small12,
  },
})
