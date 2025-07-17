// Inspired by https://github.com/expo/expo/blob/03e99016c9c5b9ad47864b204511ded2dec80375/packages/%40expo/config-plugins/src/ios/Maps.ts#L6
import { ConfigPlugin, withAppDelegate } from '@expo/config-plugins'
import { mergeContents, MergeResults } from '@expo/config-plugins/build/utils/generateCode'

function getUserAgentCode(appName: string) {
  return `
    RCTSetCustomNSURLSessionConfigurationProvider { () -> URLSessionConfiguration in
      let configuration = URLSessionConfiguration.default
      
      let infoDictionary = Bundle.main.infoDictionary
      let appVersion = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
      let device = UIDevice.current
      // Format we want: App/1.0.0 (iOS 15.0; iPhone)
      let userAgent = "${appName}/\\(appVersion) (\\(device.systemName) \\(device.systemVersion); \\(device.model))"
      configuration.httpAdditionalHeaders = ["User-Agent": userAgent]
      
      return configuration
    }
`
}

function addUserAgentCode(src: string, appName: string): MergeResults {
  // Match just the opening brace line of the didFinishLaunchingWithOptions method
  // This is simpler and more reliable than matching the entire function signature
  const braceRegex = /\s*\) -> Bool \{\s*$/m

  return mergeContents({
    tag: '@divvi/mobile/app-delegate-user-agent-code',
    src,
    newSrc: getUserAgentCode(appName),
    anchor: braceRegex,
    offset: 1, // after the opening brace line
    comment: '//',
  })
}

/**
 * Config plugin for setting an app-wide User-Agent header for all requests
 * TODO: consider shipping this as a react native module
 */
export const withIosUserAgent: ConfigPlugin<{ appName?: string }> = (config, { appName }) => {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        `Cannot setup Divvi mobile because the project AppDelegate is not Swift: ${config.modResults.language}`
      )
    }

    try {
      config.modResults.contents = addUserAgentCode(
        config.modResults.contents,
        appName ?? config.name
      ).contents
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
