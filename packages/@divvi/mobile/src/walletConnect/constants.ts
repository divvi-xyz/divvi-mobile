import { TFunction } from 'i18next'
import { NetworkId } from 'src/transactions/types'
import { Capabilities } from 'src/walletConnect/types'

export enum SupportedActions {
  eth_signTransaction = 'eth_signTransaction',
  eth_sendTransaction = 'eth_sendTransaction',
  eth_signTypedData = 'eth_signTypedData',
  eth_signTypedData_v4 = 'eth_signTypedData_v4',
  eth_sign = 'eth_sign',
  personal_sign = 'personal_sign',
  wallet_getCapabilities = 'wallet_getCapabilities',
  wallet_sendCalls = 'wallet_sendCalls',
  wallet_getCallsStatus = 'wallet_getCallsStatus',
}

const INTERACTIVE_ACTIONS = [
  SupportedActions.eth_signTransaction,
  SupportedActions.eth_sendTransaction,
  SupportedActions.eth_signTypedData,
  SupportedActions.eth_signTypedData_v4,
  SupportedActions.eth_sign,
  SupportedActions.personal_sign,
  SupportedActions.wallet_sendCalls,
] as const

type InteractiveActions = (typeof INTERACTIVE_ACTIONS)[number]

export enum SupportedEvents {
  accountsChanged = 'accountsChanged',
  chainChanged = 'chainChanged',
}

export function isSupportedAction(action: string) {
  return Object.values(SupportedActions).includes(action as SupportedActions)
}

export function isSupportedEvent(event: string) {
  return Object.values(SupportedEvents).includes(event as SupportedEvents)
}

export function requiresUserConsent(action: string) {
  return INTERACTIVE_ACTIONS.includes(action as InteractiveActions)
}

export function getDisplayTextFromAction(
  t: TFunction,
  action: InteractiveActions,
  dappName: string,
  networkName: string,
  transactionsCount: number
): { description: string; title: string; action: string } {
  const actionTranslations: {
    [x in InteractiveActions]: { description: string; title: string; action: string }
  } = {
    [SupportedActions.eth_signTransaction]: {
      description: networkName
        ? t('walletConnectRequest.signDappTransaction', { dappName, networkName })
        : t('walletConnectRequest.signDappTransactionUnknownNetwork', { dappName }),
      title: t('walletConnectRequest.signTransactionTitle'),
      action: t('walletConnectRequest.signTransactionAction'),
    },
    [SupportedActions.eth_sendTransaction]: {
      description: networkName
        ? t('walletConnectRequest.sendDappTransaction', { dappName, networkName })
        : t('walletConnectRequest.sendDappTransactionUnknownNetwork', { dappName }),
      title: t('walletConnectRequest.sendTransactionTitle'),
      action: t('walletConnectRequest.sendTransactionAction'),
    },
    [SupportedActions.eth_signTypedData]: {
      description: t('walletConnectRequest.signPayload', { dappName }),
      title: t('walletConnectRequest.signPayloadTitle'),
      action: t('allow'),
    },
    [SupportedActions.eth_signTypedData_v4]: {
      description: t('walletConnectRequest.signPayload', { dappName }),
      title: t('walletConnectRequest.signPayloadTitle'),
      action: t('allow'),
    },
    [SupportedActions.eth_sign]: {
      description: t('walletConnectRequest.signPayload', { dappName }),
      title: t('walletConnectRequest.signPayloadTitle'),
      action: t('allow'),
    },
    [SupportedActions.personal_sign]: {
      description: t('walletConnectRequest.signPayload', { dappName }),
      title: t('walletConnectRequest.signPayloadTitle'),
      action: t('allow'),
    },
    [SupportedActions.wallet_sendCalls]: {
      description: networkName
        ? t('walletConnectRequest.sendCalls', { dappName, networkName, count: transactionsCount })
        : t('walletConnectRequest.sendCallsUnknownNetwork', { dappName, count: transactionsCount }),
      title: t('walletConnectRequest.sendCallsTitle', { count: transactionsCount }),
      action: t('allow'),
    },
  }

  const translations = actionTranslations[action]
  if (!translations) {
    return { description: '', title: '', action: '' }
  }

  return translations
}

export const chainAgnosticActions: string[] = [
  SupportedActions.personal_sign,
  SupportedActions.wallet_getCapabilities,
]

const defaultCapabilities: Capabilities = {
  atomic: { status: 'unsupported' },
  paymasterService: { supported: false },
}

export const capabilitiesByNetworkId: Record<keyof typeof NetworkId, Capabilities> = {
  [NetworkId['celo-alfajores']]: defaultCapabilities,
  [NetworkId['celo-mainnet']]: defaultCapabilities,
  [NetworkId['ethereum-mainnet']]: defaultCapabilities,
  [NetworkId['ethereum-sepolia']]: defaultCapabilities,
  [NetworkId['arbitrum-one']]: defaultCapabilities,
  [NetworkId['arbitrum-sepolia']]: defaultCapabilities,
  [NetworkId['op-mainnet']]: defaultCapabilities,
  [NetworkId['op-sepolia']]: defaultCapabilities,
  [NetworkId['polygon-pos-mainnet']]: defaultCapabilities,
  [NetworkId['polygon-pos-amoy']]: defaultCapabilities,
  [NetworkId['base-mainnet']]: defaultCapabilities,
  [NetworkId['base-sepolia']]: defaultCapabilities,
}

export const rpcError = {
  INVALID_PARAMS: {
    code: -32602,
    message: 'Invalid params',
  },
  INTERNAL_ERROR: {
    code: -32603,
    message: 'Internal error',
  },
  UNAUTHORIZED: {
    code: 4100,
    message: 'Unauthorized',
  },
  UNSUPPORTED_METHOD: {
    code: 4200,
    message: 'Unsupported method',
  },
  DISCONNECTED: {
    code: 4900,
    message: 'Disconnected',
  },
  UNSUPPORTED_NON_OPTIONAL_CAPABILITY: {
    code: 5700,
    message: 'Unsupported non-optional capability',
  },
  DUPLICATE_ID: {
    code: 5720,
    message: 'Duplicate ID',
  },
  UNKNOWN_BUNDLE_ID: {
    code: 5730,
    message: 'Unknown bundle id',
  },
  ATOMICITY_NOT_SUPPORTED: {
    code: 5760,
    message: 'Atomicity not supported',
  },
} as const
