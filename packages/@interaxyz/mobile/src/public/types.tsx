// Type for tab configuration
export interface TabScreenConfig {
  name: string // Just a unique identifier for the screen
  component: React.ComponentType<any>
  icon: (props: { focused: boolean; color: string; size: number }) => React.ReactNode
  label: (t: (key: string) => string) => string
  testID?: string
}

// This will evolve. We should be mindful of breaking changes.
// This structure should scale well as we add more features
// and makes it clear what's core configuration vs optional features.
//
// Guidelines:
// - We should only have a few core configuration options, and the rest should be optional features and/or with default values
// - We should only add new configuration options that we want to support long term, and not just for a specific app
// - Configuration options should be well documented and have clear purposes
// - Breaking changes to configuration should be avoided when possible
// - Configuration should be type-safe. In some cases we can consider runtime validation.
export interface PublicAppConfig<tabScreenConfigs extends TabScreenConfig[] = TabScreenConfig[]> {
  registryName: string
  displayName: string
  deepLinkUrlScheme: string
  statsigApiKey?: string
  segmentApiKey?: string

  // Platform specific configuration
  ios?: {
    appStoreId?: string
  }

  // Theme configuration
  themes?: {
    // Rough example of what we might want to support
    default: {
      // To adjust status bar style, keyboard appearance, etc
      isDark?: boolean
      colors?: {
        // backgrounds
        backgroundPrimary?: string
        backgroundSecondary?: string
        backgroundTertiary?: string
        backgroundScrim?: string

        // text, icons, and other content
        contentPrimary?: string
        contentSecondary?: string
        contentTertiary?: string
        textLink?: string

        // borders, shadows, highlights, visual effects
        borderPrimary?: string
        borderSecondary?: string
        softShadow?: string
        lightShadow?: string
        barShadow?: string
        skeletonPlaceholderHighlight?: string
        skeletonPlaceholderBackground?: string
        loadingIndicator?: string

        // interactive elements
        navigationTopPrimary?: string
        navigationTopSecondary?: string
        navigationBottomPrimary?: string
        navigationBottomSecondary?: string
        bottomSheetHandle?: string
        buttonPrimaryBackground?: string
        buttonPrimaryContent?: string
        buttonPrimaryBorder?: string
        buttonSecondaryBackground?: string
        buttonSecondaryContent?: string
        buttonSecondaryBorder?: string
        buttonTertiaryBackground?: string
        buttonTertiaryContent?: string
        buttonTertiaryBorder?: string
        buttonQuickActionBackground?: string
        buttonQuickActionContent?: string
        buttonQuickActionBorder?: string
        textInputBackground?: string
        qrTabBarPrimary?: string
        qrTabBarSecondary?: string

        // statuses and UI feedback colors
        disabled?: string
        inactive?: string
        info?: string
        successPrimary?: string
        successSecondary?: string
        warningPrimary?: string
        warningSecondary?: string
        errorPrimary?: string
        errorSecondary?: string

        // brand colors for decorative elements
        accent?: string
        brandGradientLeft?: string
        brandGradientRight?: string
        contentOnboardingComplete?: string
      }

      assets?: {
        // TODO: refine this as we add more assets (e.g. do we want to group by type? or screens? etc)
        welcomeLogo?: React.ComponentType<any>
        welcomeBackgroundImage?: typeof require
      }
    }
  }

  // Screen overrides
  screens?: {
    // Tab navigation configuration
    tabs?: (args: {
      defaultTabs: {
        wallet: TabScreenConfig & { name: 'wallet' }
        activity: TabScreenConfig & { name: 'activity' }
        discover: TabScreenConfig & { name: 'discover' }
      }
    }) => {
      screens?: tabScreenConfigs
      initialScreen?: tabScreenConfigs[number]['name']
    } // Later we could allow passing in a component for advanced cases
  }

  // Optional features/capabilities
  features?: {
    sentry?: {
      clientUrl: string
    }
    // TODO: what's the marketing name for this?
    cloudBackup?: boolean
    walletConnect?: {
      projectId: string
    }
  }

  //
  networks?: {
    // TODO: we'll pass RPC urls, API urls, etc here
  }

  /**
   * Experimental features that may change or be removed in future versions.
   * These features are not part of the stable configuration API and should be used with caution.
   *
   * Features may graduate to the stable API or be removed entirely.
   */
  experimental?: {
    firebase?: boolean
    onboarding?: {
      enableBiometry?: boolean
      protectWallet?: boolean
    }
  }
}
