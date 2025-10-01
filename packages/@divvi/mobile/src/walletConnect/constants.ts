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
}

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

export function getDisplayTextFromAction(
  t: TFunction,
  action: SupportedActions,
  dappName: string,
  networkName: string
): { description: string; title: string; action: string } {
  const actionTranslations: {
    [x in SupportedActions]: { description: string; title: string; action: string }
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
    [SupportedActions.wallet_getCapabilities]: {
      description: t('walletConnectRequest.getCapabilities', { dappName }),
      title: t('walletConnectRequest.getCapabilitiesTitle'),
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
