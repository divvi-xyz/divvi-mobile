import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import { withSentry } from '@sentry/react-native/expo'

import { withAndroidCameraBuildFix } from './withAndroidCameraBuildFix'
import { withAndroidUserAgent } from './withAndroidUserAgent'
import { withAndroidWindowSoftInputModeAdjustNothing } from './withAndroidWindowSoftInputModeAdjustNothing'
import { withIosAppDelegateResetKeychain } from './withIosAppDelegateResetKeychain'
import { withIosUserAgent } from './withIosUserAgent'

type SentryPluginProps = Parameters<typeof withSentry>[1]

/**
 * A config plugin for configuring `@divvi/mobile`
 */
const withMobileApp: ConfigPlugin<{
  appName?: string
  sentry?: SentryPluginProps
}> = (config, props = {}) => {
  return withPlugins(config, [
    // Sentry
    ...((props.sentry
      ? [withSentry, props.sentry ?? {}]
      : []) as ConfigPlugin<SentryPluginProps>[]),

    // iOS
    withIosAppDelegateResetKeychain,
    [withIosUserAgent, props],

    // Android
    withAndroidCameraBuildFix,
    [withAndroidUserAgent, props],
    withAndroidWindowSoftInputModeAdjustNothing,
  ])
}

export default withMobileApp
