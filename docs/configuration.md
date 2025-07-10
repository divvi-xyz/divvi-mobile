---
sidebar_position: 2
sidebar_label: Configuring your app
---

# Configuring Your Divvi Mobile App

Divvi Mobile apps are configured through a single configuration object passed to `createApp`. By default, you get a fully functioning Divvi app with sensible defaults.

Since Divvi Mobile is built on top of Expo, you also get all the benefits of a standard Expo app. This means you can use any Expo configuration options, plugins, and features as documented in the [Expo documentation](https://docs.expo.dev/). Common Expo configurations like app icons, splash screens, and native modules can be configured through your `app.json` or `app.config.js` file.

## Basic Configuration

The minimal configuration requires just a few key properties:

```typescript
import { createApp } from '@divvi/mobile'

const App = createApp({
  // Unique identifier for your app
  registryName: 'my-divvi-app',
  // Display name shown to users
  displayName: 'My Divvi App',
  // URL scheme for deep linking
  deepLinkUrlScheme: 'mydivviapp',
})
```

## Customizing Your App

You can customize various aspects of your app by adding optional configuration:

### Integrating with the Divvi Protocol

Earn Divvi rewards based on the value your users bring to the blockchain protocols you integrate with. To register your app with the Divvi Protocol visit the [Divvi Portal](https://app.divvi.xyz/)

To enable Divvi Protocol integration, add the `divviProtocol` configuration to your app:

```typescript
const App = createApp({
  // ... basic config
  // Find your divviId at https://app.divvi.xyz/
  divviProtocol: {
    divviId: '0xyour_divvi_id',
  },
})
```

### Theme Customization

Divvi Mobile allows you to customize the look and feel of your app through the `themes` configuration. Note that currently only a single theme is supported.

```typescript
import WelcomeLogo from './assets/WelcomeLogo'
import BrandLogo from './assets/BrandLogo'

const App = createApp({
  // ... basic config
  themes: {
    default: {
      isDark: false, // Specify if your app is dark mode
      colors: {
        // Customize your app's color scheme
        backgroundPrimary: '#FFFFFF',
        contentPrimary: '#000000',
        accent: '#007AFF',
        // See API reference for all available color options
      },
      assets: {
        // Custom logos and images
        welcomeLogo: WelcomeLogo,
        brandLogo: BrandLogo,
        onboardingSuccessImage: require('./assets/onboarding-success.png'),
        // See API reference for all available asset options
      },
    },
  },
})
```

#### Tips for Theming

✅ **Use brand colors consistently**  
Align buttons, text, and backgrounds with your brand identity to create a cohesive user experience.

✅ **Test contrast & accessibility**  
Ensure text and UI elements remain readable, especially for users with visual impairments. Use high-contrast colors where necessary.

✅ **Optimize asset sizes**  
Provide high-resolution images and icons to ensure crisp visuals across different devices. For best results, include **multiple asset sizes** (`@1.5x`, `@2x`, `@3x`, and `@4x`). This prevents pixelation on high-density screens and avoids unnecessary upscaling, keeping your app looking sharp.

### Tab Navigation

```typescript
import { createApp } from '@divvi/mobile'
import { HomeIcon } from './components/icons'
import { HomeScreen } from './screens/Home'

const App = createApp({
  // ... basic config
  screens: {
    tabs: ({ defaultTabs }) => ({
      screens: [
        {
          // Custom home tab
          name: 'home',
          component: HomeScreen,
          icon: ({ focused, color, size }) => (
            <HomeIcon
              size={size}
              color={color}
              focused={focused}
            />
          ),
          label: (t) => t('home.tabLabel'),
        },
        // Default tabs
        defaultTabs.wallet,
        defaultTabs.activity,
        defaultTabs.discover,
      ],
      initialScreen: 'home',
    }),
  },
})
```

### Custom Screens

Beyond tabs, you can add custom screens that can be navigated to from anywhere in your app:

```typescript
import { createApp } from '@divvi/mobile'
import CustomScreen from './screens/CustomScreen'

const App = createApp({
  // ... basic config
  screens: {
    // Tab configuration...
    custom: (Screen) => (
      <>
        <Screen
          name="CustomScreen"
          component={CustomScreen}
          options={{
            headerBackVisible: true,  // Show back button
            headerShown: true,        // Show navigation header
          }}
        />
      </>
    ),
  },
})
```

To enable type-safe navigation, define your screen parameters:

```typescript
import { NativeStackScreenProps, StackParamList } from '@divvi/mobile'

// Define your screen parameters
type RootStackParamList = StackParamList & {
  CustomScreen: {
    someParam: string
  }
}

// Create type-safe screen props
type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>

// Enable type-safe navigation globally
declare global {
  namespace DivviNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

Now you get full type safety when navigating:

```typescript
import { navigate } from '@divvi/mobile'

// TypeScript will ensure you provide the correct parameters
function handleSomeAction() {
  navigate('CustomScreen', {
    someParam: 'value', // Required! TypeScript will error if missing
  })
}
```

And in your screen component:

```typescript
import { NativeStackScreenProps } from '@divvi/mobile'

// Type-safe screen component
function CustomScreen({ route }: RootStackScreenProps<'CustomScreen'>) {
  const { someParam } = route.params // Fully typed!

  return (
    // Your screen content
  )
}
```

### Optional Features

```typescript
const App = createApp({
  // ... basic config
  features: {
    // Enable cloud backup
    cloudBackup: true,
    // WalletConnect integration
    walletConnect: {
      projectId: 'your-project-id',
    },
    // Analytics
    segment: {
      apiKey: 'your-segment-key',
    },
  },
})
```

### Localization

```typescript
const App = createApp({
  // ... basic config
  locales: {
    'en-US': {
      // Override specific translation keys
      'welcome.title': 'Welcome to My App',
    },
    'es-419': {
      'welcome.title': 'Bienvenido a Mi App',
    },
  },
})
```

## Configuration Reference

For a complete list of configuration options, see the [API reference](reference) or check the type definition:

```typescript
import type { PublicAppConfig } from '@divvi/mobile'
```

## Best Practices

1. **Start Simple**: Begin with the minimal configuration and add customizations as needed
2. **Type Safety**: Use TypeScript to ensure your configuration is valid
3. **Asset Management**: Keep custom assets in an organized directory structure
4. **Feature Flags**: Use the `features` object to enable/disable functionality
5. **Theme Consistency**: Maintain a consistent theme across your app using the theme configuration
