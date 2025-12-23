import React, { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import type { BottomSheetModalRefType } from 'src/components/BottomSheet'
import BottomSheet from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

export default function InfoBottomSheet(props: {
  forwardedRef: React.RefObject<BottomSheetModalRefType | null>
  title: string
  description?: string
  children?: React.ReactNode
  testID?: string
}) {
  const { t } = useTranslation()

  return (
    <BottomSheet
      forwardedRef={props.forwardedRef}
      title={props.title}
      description={props.description}
      testId={props.testID}
    >
      {!!props.children && (
        <View style={styles.content} testID={`${props.testID}/Content`}>
          {props.children}
        </View>
      )}
      <Button
        style={styles.dismissButton}
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

export function InfoBottomSheetParagraph(props: { children: ReactNode; testID?: string }) {
  return (
    <Text style={styles.paragraph} testID={props.testID}>
      {props.children}
    </Text>
  )
}

export function InfoBottomSheetContentBlock(props: { children: ReactNode; testID?: string }) {
  return (
    <View style={styles.contentBlock} testID={props.testID}>
      {props.children}
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.Thick24,
  },
  dismissButton: {
    marginTop: Spacing.Thick24,
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
})
