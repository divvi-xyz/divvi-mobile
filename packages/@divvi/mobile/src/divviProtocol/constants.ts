import { Address } from 'viem'

export const REGISTRY_CONTRACT_ADDRESS: Address = '0xba9655677f4e42dd289f5b7888170bc0c7da8cdc'

export const supportedProtocolIds = [
  'aerodrome',
  'allbridge',
  'beefy',
  'celo',
  'curve',
  'euler',
  'farcaster',
  'fonbnk',
  'mento',
  'morpho',
  'offchainlabs',
  'somm',
  'tether',
  'ubeswap',
  'vana',
  'velodrome',
  'yearn',
] as const

export type SupportedProtocolId = (typeof supportedProtocolIds)[number]
