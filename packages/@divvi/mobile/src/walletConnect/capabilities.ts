import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import { NetworkId } from 'src/transactions/types'
import { getLockableViemSmartWallet } from 'src/viem/getLockableWallet'
import { capabilitiesByNetworkId } from 'src/walletConnect/constants'
import { getKeychainAccounts } from 'src/web3/contracts'
import networkConfig, {
  networkIdToNetwork,
  networkIdToWalletConnectChainId,
  viemChainIdToNetworkId,
} from 'src/web3/networkConfig'
import { getSupportedNetworkIds } from 'src/web3/utils'
import type { Address } from 'viem'
import { Hex, hexToNumber, toHex } from 'viem'
import { Capabilities } from './types'

export async function getWalletCapabilitiesByHexChainId(
  address: Address,
  requestedChainIds?: Hex[],
  useAppTransport: boolean = false
): Promise<Record<string, Capabilities>> {
  const supportedNetworkIds = getSupportedNetworkIds()

  let targetNetworkIds: NetworkId[] = []

  if (!requestedChainIds) {
    targetNetworkIds = supportedNetworkIds
  } else {
    const requestedNetworkIds = new Set(
      requestedChainIds.map((chainId) => viemChainIdToNetworkId[hexToNumber(chainId)])
    )

    targetNetworkIds = supportedNetworkIds.filter((networkId) => requestedNetworkIds.has(networkId))
  }

  const result: Record<string, Capabilities> = {}

  const useSmartAccountCapabilities = getFeatureGate(
    StatsigFeatureGates.USE_SMART_ACCOUNT_CAPABILITIES
  )

  if (!useSmartAccountCapabilities) {
    for (const networkId of targetNetworkIds) {
      const chainId = networkConfig.viemChain[networkIdToNetwork[networkId]].id
      result[toHex(chainId)] = capabilitiesByNetworkId[networkId]
    }
    return result
  }

  for (const networkId of targetNetworkIds) {
    const chainId = networkConfig.viemChain[networkIdToNetwork[networkId]].id
    const baseCapabilities = capabilitiesByNetworkId[networkId]

    const isDeployed = await isSmartAccountDeployedForNetworkId(address, networkId, useAppTransport)

    result[toHex(chainId)] = {
      ...baseCapabilities,
      atomic: {
        status: isDeployed ? 'supported' : 'ready',
      },
    }
  }

  return result
}

async function isSmartAccountDeployedForNetworkId(
  address: Address,
  networkId: NetworkId,
  useAppTransport: boolean = false
): Promise<boolean> {
  const network = networkIdToNetwork[networkId]
  const chain = networkConfig.viemChain[network]
  if (!chain) {
    throw new Error(`No chain configuration found for network ${network}`)
  }

  const accounts = await getKeychainAccounts()

  const smartWallet = await getLockableViemSmartWallet(accounts, chain, address, useAppTransport)

  const { account } = smartWallet
  if (!account) {
    throw new Error('Smart account not available')
  }

  return await account.isDeployed()
}

export async function getWalletCapabilitiesByWalletConnectChainId(
  address: Address,
  useAppTransport: boolean = false
): Promise<Record<string, Capabilities>> {
  const result: Record<string, Capabilities> = {}

  const supportedNetworkIds = getSupportedNetworkIds()
  const useSmartAccountCapabilities = getFeatureGate(
    StatsigFeatureGates.USE_SMART_ACCOUNT_CAPABILITIES
  )

  if (!useSmartAccountCapabilities) {
    for (const networkId of supportedNetworkIds) {
      const walletConnectChainId = networkIdToWalletConnectChainId[networkId]
      result[walletConnectChainId] = capabilitiesByNetworkId[networkId]
    }
    return result
  }

  for (const networkId of supportedNetworkIds) {
    const walletConnectChainId = networkIdToWalletConnectChainId[networkId]
    const baseCapabilities = capabilitiesByNetworkId[networkId]

    const isDeployed = await isSmartAccountDeployedForNetworkId(address, networkId, useAppTransport)

    result[walletConnectChainId] = {
      ...baseCapabilities,
      atomic: {
        status: isDeployed ? 'supported' : 'ready',
      },
    }
  }

  return result
}

export async function getAtomicCapabilityByWalletConnectChainId(chainId: string) {
  const capabilities = getWalletCapabilitiesByWalletConnectChainId()
  return capabilities?.[chainId]?.atomic?.status ?? 'unsupported'
}

export async function validateRequestedCapabilities(
  chainId: string,
  requestedCapabilities: Record<string, { optional?: boolean } | undefined>
) {
  const supportedCapabilities = getWalletCapabilitiesByWalletConnectChainId()[chainId] ?? {}

  for (const [capabilityKey, capabilityProperties] of Object.entries(requestedCapabilities)) {
    // if capability key is requested, but not marked as optional, it is required
    const isOptional = capabilityProperties?.optional ?? false
    const isRequired = !isOptional

    switch (capabilityKey) {
      case 'atomic': {
        const atomic = await getAtomicCapabilityByWalletConnectChainId(chainId)
        if (isRequired && atomic === 'unsupported') {
          return false
        }
      }
      case 'paymasterService': {
        const isSupported = supportedCapabilities['paymasterService']?.supported ?? false
        if (isRequired && !isSupported) {
          return false
        }
      }
      default: {
        if (isRequired) {
          return false
        }
      }
    }
  }

  return true
}
