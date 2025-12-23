import React from 'react'
import { StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'

export default function FormLabel({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}) {
  return <Text style={[styles.container, style]}>{children}</Text>
}

const styles = StyleSheet.create({
  container: {
    ...typeScale.labelSemiBoldSmall,
    color: colors.contentSecondary,
  },
})
