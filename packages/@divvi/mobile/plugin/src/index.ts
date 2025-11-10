import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import { withAndroidUserAgent } from './withAndroidUserAgent'
import { withAndroidWindowSoftInputModeAdjustNothing } from './withAndroidWindowSoftInputModeAdjustNothing'
import withAppIconBase64 from './withAppIconBase64'
import { withIosAppDelegateResetKeychain } from './withIosAppDelegateResetKeychain'
import { withIosUserAgent } from './withIosUserAgent'

/**
 * A config plugin for configuring `@divvi/mobile`
 */
const withMobileApp: ConfigPlugin<{ appName?: string }> = (config, props = {}) => {
  return withPlugins(config, [
    withAppIconBase64,

    // iOS
    withIosAppDelegateResetKeychain,
    [withIosUserAgent, props],

    // Android
    [withAndroidUserAgent, props],
    withAndroidWindowSoftInputModeAdjustNothing,
  ])
}

export default withMobileApp
