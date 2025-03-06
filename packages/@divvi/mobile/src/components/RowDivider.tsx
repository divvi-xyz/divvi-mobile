import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import themeColors, { type ColorValue } from 'src/styles/colors'
import { Spacing } from 'src/styles/styles'

export interface Props {
  backgroundColor?: ColorValue
  marginVertical?: Spacing | null
  testID?: string
}

export default function RowDivider({
  backgroundColor = themeColors.borderPrimary,
  marginVertical = Spacing.Regular16,
  testID,
}: Props) {
  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor, marginVertical: marginVertical ?? undefined }]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    height: 1,
    width: '100%',
  },
})
