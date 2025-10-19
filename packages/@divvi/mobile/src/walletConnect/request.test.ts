import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { BATCH_STATUS_TTL } from 'src/sendCalls/constants'
import { addBatch } from 'src/sendCalls/slice'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import { NetworkId } from 'src/transactions/types'
import { ViemWallet, getLockableViemSmartWallet } from 'src/viem/getLockableWallet'
import {
  SerializableTransactionRequest,
  getPreparedTransaction,
} from 'src/viem/preparedTransactionSerialization'
import { getWalletCapabilitiesByWalletConnectChainId } from 'src/walletConnect/capabilities'
import { SupportedActions } from 'src/walletConnect/constants'
import { fetchTransactionReceipts, handleRequest } from 'src/walletConnect/request'
import { ActionableRequest, PreparedTransactionResult } from 'src/walletConnect/types'
import { getViemWallet } from 'src/web3/contracts'
import { unlockAccount } from 'src/web3/saga'
import { createMockStore } from 'test/utils'
import {
  mockCeloAddress,
  mockCeloTokenId,
  mockCeurAddress,
  mockCeurTokenId,
  mockCusdAddress,
  mockCusdTokenId,
  mockTypedData,
} from 'test/values'
import type { TransactionReceipt } from 'viem'
import { Hex, TransactionReceiptNotFoundError } from 'viem'
import { celoAlfajores, sepolia as ethereumSepolia } from 'viem/chains'

jest.mock('src/web3/networkConfig', () => {
  const originalModule = jest.requireActual('src/web3/networkConfig')
  return {
    ...originalModule,
    __esModule: true,
    default: {
      ...originalModule.default,
      defaultNetworkId: 'celo-alfajores',
    },
  }
})

jest.mock('src/web3/utils', () => ({
  ...jest.requireActual('src/web3/utils'),
  getSupportedNetworkIds: () => ['ethereum-sepolia', 'arbitrum-sepolia'],
}))
jest.mock('src/viem/getLockableWallet', () => ({
  ...jest.requireActual('src/viem/getLockableWallet'),
  getLockableViemSmartWallet: jest.fn(),
}))
jest.mock('src/statsig', () => ({
  ...jest.requireActual('src/statsig'),
  getFeatureGate: jest.fn(),
}))

const createMockActionableRequest = ({
  method,
  params,
  chainId,
  preparedRequest,
}: {
  method: SupportedActions
  params: any[]
  chainId: string
  preparedRequest?:
    | PreparedTransactionResult<SerializableTransactionRequest>
    | PreparedTransactionResult<SerializableTransactionRequest[]>
}) =>
  ({
    method,
    request: {
      id: 1234567890,
      topic: '0x1234567890',
      params: {
        chainId,
        request: {
          method,
          params,
        },
      },
    },
    preparedRequest,
  }) as ActionableRequest

const txParams = {
  from: '0xTEST',
  to: '0xTEST',
  data: '0x',
  nonce: 7,
  gas: '0x5208',
  value: '0x01',
}

const preparedRequest = {
  success: true as const,
  data: txParams as SerializableTransactionRequest,
}

const signTransactionRequest = createMockActionableRequest({
  method: SupportedActions.eth_signTransaction,
  params: [txParams],
  chainId: 'eip155:44787',
  preparedRequest,
})
const serializableTransactionRequest = signTransactionRequest.request.params.request
  .params[0] as SerializableTransactionRequest
const sendTransactionRequest = createMockActionableRequest({
  method: SupportedActions.eth_sendTransaction,
  params: [txParams],
  chainId: 'eip155:44787',
  preparedRequest,
})
const serializableSendTransactionRequest = sendTransactionRequest.request.params.request
  .params[0] as SerializableTransactionRequest
const personalSignRequest = createMockActionableRequest({
  method: SupportedActions.personal_sign,
  params: ['Some message', '0xdeadbeef'],
  chainId: 'eip155:44787',
})
const signTypedDataRequest = createMockActionableRequest({
  method: SupportedActions.eth_signTypedData,
  params: ['0xdeadbeef', JSON.stringify(mockTypedData)],
  chainId: 'eip155:44787',
})
const signTypedDataV4Request = createMockActionableRequest({
  method: SupportedActions.eth_signTypedData_v4,
  params: ['0xdeadbeef', JSON.stringify(mockTypedData)],
  chainId: 'eip155:44787',
})

const state = createMockStore({
  web3: { account: '0xWALLET' },
  tokens: {
    tokenBalances: {
      [mockCusdTokenId]: {
        balance: '00',
        priceUsd: '1',
        symbol: 'cUSD',
        address: mockCusdAddress,
        tokenId: mockCusdTokenId,
        networkId: NetworkId['celo-alfajores'],
        isFeeCurrency: true,
        priceFetchedAt: Date.now(),
      },
      [mockCeurTokenId]: {
        balance: '0',
        priceUsd: '1.2',
        symbol: 'cEUR',
        address: mockCeurAddress,
        tokenId: mockCeurTokenId,
        networkId: NetworkId['celo-alfajores'],
        isFeeCurrency: true,
        priceFetchedAt: Date.now(),
      },
      [mockCeloTokenId]: {
        balance: '5',
        priceUsd: '3.5',
        symbol: 'CELO',
        address: mockCeloAddress,
        tokenId: mockCeloTokenId,
        networkId: NetworkId['celo-alfajores'],
        isFeeCurrency: true,
        priceFetchedAt: Date.now(),
      },
    },
  },
}).getState()

describe(handleRequest, () => {
  let viemWallet: Partial<ViemWallet>
  const mockGetFeatureGate = jest.mocked(getFeatureGate)

  beforeAll(function* () {
    viemWallet = yield* getViemWallet(celoAlfajores)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetFeatureGate.mockImplementation(
      (gate) => gate === StatsigFeatureGates.USE_SMART_ACCOUNT_CAPABILITIES
    )
    jest.mocked(getLockableViemSmartWallet).mockResolvedValue({
      account: {
        isDeployed: jest.fn().mockResolvedValue(true),
      },
    } as any)
  })

  it('chooses the correct wallet for the request', async () => {
    await expectSaga(
      handleRequest,
      createMockActionableRequest({
        method: SupportedActions.personal_sign,
        params: ['Some message', '0xdeadbeef'],
        chainId: 'eip155:11155111',
      })
    )
      .withState(state)
      .call(getViemWallet, ethereumSepolia)
      .not.call(getViemWallet, celoAlfajores)
      .run()

    await expectSaga(
      handleRequest,
      createMockActionableRequest({
        method: SupportedActions.personal_sign,
        params: ['Some message', '0xdeadbeef'],
        chainId: 'eip155:44787',
      })
    )
      .withState(state)
      .call(getViemWallet, celoAlfajores)
      .not.call(getViemWallet, ethereumSepolia)
      .run()
  })

  it('supports personal_sign, including for an unsupported chain', async () => {
    await expectSaga(handleRequest, personalSignRequest)
      .withState(state)
      .call([viemWallet, 'signMessage'], { message: { raw: 'Some message' } })
      .run()

    await expectSaga(
      handleRequest,
      createMockActionableRequest({
        method: SupportedActions.personal_sign,
        params: ['Some message', '0xdeadbeef'],
        chainId: 'eip155:unsupported',
      })
    )
      .withState(state)
      .call([viemWallet, 'signMessage'], { message: { raw: 'Some message' } })
      .run()
  })

  it('supports eth_signTypedData', async () => {
    await expectSaga(handleRequest, signTypedDataRequest)
      .withState(state)
      .call([viemWallet, 'signTypedData'], mockTypedData)
      .run()
  })

  it('supports eth_signTypedData_v4', async () => {
    await expectSaga(handleRequest, signTypedDataV4Request)
      .withState(state)
      .call([viemWallet, 'signTypedData'], mockTypedData)
      .run()
  })

  it('supports eth_signTransaction for supported chain', async () => {
    await expectSaga(handleRequest, signTransactionRequest)
      .withState(state)
      .call(unlockAccount, '0xwallet')
      .call([viemWallet, 'signTransaction'], getPreparedTransaction(serializableTransactionRequest))
      .run()
  })

  it('throws for a eth_signTransaction request on unsupported chain', async () => {
    await expect(
      async () =>
        await expectSaga(
          handleRequest,
          createMockActionableRequest({
            method: SupportedActions.eth_signTransaction,
            params: [txParams],
            chainId: 'eip155:unsupported',
          })
        )
          .withState(state)
          .run()
    ).rejects.toThrow('unsupported network')
    expect(viemWallet.signTransaction).not.toHaveBeenCalled()
  })

  it('supports eth_sendTransaction for supported chain', async () => {
    await expectSaga(handleRequest, sendTransactionRequest)
      .withState(state)
      .call(unlockAccount, '0xwallet')
      .call(
        [viemWallet, 'sendTransaction'],
        getPreparedTransaction(serializableSendTransactionRequest)
      )
      .run()
  })

  it('throws for a eth_sendTransaction request on unsupported chain', async () => {
    await expect(
      async () =>
        await expectSaga(
          handleRequest,
          createMockActionableRequest({
            method: SupportedActions.eth_sendTransaction,
            params: [txParams],
            chainId: 'eip155:unsupported',
          })
        )
          .withState(state)
          .run()
    ).rejects.toThrow('unsupported network')
    expect(viemWallet.sendTransaction).not.toHaveBeenCalled()
  })

  describe('wallet_getCapabilities', () => {
    const expectedSmartAccountResult = {
      '0xaa36a7': { atomic: { status: 'supported' }, paymasterService: { supported: false } },
      '0x66eee': { atomic: { status: 'supported' }, paymasterService: { supported: false } },
    }

    it('returns all supported chains capabilities when client did not provide any hex chain ids', async () => {
      const request = createMockActionableRequest({
        method: SupportedActions.wallet_getCapabilities,
        params: [state.web3.account],
        chainId: 'eip155:11155111',
      })

      await expectSaga(handleRequest, request)
        .withState(state)
        .returns(expectedSmartAccountResult)
        .run()
    })

    it('handles hex chain ids in wallet_getCapabilities when client provided some hex chain ids', async () => {
      const request = createMockActionableRequest({
        method: SupportedActions.wallet_getCapabilities,
        params: [state.web3.account, ['0xaa36a7', '0x66eee']], // ethereum-sepolia and arbitrum-sepolia
        chainId: 'eip155:11155111',
      })

      await expectSaga(handleRequest, request)
        .withState(state)
        .returns(expectedSmartAccountResult)
        .run()
    })

    it('falls back to default capabilities when feature gate is disabled', async () => {
      mockGetFeatureGate.mockReturnValueOnce(false)

      const request = createMockActionableRequest({
        method: SupportedActions.wallet_getCapabilities,
        params: [state.web3.account],
        chainId: 'eip155:11155111',
      })

      const expectedDefaultResult = {
        '0xaa36a7': { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
        '0x66eee': { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
      }

      await expectSaga(handleRequest, request).withState(state).returns(expectedDefaultResult).run()
    })
  })

  describe('wallet_sendCalls', () => {
    const NOW = 1_000_000_000_000

    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(NOW)
    })

    afterEach(() => {
      jest.useRealTimers()
    })
    const preparedRequest = {
      success: true as const,
      data: [serializableSendTransactionRequest, serializableSendTransactionRequest],
    }

    const sendCallsRequest = createMockActionableRequest({
      method: SupportedActions.wallet_sendCalls,
      params: [
        {
          id: '0xabc',
          calls: [
            { to: '0xTEST', data: '0x' },
            { to: '0xTEST', data: '0x' },
          ],
        },
      ],
      chainId: 'eip155:11155111',
      preparedRequest,
    })

    beforeEach(() => {
      mockGetFeatureGate.mockImplementation(
        (gate) => gate !== StatsigFeatureGates.USE_SMART_ACCOUNT_CAPABILITIES
      )
    })

    it('supports sequential execution, records batch, and returns capabilities', async () => {
      viemWallet.sendTransaction = jest
        .fn()
        .mockResolvedValueOnce('0xaaa')
        .mockResolvedValueOnce('0xbbb')

      const expectedResult = {
        id: '0xabc',
        capabilities: { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
      }

      await expectSaga(handleRequest, sendCallsRequest)
        .withState(state)
        .call(unlockAccount, '0xwallet')
        .call([viemWallet, 'sendTransaction'], serializableSendTransactionRequest)
        .call([viemWallet, 'sendTransaction'], serializableSendTransactionRequest)
        .put(
          addBatch({
            id: '0xabc',
            transactionHashes: ['0xaaa', '0xbbb'],
            atomic: false,
            expiresAt: NOW + BATCH_STATUS_TTL,
          })
        )
        .returns(expectedResult)
        .run()
    })

    it('aborts sequential execution if one transaction fails', async () => {
      viemWallet.sendTransaction = jest
        .fn()
        .mockResolvedValueOnce('0x1234')
        .mockRejectedValueOnce(new Error('error'))

      const sendCallsRequest = createMockActionableRequest({
        method: SupportedActions.wallet_sendCalls,
        params: [
          {
            id: '0xabc',
            calls: [
              { to: '0xTEST', data: '0x' },
              { to: '0xTEST', data: '0x' },
              { to: '0xTEST', data: '0x' },
            ],
          },
        ],
        chainId: 'eip155:11155111',
        preparedRequest,
      })

      const expectedResult = {
        id: '0xabc',
        capabilities: { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
      }

      await expectSaga(handleRequest, sendCallsRequest)
        .withState(state)
        .call(unlockAccount, '0xwallet')
        .put(
          addBatch({
            id: '0xabc',
            transactionHashes: ['0x1234'],
            atomic: false,
            expiresAt: NOW + BATCH_STATUS_TTL,
          })
        )
        .returns(expectedResult)
        .run()

      expect(viemWallet.sendTransaction).toHaveBeenCalledTimes(2)
    })
  })

  describe('wallet_getCallsStatus', () => {
    const receiptSuccess: TransactionReceipt = {
      blockHash: '0xblock',
      blockNumber: BigInt(1),
      contractAddress: null,
      cumulativeGasUsed: BigInt(1),
      effectiveGasPrice: BigInt(1),
      from: '0x0000000000000000000000000000000000000001',
      gasUsed: BigInt(1),
      logs: [],
      logsBloom: '0x0' as Hex,
      status: 'success',
      to: '0x0000000000000000000000000000000000000002',
      transactionHash: '0xhash',
      transactionIndex: 0,
      type: '2',
    }

    const receiptReverted: TransactionReceipt = {
      ...receiptSuccess,
      transactionHash: '0xreverted',
      status: 'reverted',
    }

    const chainId = 'eip155:11155111'
    const batchId = '0xabc'

    const baseResult = {
      version: '2.0.0',
      id: batchId,
      chainId: '0xaa36a7',
      atomic: false,
      capabilities: {
        atomic: { status: 'unsupported' },
        paymasterService: { supported: false },
      },
    }

    const getCallsStatusRequest = createMockActionableRequest({
      method: SupportedActions.wallet_getCallsStatus,
      params: [batchId],
      chainId: chainId,
    })

    const mockCapabilities = {
      [chainId]: {
        atomic: { status: 'unsupported' },
        paymasterService: { supported: false },
      },
    }

    it('returns pending status when any receipt is missing', async () => {
      const mockReceipts = [
        { status: 'fulfilled', value: receiptSuccess },
        {
          status: 'rejected',
          reason: new TransactionReceiptNotFoundError({ hash: '0xhash2' }),
        },
      ]

      await expectSaga(handleRequest, getCallsStatusRequest)
        .withState(
          createMockStore({
            sendCalls: {
              batchById: {
                [batchId]: {
                  transactionHashes: ['0xhash', '0xhash2'],
                  atomic: false,
                  expiresAt: Date.now() + BATCH_STATUS_TTL,
                },
              },
            },
          }).getState()
        )
        .provide([
          [matchers.call.fn(fetchTransactionReceipts), mockReceipts],
          [matchers.call.fn(getWalletCapabilitiesByWalletConnectChainId), mockCapabilities],
        ])
        .returns({
          ...baseResult,
          status: 100,
          receipts: [receiptSuccess],
        })
        .run()
    })

    it('returns success status when all receipts succeeded', async () => {
      const receiptSuccess2 = { ...receiptSuccess, transactionHash: '0xhash2' }

      const mockReceipts = [
        { status: 'fulfilled', value: receiptSuccess },
        { status: 'fulfilled', value: receiptSuccess2 },
      ]

      await expectSaga(handleRequest, getCallsStatusRequest)
        .withState(
          createMockStore({
            sendCalls: {
              batchById: {
                [batchId]: {
                  transactionHashes: ['0xhash', '0xhash2'],
                  atomic: true,
                  expiresAt: Date.now() + BATCH_STATUS_TTL,
                },
              },
            },
          }).getState()
        )
        .provide([
          [matchers.call.fn(fetchTransactionReceipts), mockReceipts],
          [matchers.call.fn(getWalletCapabilitiesByWalletConnectChainId), mockCapabilities],
        ])
        .returns({
          ...baseResult,
          atomic: true,
          status: 200,
          receipts: [receiptSuccess, receiptSuccess2],
        })
        .run()
    })

    it('returns partial failure when receipts include both success and reverted', async () => {
      const mockReceipts = [
        { status: 'fulfilled', value: receiptSuccess },
        { status: 'fulfilled', value: receiptReverted },
      ]

      await expectSaga(handleRequest, getCallsStatusRequest)
        .withState(
          createMockStore({
            sendCalls: {
              batchById: {
                [batchId]: {
                  transactionHashes: ['0xhash', '0xreverted'],
                  atomic: false,
                  expiresAt: Date.now() + BATCH_STATUS_TTL,
                },
              },
            },
          }).getState()
        )
        .provide([
          [matchers.call.fn(fetchTransactionReceipts), mockReceipts],
          [matchers.call.fn(getWalletCapabilitiesByWalletConnectChainId), mockCapabilities],
        ])
        .returns({
          ...baseResult,
          status: 600,
          receipts: [receiptSuccess, receiptReverted],
        })
        .run()
    })

    it('throws when receipt fetch rejects with unexpected error', async () => {
      const mockError = new Error('something went wrong')
      const mockReceipts = [
        { status: 'fulfilled', value: receiptSuccess },
        { status: 'rejected', reason: mockError },
      ]

      await expect(
        expectSaga(handleRequest, getCallsStatusRequest)
          .withState(
            createMockStore({
              sendCalls: {
                batchById: {
                  [batchId]: {
                    transactionHashes: ['0xhash', '0xhash2'],
                    atomic: false,
                    expiresAt: Date.now() + BATCH_STATUS_TTL,
                  },
                },
              },
            }).getState()
          )
          .provide([
            [matchers.call.fn(fetchTransactionReceipts), mockReceipts],
            [matchers.call.fn(getWalletCapabilitiesByWalletConnectChainId), mockCapabilities],
          ])
          .run()
      ).rejects.toThrow(mockError)
    })
  })
})
