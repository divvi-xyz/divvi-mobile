import { NetworkId } from 'src/transactions/types'
import networkConfig, { networkIdToNetwork, viemChainIdToNetworkId } from 'src/web3/networkConfig'
import { getSupportedNetworkIds } from 'src/web3/utils'
import { hexToNumber, isHex, toHex } from 'viem'
import { Capabilities } from './types'

const defaultCapabilities: Capabilities = {
  atomic: { status: 'unsupported' },
  paymasterService: { supported: false },
}

const capabilitiesByNetworkId: Record<keyof typeof NetworkId, Capabilities> = {
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

export function getWalletCapabilitiesByHexChainId(
  requestedChainIds?: unknown
): Record<string, Capabilities> {
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
    result[toHex(chainId)] = capabilitiesByNetworkId[networkId]
  }

  return result
}
