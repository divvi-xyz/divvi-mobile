import * as React from 'react'
import colors from 'src/styles/colors'
import Svg, { Path } from 'svgs'

interface Props {
  height?: number
  color?: string
  width?: number
}

export default class Search extends React.PureComponent<Props> {
  render() {
    const { width = 14, height = 15, color = colors.contentPrimary } = this.props
    return (
      <Svg width={width} height={height} viewBox="0 0 14 15" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2.162 5.946a3.784 3.784 0 107.568 0 3.784 3.784 0 00-7.568 0zM0 5.946a5.946 5.946 0 008.929 5.145l3.225 3.226a1.081 1.081 0 001.53-1.53l-3.11-3.108A5.946 5.946 0 100 5.946z"
          fill={color}
        />
      </Svg>
    )
  }
}
