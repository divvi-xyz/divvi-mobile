import { createApp } from '@divvi/mobile'
import { registerRootComponent } from 'expo'
import Constants from 'expo-constants'
import React from 'react'
import CustomScreen from './screens/CustomScreen'
import PlaygroundScreen from './screens/PlaygroundScreen'

const expoConfig = Constants.expoConfig
if (!expoConfig) {
  throw new Error('expoConfig is not available')
}

// Create Divvi app
const App = createApp({
  // For now use 'Valora' so CPV works (since it's known by identity-service)
  // TODO: find a better long term solution
  registryName: 'Valora',
  displayName: expoConfig.name,
  deepLinkUrlScheme: expoConfig.scheme
    ? Array.isArray(expoConfig.scheme)
      ? expoConfig.scheme[0]
      : expoConfig.scheme
    : 'example',
  features: {
    // Special cases to cover experimental features with e2e tests
    ...(process.env.EXPO_PUBLIC_DIVVI_E2E === 'true' && {
      cloudBackup: false,
      walletConnect: {
        projectId: '8f6f2517f4485c013849d38717ec90d1', // valora-e2e-client project
      },
    }),
  },
  locales: {
    'en-US': require('./locales/en-US.json'),
    'es-419': require('./locales/es-419.json'),
    'pt-BR': require('./locales/pt-BR.json'),
    de: require('./locales/de.json'),
    'ru-RU': require('./locales/ru-RU.json'),
    'fr-FR': require('./locales/fr-FR.json'),
    'it-IT': require('./locales/it-IT.json'),
    'uk-UA': require('./locales/uk-UA.json'),
    'pl-PL': require('./locales/pl-PL.json'),
    'th-TH': require('./locales/th-TH.json'),
    'tr-TR': require('./locales/tr-TR.json'),
    'vi-VN': require('./locales/vi-VN.json'),
    'zh-CN': require('./locales/zh-CN.json'),
  },
  screens: {
    tabs: ({ defaultTabs }) => {
      return {
        screens: [
          defaultTabs.wallet,
          defaultTabs.activity,
          defaultTabs.discover,
          defaultTabs.earn,
          {
            name: 'Playground',
            component: PlaygroundScreen,
            // TODO: add icon
            icon: () => null,
            label: (t) => t('playground'),
          },
        ],
        initialScreen: 'activity',
      }
    },
    custom: (Screen) => (
      <>
        <Screen
          name="CustomScreen"
          component={CustomScreen}
          // TODO: make custom screens use our custom back button
          options={{ headerBackVisible: true, headerShown: true }}
        />
      </>
    ),
  },
  divviProtocol: {
    protocolIds: ['somm'],
    referrerId: 'ExampleApp',
  },

  // Special cases to cover experimental features with e2e tests
  ...(process.env.EXPO_PUBLIC_DIVVI_E2E === 'true' && {
    experimental: {
      bidali: {
        url: 'https://commerce.bidali.com',
      },
      notificationCenter: true,
      phoneNumberVerification: true,
      zendeskConfig: {
        apiKey: 'dummyApiKey',
        projectName: 'divviapp',
      },
    },
  }),
})

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
