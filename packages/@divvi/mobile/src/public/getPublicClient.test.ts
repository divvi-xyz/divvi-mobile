import { getPublicClient } from './getPublicClient'

// TODO: remove this once when remove DEFAULT_TESTNET
jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  DEFAULT_TESTNET: 'mainnet',
}))

describe('getPublicClient', () => {
  it('should return the correct public client', () => {
    const publicClient = getPublicClient({ networkId: 'celo-mainnet' })
    expect(publicClient).toBeDefined()
  })

  it('should throw an error if the networkId is not yet supported', () => {
    // Tests only use testnet networks, in the future we'll be able to remove this check
    expect(() => getPublicClient({ networkId: 'celo-alfajores' as any })).toThrow()
  })
})
