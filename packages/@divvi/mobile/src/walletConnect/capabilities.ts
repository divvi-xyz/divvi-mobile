import { NetworkId } from 'src/transactions/types'
import { capabilitiesByNetworkId } from 'src/walletConnect/constants'
import networkConfig, {
  networkIdToNetwork,
  networkIdToWalletConnectChainId,
  viemChainIdToNetworkId,
} from 'src/web3/networkConfig'
import { getSupportedNetworkIds } from 'src/web3/utils'
import { Hex, hexToNumber, toHex } from 'viem'
import { Capabilities } from './types'

export function getWalletCapabilitiesByHexChainId(
  requestedChainIds?: Hex[]
): Record<string, Capabilities> {
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

  for (const networkId of targetNetworkIds) {
    const chainId = networkConfig.viemChain[networkIdToNetwork[networkId]].id
    result[toHex(chainId)] = capabilitiesByNetworkId[networkId]
  }

  return result
}

export function getWalletCapabilitiesByWalletConnectChainId(): Record<string, Capabilities> {
  const result: Record<string, Capabilities> = {}

  for (const networkId of getSupportedNetworkIds()) {
    const walletConnectChainId = networkIdToWalletConnectChainId[networkId]
    result[walletConnectChainId] = capabilitiesByNetworkId[networkId]
  }

  return result
}

export function getAtomicCapability(networkId: NetworkId) {
  const capabilities = capabilitiesByNetworkId[networkId]
  return capabilities?.atomic?.status ?? 'unsupported'
}

export function validateRequestedCapabilities(
  requestedCapabilities: Record<string, any>,
  supportedCapabilities: Record<string, unknown>
) {
  for (const [capabilityKey, capabilityProperties] of Object.entries(requestedCapabilities)) {
    const isOptional = (capabilityProperties as { optional?: boolean }).optional ?? false
    const isSupported = capabilityKey in supportedCapabilities
    if (!isOptional && !isSupported) {
      return false
    }
  }
  return true
}
