/** @type {import('@expo/config').ExpoConfig} */
export default ({ config }) => {
  return {
    ...config,
    name: 'Divvi',
    slug: 'divvi',
    // Main scheme should be first (see usage in index.tsx)
    // TODO: use a Divvi scheme
    scheme: ['celo', 'wc'], // Main scheme first
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    // disable for now as it causes an Android build error with react-native-auth0
    // See https://github.com/auth0/react-native-auth0/issues/879
    newArchEnabled: false,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'xyz.divvi.example',
      infoPlist: {
        // TODO: add all reasons for all permissions
        NSCameraUsageDescription: '[REASON]',
        NSUserTrackingUsageDescription: '[REASON]',
      },
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE_IOS || './googleService-Info.plist',
    },

    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ff5050',
      },
      package: 'xyz.divvi.example',
      // TODO: add all reasons for all permissions
      permissions: ['android.permission.CAMERA'],
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE_ANDROID || './google-services.json',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ff5050',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            // Minimum iOS version we support
            deploymentTarget: '15.1',
            useFrameworks: 'static',
          },
          android: {
            // For Persona SDK
            extraMavenRepos: ['https://sdk.withpersona.com/android/releases'],
          },
        },
      ],
      [
        'react-native-permissions',
        {
          iosPermissions: ['Camera', 'AppTrackingTransparency', 'Contacts'],
        },
      ],
      [
        'react-native-auth0',
        {
          // TODO: add domain
          domain: '{DOMAIN}',
        },
      ],
      '@divvi/mobile',
      './plugins/withConditionalDetox',
      [
        './plugins/withCustomGradleProperties',
        {
          'org.gradle.jvmargs': '-Xmx4096m -XX:+HeapDumpOnOutOfMemoryError',
        },
      ],
      [
        'expo-camera',
        {
          recordAudioAndroid: false,
        },
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/dynamic-links',
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ],
  }
}
