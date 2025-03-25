import { celo } from 'viem/chains'
import { getViemWallet } from '../web3/contracts'
import { getWalletClient } from './getWalletClient'

jest.mock('../web3/contracts')

// TODO: remove this once when remove DEFAULT_TESTNET
jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  DEFAULT_TESTNET: 'mainnet',
}))

describe('getWalletClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(getViemWallet).mockReturnValue({} as any)
  })

  it('should return the correct wallet client', async () => {
    const walletClient = await getWalletClient({ networkId: 'celo-mainnet' })
    expect(walletClient).toBeDefined()
    expect(getViemWallet).toHaveBeenCalledWith(celo)
  })

  it('should throw an error if the networkId is not yet supported', async () => {
    // Tests only use testnet networks, in the future we'll be able to remove this check
    await expect(getWalletClient({ networkId: 'celo-alfajores' as any })).rejects.toThrow()
  })
})
