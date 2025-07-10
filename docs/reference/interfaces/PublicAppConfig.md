[**@divvi/mobile**](../README.md)

---

[@divvi/mobile](../README.md) / PublicAppConfig

# Interface: PublicAppConfig\<tabScreenConfigs\>

Defined in: [packages/@divvi/mobile/src/public/types.tsx:24](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L24)

## Type Parameters

• **tabScreenConfigs** _extends_ `TabScreenConfig`[] = `TabScreenConfig`[]

## Properties

### deepLinkUrlScheme

```ts
deepLinkUrlScheme: string
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:27](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L27)

---

### displayName

```ts
displayName: string
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:26](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L26)

---

### divviProtocol?

```ts
optional divviProtocol: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:262](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L262)

#### divviId

```ts
divviId: `0x${string}`
```

---

### experimental?

```ts
optional experimental: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:207](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L207)

Experimental features that may change or be removed in future versions.
These features are not part of the stable configuration API and should be used with caution.

Features may graduate to the stable API or be removed entirely.

#### activity?

```ts
optional activity: object;
```

##### activity.hideActionsCarousel?

```ts
optional hideActionsCarousel: boolean;
```

#### alchemyKeys?

```ts
optional alchemyKeys: Record<string, string>;
```

#### bidali?

```ts
optional bidali: object;
```

##### bidali.url

```ts
url: string
```

#### disableNfts?

```ts
optional disableNfts: boolean;
```

#### earn?

```ts
optional earn: object;
```

##### earn.showLearnMore?

```ts
optional showLearnMore: boolean;
```

##### earn.showSafetyScoreOnPoolCard?

```ts
optional showSafetyScoreOnPoolCard: boolean;
```

#### enableSwapAppFee?

```ts
optional enableSwapAppFee: boolean;
```

#### firebase?

```ts
optional firebase: boolean;
```

#### hideCashInTokenFilters?

```ts
optional hideCashInTokenFilters: boolean;
```

#### inviteFriends?

```ts
optional inviteFriends: boolean;
```

#### notificationCenter?

```ts
optional notificationCenter: boolean;
```

#### onboarding?

```ts
optional onboarding: object;
```

##### onboarding.enableBiometry?

```ts
optional enableBiometry: boolean;
```

##### onboarding.protectWallet?

```ts
optional protectWallet: boolean;
```

#### otaTranslations?

```ts
optional otaTranslations: object;
```

##### otaTranslations.crowdinDistributionHash

```ts
crowdinDistributionHash: string
```

#### phoneNumberVerification?

```ts
optional phoneNumberVerification: boolean;
```

#### showImportTokensFlow?

```ts
optional showImportTokensFlow: boolean;
```

#### showPositions?

```ts
optional showPositions: boolean;
```

#### showSwapTokenFilters?

```ts
optional showSwapTokenFilters: boolean;
```

#### tokens?

```ts
optional tokens: object;
```

##### tokens.enabledTokenIds

```ts
enabledTokenIds: string[];
```

##### tokens.overrides?

```ts
optional overrides: object;
```

###### Index Signature

```ts
[tokenId: string]: object
```

#### transactions?

```ts
optional transactions: object;
```

##### transactions.emptyState?

```ts
optional emptyState: ReactElement<any, string | JSXElementConstructor<any>>;
```

#### wallet?

```ts
optional wallet: object;
```

##### wallet.emptyState?

```ts
optional emptyState: ReactElement<any, string | JSXElementConstructor<any>>;
```

##### wallet.showActionsCarousel?

```ts
optional showActionsCarousel: boolean;
```

#### zendeskConfig?

```ts
optional zendeskConfig: object;
```

##### zendeskConfig.apiKey

```ts
apiKey: string
```

##### zendeskConfig.projectName

```ts
projectName: string
```

---

### features?

```ts
optional features: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:158](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L158)

#### cloudBackup?

```ts
optional cloudBackup: boolean;
```

#### segment?

```ts
optional segment: object;
```

##### segment.apiKey

```ts
apiKey: string
```

#### sentry?

```ts
optional sentry: object;
```

##### sentry.clientUrl

```ts
clientUrl: string
```

#### statsig?

```ts
optional statsig: object;
```

##### statsig.apiKey

```ts
apiKey: string
```

#### walletConnect?

```ts
optional walletConnect: object;
```

##### walletConnect.projectId

```ts
projectId: string
```

---

### ios?

```ts
optional ios: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:30](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L30)

#### appStoreId?

```ts
optional appStoreId: string;
```

---

### locales?

```ts
optional locales: Partial<{
  de: Record<string, any>;
  en-US: Record<string, any>;
  es-419: Record<string, any>;
  fr-FR: Record<string, any>;
  it-IT: Record<string, any>;
  pl-PL: Record<string, any>;
  pt-BR: Record<string, any>;
  ru-RU: Record<string, any>;
  th-TH: Record<string, any>;
  tr-TR: Record<string, any>;
  uk-UA: Record<string, any>;
  vi-VN: Record<string, any>;
  zh-CN: Record<string, any>;
}>;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:179](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L179)

Optional copies overwrite. This field should contain the same language keys as @interxyz/mobile.
TODO: Eventually, we want to make this fully type-safe (maybe with generics?)

---

### networks?

```ts
optional networks: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:196](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L196)

#### enabledNetworkIds?

```ts
optional enabledNetworkIds: NetworkId[];
```

---

### registryName

```ts
registryName: string
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:25](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L25)

---

### screens?

```ts
optional screens: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:141](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L141)

#### custom()?

```ts
optional custom: (Screen) => Element;
```

##### Parameters

###### Screen

`any`

##### Returns

`Element`

#### tabs()?

```ts
optional tabs: (args) => object;
```

##### Parameters

###### args

###### defaultTabs

\{
`activity`: `TabScreenConfig` & `object`;
`discover`: `TabScreenConfig` & `object`;
`earn`: `TabScreenConfig` & `object`;
`wallet`: `TabScreenConfig` & `object`;
\}

###### defaultTabs.activity

`TabScreenConfig` & `object`

###### defaultTabs.discover

`TabScreenConfig` & `object`

###### defaultTabs.earn

`TabScreenConfig` & `object`

###### defaultTabs.wallet

`TabScreenConfig` & `object`

##### Returns

`object`

###### initialScreen?

```ts
optional initialScreen: tabScreenConfigs[number]["name"];
```

###### screens?

```ts
optional screens: tabScreenConfigs;
```

---

### themes?

```ts
optional themes: object;
```

Defined in: [packages/@divvi/mobile/src/public/types.tsx:35](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/types.tsx#L35)

#### default

```ts
default: object;
```

##### default.assets?

```ts
optional assets: object;
```

##### default.assets.backupAndRecoveryImages?

```ts
optional backupAndRecoveryImages: object;
```

##### default.assets.backupAndRecoveryImages.cloudBackupEmail?

```ts
optional cloudBackupEmail: ImageSourcePropType;
```

##### default.assets.backupAndRecoveryImages.recoveryPhraseEducation1?

```ts
optional recoveryPhraseEducation1: ImageSourcePropType;
```

##### default.assets.backupAndRecoveryImages.recoveryPhraseEducation2?

```ts
optional recoveryPhraseEducation2: ImageSourcePropType;
```

##### default.assets.backupAndRecoveryImages.recoveryPhraseEducation3?

```ts
optional recoveryPhraseEducation3: ImageSourcePropType;
```

##### default.assets.backupAndRecoveryImages.recoveryPhraseEducation4?

```ts
optional recoveryPhraseEducation4: ImageSourcePropType;
```

##### default.assets.backupAndRecoveryImages.walletSafe?

```ts
optional walletSafe: ImageSourcePropType;
```

##### default.assets.biometryImages?

```ts
optional biometryImages: object;
```

##### default.assets.biometryImages.face?

```ts
optional face: ImageSourcePropType;
```

##### default.assets.biometryImages.faceId?

```ts
optional faceId: ImageSourcePropType;
```

##### default.assets.biometryImages.fingerprint?

```ts
optional fingerprint: ImageSourcePropType;
```

##### default.assets.biometryImages.iris?

```ts
optional iris: ImageSourcePropType;
```

##### default.assets.biometryImages.touchId?

```ts
optional touchId: ImageSourcePropType;
```

##### default.assets.brandLogo?

```ts
optional brandLogo: ComponentType<{
  color: string;
  size: number;
}>;
```

##### default.assets.noEarnPoolsLogo?

```ts
optional noEarnPoolsLogo: ComponentType<any>;
```

##### default.assets.onboardingSuccessBackgroundImage?

```ts
optional onboardingSuccessBackgroundImage: ImageSourcePropType;
```

##### default.assets.onboardingSuccessImage?

```ts
optional onboardingSuccessImage: ImageSourcePropType;
```

##### default.assets.splashBackgroundImage?

```ts
optional splashBackgroundImage: ImageSourcePropType;
```

##### default.assets.welcomeBackgroundImage?

```ts
optional welcomeBackgroundImage: ImageSourcePropType;
```

##### default.assets.welcomeLogo?

```ts
optional welcomeLogo: ComponentType<any>;
```

##### default.colors?

```ts
optional colors: object;
```

##### default.colors.accent?

```ts
optional accent: string;
```

##### default.colors.backgroundOnboardingComplete?

```ts
optional backgroundOnboardingComplete: string;
```

##### default.colors.backgroundPrimary?

```ts
optional backgroundPrimary: string;
```

##### default.colors.backgroundScrim?

```ts
optional backgroundScrim: string;
```

##### default.colors.backgroundSecondary?

```ts
optional backgroundSecondary: string;
```

##### default.colors.backgroundSplash?

```ts
optional backgroundSplash: string;
```

##### default.colors.backgroundTertiary?

```ts
optional backgroundTertiary: string;
```

##### default.colors.barShadow?

```ts
optional barShadow: string;
```

##### default.colors.borderPrimary?

```ts
optional borderPrimary: string;
```

##### default.colors.borderSecondary?

```ts
optional borderSecondary: string;
```

##### default.colors.bottomSheetHandle?

```ts
optional bottomSheetHandle: string;
```

##### default.colors.brandGradientLeft?

```ts
optional brandGradientLeft: string;
```

##### default.colors.brandGradientRight?

```ts
optional brandGradientRight: string;
```

##### default.colors.buttonPrimaryBackground?

```ts
optional buttonPrimaryBackground: string | string[];
```

Can be a single color or array of colors for a linear gradient

##### default.colors.buttonPrimaryBorder?

```ts
optional buttonPrimaryBorder: string;
```

##### default.colors.buttonPrimaryContent?

```ts
optional buttonPrimaryContent: string;
```

##### default.colors.buttonQuickActionBackground?

```ts
optional buttonQuickActionBackground: string;
```

##### default.colors.buttonQuickActionBorder?

```ts
optional buttonQuickActionBorder: string;
```

##### default.colors.buttonQuickActionContent?

```ts
optional buttonQuickActionContent: string;
```

##### default.colors.buttonSecondaryBackground?

```ts
optional buttonSecondaryBackground: string;
```

##### default.colors.buttonSecondaryBorder?

```ts
optional buttonSecondaryBorder: string;
```

##### default.colors.buttonSecondaryContent?

```ts
optional buttonSecondaryContent: string;
```

##### default.colors.buttonTertiaryBackground?

```ts
optional buttonTertiaryBackground: string;
```

##### default.colors.buttonTertiaryBorder?

```ts
optional buttonTertiaryBorder: string;
```

##### default.colors.buttonTertiaryContent?

```ts
optional buttonTertiaryContent: string;
```

##### default.colors.contentOnboardingComplete?

```ts
optional contentOnboardingComplete: string;
```

##### default.colors.contentPrimary?

```ts
optional contentPrimary: string;
```

##### default.colors.contentSecondary?

```ts
optional contentSecondary: string;
```

##### default.colors.contentTertiary?

```ts
optional contentTertiary: string;
```

##### default.colors.disabled?

```ts
optional disabled: string;
```

##### default.colors.errorPrimary?

```ts
optional errorPrimary: string;
```

##### default.colors.errorSecondary?

```ts
optional errorSecondary: string;
```

##### default.colors.inactive?

```ts
optional inactive: string;
```

##### default.colors.info?

```ts
optional info: string;
```

##### default.colors.lightShadow?

```ts
optional lightShadow: string;
```

##### default.colors.loadingIndicator?

```ts
optional loadingIndicator: string;
```

##### default.colors.navigationBottomPrimary?

```ts
optional navigationBottomPrimary: string;
```

##### default.colors.navigationBottomSecondary?

```ts
optional navigationBottomSecondary: string;
```

##### default.colors.navigationTopPrimary?

```ts
optional navigationTopPrimary: string;
```

##### default.colors.navigationTopSecondary?

```ts
optional navigationTopSecondary: string;
```

##### default.colors.qrTabBarPrimary?

```ts
optional qrTabBarPrimary: string;
```

##### default.colors.qrTabBarSecondary?

```ts
optional qrTabBarSecondary: string;
```

##### default.colors.skeletonPlaceholderBackground?

```ts
optional skeletonPlaceholderBackground: string;
```

##### default.colors.skeletonPlaceholderHighlight?

```ts
optional skeletonPlaceholderHighlight: string;
```

##### default.colors.softShadow?

```ts
optional softShadow: string;
```

##### default.colors.successPrimary?

```ts
optional successPrimary: string;
```

##### default.colors.successSecondary?

```ts
optional successSecondary: string;
```

##### default.colors.textInputBackground?

```ts
optional textInputBackground: string;
```

##### default.colors.textLink?

```ts
optional textLink: string;
```

##### default.colors.warningPrimary?

```ts
optional warningPrimary: string;
```

##### default.colors.warningSecondary?

```ts
optional warningSecondary: string;
```

##### default.isDark?

```ts
optional isDark: boolean;
```
