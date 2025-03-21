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

function toInternalBtnType(type?: ButtonType): BtnTypes | undefined {
  if (!type) return undefined
  switch (type) {
    case 'primary':
      return BtnTypes.PRIMARY
    case 'secondary':
      return BtnTypes.SECONDARY
    case 'tertiary':
      return BtnTypes.TERTIARY
    default:
      const _exhaustiveCheck: never = type
      return _exhaustiveCheck
  }
}

function toInternalBtnSize(size?: ButtonSize): BtnSizes | undefined {
  if (!size) return undefined
  switch (size) {
    case 'small':
      return BtnSizes.SMALL
    case 'medium':
      return BtnSizes.MEDIUM
    case 'full':
      return BtnSizes.FULL
    default:
      const _exhaustiveCheck: never = size
      return _exhaustiveCheck
  }
}

function toInternalTextSize(size?: ButtonTextSize): TextSizes | undefined {
  if (!size) return undefined
  switch (size) {
    case 'small':
      return TextSizes.SMALL
    case 'medium':
      return TextSizes.MEDIUM
    default:
      const _exhaustiveCheck: never = size
      return _exhaustiveCheck
  }
}

export function Button(props: CustomButtonProps) {
  return (
    <BaseButton
      {...props}
      type={toInternalBtnType(props.type)}
      size={toInternalBtnSize(props.size)}
      textSize={toInternalTextSize(props.textSize)}
    />
  )
}
