const { getDefaultConfig: getDefaultConfigExpo } = require('expo/metro-config')

// Wraps Expo's getDefaultConfig to add our customizations
function getDefaultConfig(...args) {
  const config = getDefaultConfigExpo(...args)

  config.transformer.getTransformOptions = async () => ({
    transform: {
      experimentalImportSupport: false,
      // Needed otherwise we get import issues because of all the cyclic imports we currently have
      inlineRequires: true,
    },
  })

  config.resolver.assetExts = [...config.resolver.assetExts, 'txt']

  config.resolver.extraNodeModules = {
    // This is the crypto module we want to use moving forward (unless something better comes up).
    // It is implemented natively using OpenSSL.
    crypto: require.resolve('react-native-quick-crypto'),
    fs: require.resolve('@divvi/react-native-fs'),
    stream: require.resolve('readable-stream'),
    buffer: require.resolve('@craftzdog/react-native-buffer'),
  }

  // TODO: remove this once we stop using absolute imports
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.startsWith('src/')) {
      return context.resolveRequest(context, `@divvi/mobile/${moduleName}`, platform)
    }
    if (moduleName === 'locales') {
      return context.resolveRequest(context, '@divvi/mobile/locales', platform)
    }
    return context.resolveRequest(context, moduleName, platform)
  }

  return config
}

module.exports = { getDefaultConfig }
