import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import { withAndroidCameraBuildFix } from './withAndroidCameraBuildFix'
import { withAndroidUserAgent } from './withAndroidUserAgent'
import { withAndroidWindowSoftInputModeAdjustNothing } from './withAndroidWindowSoftInputModeAdjustNothing'
import { withIosAppDelegateResetKeychain } from './withIosAppDelegateResetKeychain'
import { withIosUserAgent } from './withIosUserAgent'

/**
 * A config plugin for configuring `@divvi/mobile`
 */
const withMobileApp: ConfigPlugin<{ appName?: string }> = (config, props = {}) => {
  return withPlugins(config, [
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
