import * as React from 'react'
import Svg, { Path } from 'react-native-svg'
import Colors, { ColorValue } from 'src/styles/colors'

interface Props {
  color?: ColorValue
  size?: number
  testID?: string
}

const SwapAndDeposit = ({ size = 24, color = Colors.contentPrimary, testID }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" testID={testID}>
    <Path
      d="m10.55 18.2 5.175-6.2h-4l.725-5.675L7.825 13H11.3l-.75 5.2ZM8 22l1-7H4l9-13h2l-1 8h6L10 22H8Z"
      fill={color}
    />
  </Svg>
)

export default React.memo(SwapAndDeposit)
