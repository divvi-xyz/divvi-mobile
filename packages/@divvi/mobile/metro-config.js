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
    // Privy resolvers
    // Package exports in `isows` (a `viem`) dependency are incompatible, so they need to be disabled
    if (moduleName === 'isows') {
      const ctx = {
        ...context,
        unstable_enablePackageExports: false,
      }
      return ctx.resolveRequest(ctx, moduleName, platform)
    }

    // Package exports in `zustand@4` are incompatible, so they need to be disabled
    if (moduleName.startsWith('zustand')) {
      const ctx = {
        ...context,
        unstable_enablePackageExports: false,
      }
      return ctx.resolveRequest(ctx, moduleName, platform)
    }

    // Package exports in `jose` are incompatible, so the browser version is used
    if (moduleName === 'jose') {
      const ctx = {
        ...context,
        unstable_conditionNames: ['browser'],
      }
      return ctx.resolveRequest(ctx, moduleName, platform)
    }
    if (moduleName.startsWith('@privy-io/') || moduleName.startsWith('permissionless')) {
      const ctx = {
        ...context,
        unstable_enablePackageExports: true,
      }
      return ctx.resolveRequest(ctx, moduleName, platform)
    }

    if (moduleName.endsWith('.js') && context.originModulePath.includes('node_modules/ox/')) {
      const newModuleName = moduleName.replace(/\.js$/, '')
      return context.resolveRequest(context, newModuleName, platform)
    }

    return context.resolveRequest(context, moduleName, platform)
  }

  return config
}

module.exports = { getDefaultConfig }
