import * as React from 'react'
import Svg, { Path } from 'react-native-svg'
import colors, { ColorValue } from 'src/styles/colors'

interface Props {
  size?: number
  notificationMark?: ColorValue
}

const NotificationBellIcon = ({ size = 24, notificationMark }: Props) => (
  <Svg width={size} height={size} fill="none">
    <Path
      d="M3 20.125V17.875H5.25V10C5.25 8.44375 5.71875 7.06075 6.65625 5.851C7.59375 4.64125 8.8125 3.84925 10.3125 3.475V2.6875C10.3125 2.21875 10.4767 1.82013 10.8052 1.49163C11.1337 1.16313 11.532 0.999253 12 1C12.4688 1 12.8674 1.16425 13.1959 1.49275C13.5244 1.82125 13.6882 2.2195 13.6875 2.6875V3.475C15.1875 3.85 16.4062 4.64238 17.3438 5.85213C18.2812 7.06188 18.75 8.4445 18.75 10V17.875H21V20.125H3ZM12 23.5C11.3813 23.5 10.8514 23.2795 10.4104 22.8385C9.96937 22.3975 9.74925 21.868 9.75 21.25H14.25C14.25 21.8688 14.0295 22.3986 13.5885 22.8396C13.1475 23.2806 12.618 23.5008 12 23.5ZM7.5 17.875H16.5V10C16.5 8.7625 16.0594 7.70313 15.1781 6.82188C14.2969 5.94063 13.2375 5.5 12 5.5C10.7625 5.5 9.70313 5.94063 8.82188 6.82188C7.94063 7.70313 7.5 8.7625 7.5 10V17.875Z"
      fill={colors.contentPrimary}
    />
    {!!notificationMark && (
      <Path
        d="M14 6C14 3.79086 15.7909 2 18 2C20.2091 2 22 3.79086 22 6C22 8.20914 20.2091 10 18 10C15.7909 10 14 8.20914 14 6Z"
        fill={notificationMark}
      />
    )}
  </Svg>
)

export default NotificationBellIcon
