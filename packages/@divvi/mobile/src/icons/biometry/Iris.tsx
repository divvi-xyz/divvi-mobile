import * as React from 'react'
import Svg, { Path } from 'react-native-svg'
import Colors, { ColorValue } from 'src/styles/colors'

export function Iris({ color = Colors.contentPrimary }: { color?: ColorValue }) {
  return (
    <Svg testID="IrisBiometryIcon" width={24} height={24} fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 20.11v-2.696a.61.61 0 1 0-1.219 0v2.695a2.675 2.675 0 0 1-2.672 2.672h-2.695a.61.61 0 0 0 0 1.219h2.695A3.895 3.895 0 0 0 24 20.11ZM7.195 23.39a.61.61 0 0 0-.61-.609H3.892a2.675 2.675 0 0 1-2.672-2.672v-2.695a.61.61 0 1 0-1.219 0v2.695A3.895 3.895 0 0 0 3.89 24h2.696a.61.61 0 0 0 .61-.61ZM1.219 6.586V3.89A2.675 2.675 0 0 1 3.89 1.219h2.695a.61.61 0 0 0 0-1.219H3.89A3.895 3.895 0 0 0 0 3.89v2.696a.61.61 0 0 0 1.219 0ZM24 6.586V3.89A3.895 3.895 0 0 0 20.11 0h-2.696a.61.61 0 1 0 0 1.219h2.695a2.675 2.675 0 0 1 2.672 2.672v2.695a.61.61 0 0 0 1.219 0Z"
        fill={color}
      />
      <Path
        d="M12 9.25A4.885 4.885 0 0 1 16.41 12 4.88 4.88 0 0 1 12 14.75 4.88 4.88 0 0 1 7.59 12 4.885 4.885 0 0 1 12 9.25Zm0-1A5.913 5.913 0 0 0 6.5 12c.865 2.195 3 3.75 5.5 3.75s4.635-1.555 5.5-3.75A5.913 5.913 0 0 0 12 8.25Zm0 2.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm0-1c-1.24 0-2.25 1.01-2.25 2.25s1.01 2.25 2.25 2.25 2.25-1.01 2.25-2.25S13.24 9.75 12 9.75Z"
        fill={color}
      />
    </Svg>
  )
}

export default React.memo(Iris)
