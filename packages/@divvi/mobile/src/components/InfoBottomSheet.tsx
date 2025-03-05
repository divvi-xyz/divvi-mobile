import React, { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import BottomSheet from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import themeColors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
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
      <View style={styles.content} testID={`${props.testID}/Content`}>
        {props.children}
      </View>
      <Button
        type={BtnTypes.SECONDARY}
        size={BtnSizes.FULL}
        text={t('bottomSheetDismissButton')}
        onPress={() => props.forwardedRef.current?.close()}
        testID={`${props.testID}/DismissButton`}
      />
    </BottomSheet>
  )
}

export function InfoBottomSheetHeading(props: { children: ReactNode }) {
  return <Text style={styles.heading}>{props.children}</Text>
}

export function InfoBottomSheetParagraph(props: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{props.children}</Text>
}

export function InfoBottomSheetContentBlock(props: { children: ReactNode }) {
  return <View style={styles.contentBlock}>{props.children}</View>
}

export function InfoBottomSheetDivider(props: { testID?: string }) {
  return <View style={styles.divider} testID={props.testID} />
}
const styles = StyleSheet.create({
  content: {
    gap: Spacing.Thick24,
    marginBottom: Spacing.Thick24,
  },
  heading: {
    ...typeScale.labelSemiBoldSmall,
  },
  paragraph: {
    ...typeScale.bodySmall,
  },
  contentBlock: {
    gap: Spacing.Smallest8,
  },
  divider: {
    marginVertical: Spacing.Smallest8,
    height: 1,
    backgroundColor: themeColors.borderPrimary,
    width: '100%',
  },
})
