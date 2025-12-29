import { AndroidConfig, ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'

/**
 * This plugin sets the `android:windowSoftInputMode` to `adjustNothing` in the Android manifest.
 * This is so it behaves like on iOS, and works as expected with our KeyboardSpacer component.
 */
export const withAndroidWindowSoftInputModeAdjustNothing: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults)

    activity.$['android:windowSoftInputMode'] = 'adjustNothing'

    return config
  })
}
