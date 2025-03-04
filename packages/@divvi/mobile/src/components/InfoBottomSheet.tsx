import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import BottomSheet from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { Spacing } from 'src/styles/styles'

export default function InfoBottomSheet(props: {
  forwardedRef: React.RefObject<BottomSheetModalRefType>
  title: string
  children: React.ReactNode
  testID?: string
}) {
  const { t } = useTranslation()

  return (
    <BottomSheet forwardedRef={props.forwardedRef} title={props.title} testId={props.testID}>
      <View style={styles.content}>{props.children}</View>
      <Button
        type={BtnTypes.SECONDARY}
        size={BtnSizes.FULL}
        text={t('bottomSheetDismissButton')}
        onPress={() => props.forwardedRef.current?.close()}
      />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.Smallest8,
    marginBottom: Spacing.Thick24,
  },
})
