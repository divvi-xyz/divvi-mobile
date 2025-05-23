import { getAppConfig } from 'src/appConfig'
import type { FiatAccountSchemaCountryOverrides } from 'src/fiatconnect/types'
import {
  StatsigDynamicConfigs,
  StatsigExperiments,
  StatsigFeatureGates,
  StatsigParameter,
} from 'src/statsig/types'
import { NetworkId } from 'src/transactions/types'

const appConfig = getAppConfig()

export const FeatureGates = {
  [StatsigFeatureGates.SHOW_POSITIONS]: appConfig.experimental?.showPositions ?? true,
  [StatsigFeatureGates.SHOW_CLAIM_SHORTCUTS]: true,
  [StatsigFeatureGates.ALLOW_HOOKS_PREVIEW]: true,
  [StatsigFeatureGates.APP_REVIEW]: false,
  [StatsigFeatureGates.SHOW_IMPORT_TOKENS_FLOW]:
    appConfig.experimental?.showImportTokensFlow ?? true,
  [StatsigFeatureGates.SAVE_CONTACTS]: false,
  [StatsigFeatureGates.SHOW_SWAP_TOKEN_FILTERS]:
    appConfig.experimental?.showSwapTokenFilters ?? true,
  [StatsigFeatureGates.SHUFFLE_SWAP_TOKENS_ORDER]: false,
  [StatsigFeatureGates.SHOW_NFT_CELEBRATION]: false,
  [StatsigFeatureGates.SHOW_NFT_REWARD]: false,
  [StatsigFeatureGates.SHOW_JUMPSTART_SEND]: false,
  [StatsigFeatureGates.SHOW_POINTS]: false,
  [StatsigFeatureGates.SUBSIDIZE_STABLECOIN_EARN_GAS_FEES]: false,
  [StatsigFeatureGates.ALLOW_CROSS_CHAIN_SWAPS]: true,
  [StatsigFeatureGates.SHOW_UK_COMPLIANT_VARIANT]: false,
  [StatsigFeatureGates.ALLOW_EARN_PARTIAL_WITHDRAWAL]: true,
  [StatsigFeatureGates.SHOW_ZERION_TRANSACTION_FEED]: true,
  [StatsigFeatureGates.SHOW_NEW_ENTER_AMOUNT_FOR_SWAP]: true,
  [StatsigFeatureGates.ALLOW_CROSS_CHAIN_SWAP_AND_DEPOSIT]: false,
  [StatsigFeatureGates.DISABLE_WALLET_CONNECT_V2]: false,
  [StatsigFeatureGates.SHOW_DIVVI_SLICES_BOTTOM_SHEET]: false,
} satisfies { [key in StatsigFeatureGates]: boolean }

export const ExperimentConfigs = {
  // NOTE: the keys of defaultValues MUST be parameter names
  // Needed for CI, remove if there are actual experiments
  [StatsigExperiments.SAMPLE]: {
    experimentName: StatsigExperiments.SAMPLE,
    defaultValues: {
      testParam: 'sample-param-1',
    },
  },
} satisfies {
  [key in StatsigExperiments]: {
    experimentName: key
    defaultValues: { [key: string]: StatsigParameter }
  }
}

export const DynamicConfigs = {
  [StatsigDynamicConfigs.USERNAME_BLOCK_LIST]: {
    configName: StatsigDynamicConfigs.USERNAME_BLOCK_LIST,
    defaultValues: {
      blockedAdjectives: [] as string[],
      blockedNouns: [] as string[],
    },
  },
  [StatsigDynamicConfigs.WALLET_NETWORK_TIMEOUT_SECONDS]: {
    configName: StatsigDynamicConfigs.WALLET_NETWORK_TIMEOUT_SECONDS,
    defaultValues: {
      default: 15,
      cico: 30,
    },
  },
  [StatsigDynamicConfigs.DAPP_WEBVIEW_CONFIG]: {
    configName: StatsigDynamicConfigs.DAPP_WEBVIEW_CONFIG,
    defaultValues: {
      disabledMediaPlaybackRequiresUserActionOrigins: [] as string[],
      inAppWebviewEnabled: true,
    },
  },
  [StatsigDynamicConfigs.SWAP_CONFIG]: {
    configName: StatsigDynamicConfigs.SWAP_CONFIG,
    defaultValues: {
      maxSlippagePercentage: '0.3',
      enableAppFee: appConfig.experimental?.enableSwapAppFee ?? true,
      popularTokenIds: [] as string[],
      enabled: true,
      priceImpactWarningThreshold: 4,
      minReceivedFiatWarningPercent: 95,
    },
  },
  [StatsigDynamicConfigs.CICO_TOKEN_INFO]: {
    configName: StatsigDynamicConfigs.CICO_TOKEN_INFO,
    defaultValues: {
      tokenInfo: {} as { [tokenId: string]: { cicoOrder: number } },
    },
  },
  [StatsigDynamicConfigs.WALLET_JUMPSTART_CONFIG]: {
    configName: StatsigDynamicConfigs.WALLET_JUMPSTART_CONFIG,
    defaultValues: {
      jumpstartContracts: {} as {
        [key in NetworkId]?: {
          contractAddress?: string
          depositERC20GasEstimate: string
          retiredContractAddresses?: string[]
        }
      },
      maxAllowedSendAmountUsd: 100,
    },
  },
  [StatsigDynamicConfigs.NFT_CELEBRATION_CONFIG]: {
    configName: StatsigDynamicConfigs.NFT_CELEBRATION_CONFIG,
    defaultValues: {
      celebratedNft: {} as { networkId?: NetworkId; contractAddress?: string },
      deepLink: '',
      rewardExpirationDate: new Date(0).toISOString(),
      rewardReminderDate: new Date(0).toISOString(),
    },
  },
  [StatsigDynamicConfigs.APP_CONFIG]: {
    configName: StatsigDynamicConfigs.APP_CONFIG,
    defaultValues: {
      minRequiredVersion: '0.0.0',
      // TODO: add link to documentation for what kind of content these links should link to
      links: {
        web: '',
        tos: '',
        privacy: '',
        faq: '',
        funding: '',
        forum: '',
        swapLearnMore: '',
        transactionFeesLearnMore: '',
        inviteRewardsNftsLearnMore: '',
        inviteRewardsStableTokenLearnMore: '',
        earnStablecoinsLearnMore: '',
        celoEducation: '',
        dappList: 'https://api.mainnet.valora.xyz/dappList',
        celoNews: 'https://blog.celo.org',
      },
    },
  },
  [StatsigDynamicConfigs.EARN_CONFIG]: {
    configName: StatsigDynamicConfigs.EARN_CONFIG,
    defaultValues: {
      supportedPools: [] as string[],
      supportedAppIds: [] as string[],
    },
  },
  [StatsigDynamicConfigs.DEMO_MODE_CONFIG]: {
    configName: StatsigDynamicConfigs.DEMO_MODE_CONFIG,
    defaultValues: {
      enabledInOnboarding: false,
      demoWalletAddress: '',
    },
  },
  [StatsigDynamicConfigs.FIAT_CONNECT_CONFIG]: {
    configName: StatsigDynamicConfigs.FIAT_CONNECT_CONFIG,
    defaultValues: {
      fiatConnectCashOutEnabled: false,
      fiatAccountSchemaCountryOverrides: {} as FiatAccountSchemaCountryOverrides,
    },
  },
  [StatsigDynamicConfigs.INVITE_REWARDS_CONFIG]: {
    configName: StatsigDynamicConfigs.INVITE_REWARDS_CONFIG,
    defaultValues: {
      inviteRewardsVersion: 'none',
    },
  },
  [StatsigDynamicConfigs.DIVVI_SLICES_BOTTOM_SHEET_CONFIG]: {
    configName: StatsigDynamicConfigs.DIVVI_SLICES_BOTTOM_SHEET_CONFIG,
    defaultValues: {} as { url?: string },
  },
} satisfies {
  [key in StatsigDynamicConfigs]: {
    configName: key
    defaultValues: { [key: string]: StatsigParameter }
  }
}
