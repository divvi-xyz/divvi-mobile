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
import { hexToNumber, isHex, toHex } from 'viem'
import { Capabilities } from './types'

export async function getWalletCapabilitiesByHexChainId(
  address: Address,
  requestedChainIds?: unknown,
  useAppTransport: boolean = false
): Promise<Record<string, Capabilities>> {
  const supportedNetworkIds = getSupportedNetworkIds()

  let targetNetworkIds: NetworkId[] = []

  if (!requestedChainIds) {
    targetNetworkIds = supportedNetworkIds
  } else {
    if (!Array.isArray(requestedChainIds)) {
      throw new Error('requested chainIds must be provided as an array')
    }

    if (requestedChainIds.length === 0) {
      throw new Error('requested chainIds array must not be empty')
    }

    if (requestedChainIds.some((chainId) => !isHex(chainId))) {
      throw new Error('requested chainIds must be expressed as hex numbers')
    }

    const requestedNetworkIds = new Set(
      requestedChainIds.map((chainId) => viemChainIdToNetworkId[hexToNumber(chainId)])
    )

    targetNetworkIds = supportedNetworkIds.filter((networkId) => requestedNetworkIds.has(networkId))
  }

  const result: Record<string, Capabilities> = {}

  for (const networkId of targetNetworkIds) {
    const chainId = networkConfig.viemChain[networkIdToNetwork[networkId]].id
    const baseCapabilities = capabilitiesByNetworkId[networkId]

    // Check if smart account is deployed for this network
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

export async function isSmartAccountDeployedForNetworkId(
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

  for (const networkId of getSupportedNetworkIds()) {
    const walletConnectChainId = networkIdToWalletConnectChainId[networkId]
    const baseCapabilities = capabilitiesByNetworkId[networkId]

    // Check if smart account is deployed for this network
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
