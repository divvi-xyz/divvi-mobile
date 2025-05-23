export enum StatsigDynamicConfigs {
  USERNAME_BLOCK_LIST = 'username_block_list',
  WALLET_NETWORK_TIMEOUT_SECONDS = 'wallet_network_timeout_seconds',
  DAPP_WEBVIEW_CONFIG = 'dapp_webview_config',
  SWAP_CONFIG = 'swap_config',
  CICO_TOKEN_INFO = 'cico_token_info',
  WALLET_JUMPSTART_CONFIG = 'wallet_jumpstart_config',
  NFT_CELEBRATION_CONFIG = 'nft_celebration_config',
  APP_CONFIG = 'app_config',
  EARN_CONFIG = 'earn_config',
  DEMO_MODE_CONFIG = 'demo_mode_config',
  FIAT_CONNECT_CONFIG = 'fiat_connect_config',
  INVITE_REWARDS_CONFIG = 'invite_rewards_config',
  DIVVI_SLICES_BOTTOM_SHEET_CONFIG = 'divvi_slices_bottom_sheet_config',
}

export enum StatsigFeatureGates {
  SHOW_POSITIONS = 'show_positions',
  SHOW_CLAIM_SHORTCUTS = 'show_claim_shortcuts',
  ALLOW_HOOKS_PREVIEW = 'allow_hooks_preview',
  APP_REVIEW = 'app_review',
  SHOW_IMPORT_TOKENS_FLOW = 'show_import_tokens_flow',
  SAVE_CONTACTS = 'save_contacts',
  SHOW_SWAP_TOKEN_FILTERS = 'show_swap_token_filters',
  SHUFFLE_SWAP_TOKENS_ORDER = 'shuffle_swap_tokens_order',
  SHOW_NFT_CELEBRATION = 'show_nft_celebration',
  SHOW_NFT_REWARD = 'show_nft_reward',
  SHOW_JUMPSTART_SEND = 'show_jumpstart_send',
  SHOW_POINTS = 'show_points',
  SUBSIDIZE_STABLECOIN_EARN_GAS_FEES = 'subsidize_stablecoin_earn_gas_fees',
  ALLOW_CROSS_CHAIN_SWAPS = 'allow_cross_chain_swaps',
  SHOW_UK_COMPLIANT_VARIANT = 'show_uk_compliant_variant',
  ALLOW_EARN_PARTIAL_WITHDRAWAL = 'allow_earn_partial_withdrawal',
  SHOW_ZERION_TRANSACTION_FEED = 'show_zerion_transaction_feed',
  SHOW_NEW_ENTER_AMOUNT_FOR_SWAP = 'show_new_enter_amount_for_swap',
  ALLOW_CROSS_CHAIN_SWAP_AND_DEPOSIT = 'allow_cross_chain_swap_and_deposit',
  DISABLE_WALLET_CONNECT_V2 = 'disable_wallet_connect_v2',
  SHOW_DIVVI_SLICES_BOTTOM_SHEET = 'show_divvi_slices_bottom_sheet',
}

export enum StatsigExperiments {
  SAMPLE = 'sample', // Needed for CI, remove if there are actual experiments
}

export type StatsigParameter =
  | string
  | number
  | boolean
  | StatsigParameter[]
  | { [key: string]: StatsigParameter }
