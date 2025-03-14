import React from 'react'
import BaseButton, { BtnSizes, BtnTypes, ButtonProps, TextSizes } from '../../components/Button'

export type ButtonSize = 'small' | 'medium' | 'full'
export type ButtonType = 'primary' | 'secondary' | 'tertiary'
export type ButtonTextSize = 'small' | 'medium'

export interface CustomButtonProps extends Omit<ButtonProps, 'size' | 'type' | 'textSize'> {
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
