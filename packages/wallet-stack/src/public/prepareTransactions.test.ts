import { getMockStoreData } from 'test/utils'
import { mockAccount, mockTokenBalances } from 'test/values'
import { store } from '../redux/store'
import { feeCurrenciesSelector } from '../tokens/selectors'
import { NetworkId } from '../transactions/types'
import { prepareTransactions as internalPrepareTransactions } from '../viem/prepareTransactions'
import { prepareTransactions, type TransactionRequest } from './prepareTransactions'

// Note: Statsig is not directly used by this module, but mocking it prevents
// require cycles from impacting the tests.
jest.mock('src/statsig')

jest.mock('../viem/prepareTransactions')
jest.mock('../redux/store', () => ({ store: { getState: jest.fn() } }))

const mockStore = jest.mocked(store)

describe('prepareTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(internalPrepareTransactions).mockReset()
    mockStore.getState.mockImplementation(() =>
      getMockStoreData({
        tokens: {
          tokenBalances: {
            ...mockTokenBalances,
          },
        },
      })
    )
  })

  it('should correctly prepare transactions', async () => {
    const feeCurrencies = feeCurrenciesSelector(store.getState(), NetworkId['celo-mainnet'])
    const mockPrepareResult = { type: 'possible' } as any

    jest.mocked(internalPrepareTransactions).mockResolvedValue(mockPrepareResult)

    const txRequests: TransactionRequest[] = [
      {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
        value: BigInt(1000),
        estimatedGasUse: BigInt(21000),
      },
    ]

    const result = await prepareTransactions({
      networkId: 'celo-mainnet',
      transactionRequests: txRequests,
    })

    expect(result).toEqual(mockPrepareResult)
    expect(internalPrepareTransactions).toHaveBeenCalledWith({
      feeCurrencies: feeCurrencies,
      decreasedAmountGasFeeMultiplier: 1,
      baseTransactions: [
        {
          from: mockAccount.toLowerCase(),
          to: txRequests[0].to,
          data: txRequests[0].data,
          value: txRequests[0].value,
          _estimatedGasUse: txRequests[0].estimatedGasUse,
        },
      ],
      origin: 'framework',
    })
  })

  it('should throw if no wallet address is found', async () => {
    mockStore.getState.mockImplementation(() => getMockStoreData({ web3: { account: null } }))
    await expect(
      prepareTransactions({ networkId: 'celo-mainnet', transactionRequests: [] })
    ).rejects.toThrow('Wallet address not found')
  })
})
