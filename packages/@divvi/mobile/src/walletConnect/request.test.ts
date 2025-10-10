import { expectSaga } from 'redux-saga-test-plan'
import { NetworkId } from 'src/transactions/types'
import { ViemWallet } from 'src/viem/getLockableWallet'
import {
  SerializableTransactionRequest,
  getPreparedTransaction,
} from 'src/viem/preparedTransactionSerialization'
import { SupportedActions } from 'src/walletConnect/constants'
import { handleRequest } from 'src/walletConnect/request'
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

const createMockActionableRequest = ({
  method,
  params,
  chainId,
  preparedTransaction,
}: {
  method: SupportedActions
  params: any[]
  chainId: string
  preparedTransaction?: PreparedTransactionResult<SerializableTransactionRequest>
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
    preparedTransaction,
  }) as ActionableRequest

const txParams = {
  from: '0xTEST',
  to: '0xTEST',
  data: '0x',
  nonce: 7,
  gas: '0x5208',
  value: '0x01',
}

const preparedTransaction = {
  success: true as const,
  data: txParams as SerializableTransactionRequest,
}

const signTransactionRequest = createMockActionableRequest({
  method: SupportedActions.eth_signTransaction,
  params: [txParams],
  chainId: 'eip155:44787',
  preparedTransaction,
})
const serializableTransactionRequest = signTransactionRequest.request.params.request
  .params[0] as SerializableTransactionRequest
const sendTransactionRequest = createMockActionableRequest({
  method: SupportedActions.eth_sendTransaction,
  params: [txParams],
  chainId: 'eip155:44787',
  preparedTransaction,
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

  beforeAll(function* () {
    viemWallet = yield* getViemWallet(celoAlfajores)
  })

  beforeEach(() => {
    jest.clearAllMocks()
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
    const expectedResult = {
      '0xaa36a7': { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
      '0x66eee': { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
    }

    it('returns all supported chains capabilities when client did not provide any hex chain ids', async () => {
      const request = createMockActionableRequest({
        method: SupportedActions.wallet_getCapabilities,
        params: [state.web3.account],
        chainId: 'eip155:11155111',
      })

      await expectSaga(handleRequest, request).withState(state).returns(expectedResult).run()
    })

    it('handles hex chain ids in wallet_getCapabilities when client provided some hex chain ids', async () => {
      const request = createMockActionableRequest({
        method: SupportedActions.wallet_getCapabilities,
        params: [state.web3.account, ['0xaa36a7', '0x66eee']], // ethereum-sepolia and arbitrum-sepolia
        chainId: 'eip155:11155111',
      })

      await expectSaga(handleRequest, request).withState(state).returns(expectedResult).run()
    })
  })

  describe('wallet_sendCalls', () => {
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
    })

    const preparedTransactions = {
      success: true as const,
      data: [serializableSendTransactionRequest, serializableSendTransactionRequest],
    }

    it('supports sequential execution and returns capabilities for supported network', async () => {
      const expectedResult = {
        id: '0xabc',
        capabilities: { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
      }

      await expectSaga(handleRequest, {
        ...sendCallsRequest,
        preparedTransactions,
      })
        .withState(state)
        .call(unlockAccount, '0xwallet')
        .call([viemWallet, 'sendTransaction'], serializableSendTransactionRequest)
        .call([viemWallet, 'sendTransaction'], serializableSendTransactionRequest)
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
      })

      const expectedResult = {
        id: '0xabc',
        capabilities: { atomic: { status: 'unsupported' }, paymasterService: { supported: false } },
      }

      await expectSaga(handleRequest, {
        ...sendCallsRequest,
        preparedTransactions,
      })
        .withState(state)
        .call(unlockAccount, '0xwallet')
        .returns(expectedResult)
        .run()

      expect(viemWallet.sendTransaction).toHaveBeenCalledTimes(2)
    })

    it('throws for a wallet_sendCalls request on unsupported chain', async () => {
      await expect(
        async () =>
          await expectSaga(
            handleRequest,
            createMockActionableRequest({
              method: SupportedActions.wallet_sendCalls,
              params: [
                {
                  id: '0xabc',
                  calls: [{ to: '0xTEST', data: '0x' }],
                },
              ],
              chainId: 'eip155:unsupported',
            })
          )
            .withState(state)
            .run()
      ).rejects.toThrow('unsupported network')
      expect(viemWallet.sendTransaction).not.toHaveBeenCalled()
    })

    it('throws error when preparedTransactions fails', async () => {
      const failedPreparedTransactions = {
        success: false as const,
        errorMessage: 'Insufficient balance for gas',
      }

      await expect(
        async () =>
          await expectSaga(handleRequest, {
            ...sendCallsRequest,
            preparedTransactions: failedPreparedTransactions,
          })
            .withState(state)
            .run()
      ).rejects.toThrow('Insufficient balance for gas')
    })
  })
})
