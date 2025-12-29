import React from 'react'
import { TouchableOpacity, View } from 'react-native'

export default function UnfavorableRateBottomSheet({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <View>
      <TouchableOpacity onPress={onCancel} testID="unfavorable-rate-cancel">
        <View />
      </TouchableOpacity>
      <TouchableOpacity onPress={onConfirm} testID="unfavorable-rate-confirm">
        <View />
      </TouchableOpacity>
    </View>
  )
}
