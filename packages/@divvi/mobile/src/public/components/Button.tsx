import React from 'react'
import BaseButton, { BtnSizes, BtnTypes, ButtonProps, TextSizes } from 'src/components/Button'

export { BtnSizes, BtnTypes, TextSizes }

export function Button(props: ButtonProps) {
  return <BaseButton {...props} />
}
