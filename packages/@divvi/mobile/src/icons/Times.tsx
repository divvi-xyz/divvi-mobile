import * as React from 'react'
import colors from 'src/styles/colors'
import Svg, { Path } from 'svgs'

export interface Props {
  height?: number
  color?: string
  strokeWidth?: number
}

function Times({ color = colors.contentPrimary, height = 16, strokeWidth = 2 }: Props) {
  return (
    <Svg
      testID="Times"
      xmlns="http://www.w3.org/2000/svg"
      height={height}
      width={height}
      viewBox="0 0 16 16"
    >
      <Path
        d="M13.9999 2.00146L1.99994 14.0015"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1.99994 2.00146L13.9999 14.0015"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default React.memo(Times)
