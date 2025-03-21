import * as React from 'react'
import colors, { ColorValue } from 'src/styles/colors'
import Svg, { Path } from 'svgs'

interface Props {
  size?: number
  color?: ColorValue
}

function Activity({ color = colors.contentPrimary, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M8 17a.968.968 0 0 0 .713-.288A.964.964 0 0 0 9 16a.968.968 0 0 0-.288-.713A.964.964 0 0 0 8 15a.968.968 0 0 0-.713.288A.964.964 0 0 0 7 16c0 .283.096.521.288.713.192.192.43.288.712.287Zm0-4a.968.968 0 0 0 .713-.288A.964.964 0 0 0 9 12a.968.968 0 0 0-.288-.713A.964.964 0 0 0 8 11a.968.968 0 0 0-.713.288A.964.964 0 0 0 7 12c0 .283.096.521.288.713.192.192.43.288.712.287Zm0-4a.968.968 0 0 0 .713-.288A.964.964 0 0 0 9 8a.968.968 0 0 0-.288-.713A.964.964 0 0 0 8 7a.968.968 0 0 0-.713.288A.964.964 0 0 0 7 8c0 .283.096.521.288.713.192.192.43.288.712.287Zm3 8h6v-2h-6v2Zm0-4h6v-2h-6v2Zm0-4h6V7h-6v2ZM5 21c-.55 0-1.021-.196-1.413-.588A1.922 1.922 0 0 1 3 19V5c0-.55.196-1.021.588-1.413A1.922 1.922 0 0 1 5 3h14c.55 0 1.021.196 1.413.588.392.392.588.863.587 1.412v14c0 .55-.196 1.021-.588 1.413A1.922 1.922 0 0 1 19 21H5Zm0-2h14V5H5v14Z"
      />
    </Svg>
  )
}

export default React.memo(Activity)
