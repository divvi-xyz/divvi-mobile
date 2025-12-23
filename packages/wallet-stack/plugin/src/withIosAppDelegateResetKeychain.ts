import { ConfigPlugin, withAppDelegate } from '@expo/config-plugins'
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode'

const RESET_KEYCHAIN_FUNCTION = `

  // Use same key as react-native-secure-key-store
  // so we don't reset already working installs
  private static let kHasRunBeforeKey = "RnSksIsAppInstalled"

  // Reset keychain on first app run, this is so we don't run with leftover items
  // after reinstalling the app
  private static func resetKeychainIfNecessary() {
    let defaults = UserDefaults.standard
    if defaults.bool(forKey: kHasRunBeforeKey) {
      return
    }
    
    let secItemClasses = [kSecClassGenericPassword,
                          kSecAttrGeneric,
                          kSecAttrAccount,
                          kSecClassKey,
                          kSecAttrService]
    
    for secItemClass in secItemClasses {
      let spec = [kSecClass: secItemClass] as CFDictionary
      SecItemDelete(spec)
    }
    
    defaults.set(true, forKey: kHasRunBeforeKey)
    defaults.synchronize()
  }

`

const METHOD_INVOCATION_BLOCK = `    AppDelegate.resetKeychainIfNecessary()`

function addResetKeychainFunction(src: string) {
  return mergeContents({
    tag: 'wallet-stack/app-delegate-reset-keychain-function',
    src,
    newSrc: RESET_KEYCHAIN_FUNCTION,
    anchor: /public class AppDelegate: ExpoAppDelegate/,
    offset: 1,
    comment: '//',
  })
}

function addCallResetKeychain(src: string) {
  // Match the opening brace line of the didFinishLaunchingWithOptions method
  const braceRegex = /\s*\) -> Bool \{\s*$/m

  return mergeContents({
    tag: 'wallet-stack/app-delegate-call-reset-keychain',
    src,
    newSrc: METHOD_INVOCATION_BLOCK,
    anchor: braceRegex,
    offset: 1, // after the opening brace line
    comment: '//',
  })
}

export const withIosAppDelegateResetKeychain: ConfigPlugin = (config) => {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        `Cannot setup Divvi mobile because the project AppDelegate is not Swift: ${config.modResults.language}`
      )
    }

    try {
      config.modResults.contents = addResetKeychainFunction(config.modResults.contents).contents
      config.modResults.contents = addCallResetKeychain(config.modResults.contents).contents
    } catch (error: any) {
      if (error.code === 'ERR_NO_MATCH') {
        throw new Error(
          `Cannot add Divvi mobile to the project's AppDelegate because it's malformed. Please report this with a copy of your project AppDelegate.`
        )
      }
      throw error
    }
    return config
  })
}
