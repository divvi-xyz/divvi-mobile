import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import themeColors, { type ColorValue } from 'src/styles/colors'
import { Spacing } from 'src/styles/styles'

export interface Props {
  color?: ColorValue
  spacing?: Spacing
  testID?: string
}

export default function RowDivider({
  color = themeColors.borderPrimary,
  spacing = Spacing.Regular16,
  testID,
}: Props) {
  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: color, marginVertical: spacing }]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    height: 1,
    width: '100%',
  },
})
