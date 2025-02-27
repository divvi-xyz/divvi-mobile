import React from 'react'
import BaseButton, { BtnSizes, BtnTypes, ButtonProps, TextSizes } from 'src/components/Button'

export type ButtonSize = `${BtnSizes}`
export type ButtonType = `${BtnTypes}`
export type ButtonTextSize = `${TextSizes}`

export interface CustomButtonProps
  extends Omit<ButtonProps, 'size' | 'type' | 'textSize'> {
  size?: ButtonSize
  type?: ButtonType
  textSize?: ButtonTextSize
}

export function Button(props: CustomButtonProps) {
  return (
    <BaseButton
      {...props}
      type={props.type as BtnTypes}
      size={props.size as BtnSizes}
      textSize={props.textSize as TextSizes}
    />
  )
}
