import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { HomeEvents } from 'src/analytics/Events'
import { getAppConfig } from 'src/appConfig'
import { useNotifications } from 'src/home/NotificationCenter'
import NotificationBellIcon from 'src/icons/NotificationBellIcon'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { TopBarIconButtonV2 } from 'src/navigator/TopBarIconButtonV2'
import colors from 'src/styles/colors'

interface Props {
  style?: StyleProp<ViewStyle>
  size?: number
  testID?: string
}

export default function NotificationBell({ testID, size, style }: Props) {
  const notificationCenterEnabled = getAppConfig().experimental?.notificationCenter
  const notifications = useNotifications()

  const hasNotifications = notifications.length > 0
  const notificationMark = hasNotifications ? colors.accent : undefined

  const onPress = () => {
    AppAnalytics.track(HomeEvents.notification_bell_pressed, { hasNotifications })
    navigate(Screens.NotificationCenter)
  }

  if (!notificationCenterEnabled) {
    return null
  }
  return (
    <TopBarIconButtonV2
      icon={<NotificationBellIcon size={size} notificationMark={notificationMark} />}
      testID={testID}
      onPress={onPress}
      style={style}
    />
  )
}
