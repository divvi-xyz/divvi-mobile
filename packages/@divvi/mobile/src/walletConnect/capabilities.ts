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
