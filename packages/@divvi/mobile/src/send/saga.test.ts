import BigNumber from 'bignumber.js'
import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { EffectProviders, StaticProvider, throwError } from 'redux-saga-test-plan/providers'
import { call } from 'redux-saga/effects'
import { showError } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { CeloExchangeEvents, SendEvents } from 'src/analytics/Events'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { navigateBack, navigateInitialTab } from 'src/navigator/NavigationService'
import {
  Actions,
  SendPaymentAction,
  sendPaymentFailure,
  sendPaymentSuccess,
} from 'src/send/actions'
import { sendPaymentSaga } from 'src/send/saga'
import { addStandbyTransaction, transactionConfirmed } from 'src/transactions/slice'
import { NetworkId, TokenTransactionTypeV2 } from 'src/transactions/types'
import { publicClient } from 'src/viem'
import { ViemWallet } from 'src/viem/getLockableWallet'
import { getViemWallet } from 'src/web3/contracts'
import networkConfig from 'src/web3/networkConfig'
import {
  UnlockResult,
  getConnectedAccount,
  getConnectedUnlockedAccount,
  unlockAccount,
} from 'src/web3/saga'
import { createMockStore } from 'test/utils'
import {
  mockAccount,
  mockCeloAddress,
  mockCeloTokenId,
  mockCusdAddress,
  mockCusdTokenId,
  mockQRCodeRecipient,
} from 'test/values'
import { getTransactionCount } from 'viem/actions'

const mockNewTransactionContext = jest.fn()

jest.mock('src/transactions/types', () => {
  const originalModule = jest.requireActual('src/transactions/types')

  return {
    ...originalModule,
    newTransactionContext: (tag: string, description: string) =>
      mockNewTransactionContext(tag, description),
  }
})

jest.mock('src/web3/networkConfig', () => {
  const originalModule = jest.requireActual('src/web3/networkConfig')
  return {
    __esModule: true,
    ...originalModule,
    default: {
      ...originalModule.default,
      networkToNetworkId: {
        celo: 'celo-alfajores',
        ethereum: 'ethereuim-sepolia',
      },
      defaultNetworkId: 'celo-alfajores',
    },
  }
})

const mockContext = { id: 'mock' }
mockNewTransactionContext.mockReturnValue(mockContext)

describe(sendPaymentSaga, () => {
  const amount = new BigNumber(10)
  const sendAction: SendPaymentAction = {
    type: Actions.SEND_PAYMENT,
    amount,
    tokenId: mockCusdTokenId,
    usdAmount: amount,
    recipient: mockQRCodeRecipient,
    fromExternal: false,
    preparedTransaction: {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
    },
  }
  const mockViemWallet = {
    account: { address: mockAccount },
    signTransaction: jest.fn(),
    sendRawTransaction: jest.fn(),
    getChainId: jest.fn(),
  } as any as ViemWallet
  const mockTxHash: `0x${string}` = '0x12345678901234'
  const mockTxReceipt = {
    status: 'success',
    transactionHash: mockTxHash,
    blockNumber: 123,
    gasUsed: BigInt(1e6),
    effectiveGasPrice: BigInt(1e9),
  }
  function createDefaultProviders() {
    const defaultProviders: (EffectProviders | StaticProvider)[] = [
      [call(getConnectedUnlockedAccount), mockAccount],
      [matchers.call.fn(getViemWallet), mockViemWallet],
      [matchers.call.fn(getTransactionCount), 10],
      [matchers.call.fn(mockViemWallet.signTransaction), '0xsomeSerialisedTransaction'],
      [matchers.call.fn(mockViemWallet.sendRawTransaction), mockTxHash],
      [matchers.call.fn(publicClient.celo.waitForTransactionReceipt), mockTxReceipt],
      [matchers.call.fn(publicClient.celo.getBlock), { timestamp: 1701102971 }],
    ]

    return defaultProviders
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    {
      testSuffix: 'navigates home when not initiated from modal',
      fromExternal: false,
      navigateFn: navigateInitialTab,
    },
    {
      testSuffix: 'navigates back when initiated from modal',
      fromExternal: true,
      navigateFn: navigateBack,
    },
  ])(
    'sends a payment successfully with viem and $testSuffix',
    async ({ fromExternal, navigateFn }) => {
      await expectSaga(sendPaymentSaga, { ...sendAction, fromExternal })
        .withState(createMockStore({}).getState())
        .provide(createDefaultProviders())
        .call(getViemWallet, networkConfig.viemChain.celo, false)
        .put(
          addStandbyTransaction({
            context: { id: 'mock' },
            type: TokenTransactionTypeV2.Sent,
            networkId: NetworkId['celo-alfajores'],
            amount: {
              value: BigNumber(10).negated().toString(),
              tokenAddress: mockCusdAddress,
              tokenId: mockCusdTokenId,
            },
            address: mockQRCodeRecipient.address,
            metadata: {},
            feeCurrencyId: mockCeloTokenId,
            transactionHash: mockTxHash,
          })
        )
        .put(sendPaymentSuccess({ amount, tokenId: mockCusdTokenId }))
        .run()

      expect(navigateFn).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledTimes(2)
      expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_tx_start)
      expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_tx_complete, {
        txId: mockContext.id,
        recipientAddress: mockQRCodeRecipient.address,
        amount: '10',
        usdAmount: '10',
        tokenAddress: mockCusdAddress,
        tokenId: mockCusdTokenId,
        networkId: 'celo-alfajores',
        isTokenManuallyImported: false,
      })
    }
  )

  it('sends a payment successfully for celo and logs a withdrawal event', async () => {
    await expectSaga(sendPaymentSaga, { ...sendAction, tokenId: mockCeloTokenId })
      .withState(createMockStore({}).getState())
      .provide(createDefaultProviders())
      .call(getViemWallet, networkConfig.viemChain.celo, false)
      .put(
        addStandbyTransaction({
          context: { id: 'mock' },
          type: TokenTransactionTypeV2.Sent,
          networkId: NetworkId['celo-alfajores'],
          amount: {
            value: BigNumber(10).negated().toString(),
            tokenAddress: mockCeloAddress,
            tokenId: mockCeloTokenId,
          },
          address: mockQRCodeRecipient.address,
          metadata: {},
          feeCurrencyId: mockCeloTokenId,
          transactionHash: mockTxHash,
        })
      )
      .put(sendPaymentSuccess({ amount, tokenId: mockCeloTokenId }))
      .run()

    expect(AppAnalytics.track).toHaveBeenCalledTimes(3)
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_tx_start)
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_tx_complete, {
      txId: mockContext.id,
      recipientAddress: mockQRCodeRecipient.address,
      amount: '10',
      usdAmount: '10',
      tokenAddress: mockCeloAddress,
      tokenId: mockCeloTokenId,
      networkId: 'celo-alfajores',
      isTokenManuallyImported: false,
    })
    expect(AppAnalytics.track).toHaveBeenCalledWith(CeloExchangeEvents.celo_withdraw_completed, {
      amount: '10',
    })
  })

  it('fails if user cancels PIN input', async () => {
    const account = '0x000123'
    await expectSaga(sendPaymentSaga, sendAction)
      .withState(createMockStore({}).getState())
      .provide([
        [call(getConnectedAccount), account],
        [matchers.call.fn(unlockAccount), UnlockResult.CANCELED],
      ])
      .put(showError(ErrorMessages.PIN_INPUT_CANCELED))
      .put(sendPaymentFailure())
      .run()
    // 1 call for start of send transaction plus 2 calls from showError, one
    // with the error handler and one with the assertion above
    expect(AppAnalytics.track).toHaveBeenCalledTimes(3)
  })

  it('fails if sendRawTransaction throws', async () => {
    await expectSaga(sendPaymentSaga, sendAction)
      .withState(createMockStore({}).getState())
      .provide([
        [matchers.call.fn(mockViemWallet.sendRawTransaction), throwError(new Error('tx failed'))],
        ...createDefaultProviders(),
      ])
      .call(getViemWallet, networkConfig.viemChain.celo, false)
      .put(sendPaymentFailure())
      .put(showError(ErrorMessages.SEND_PAYMENT_FAILED))
      .not.put.actionType(addStandbyTransaction.type)
      .not.put.actionType(transactionConfirmed.type)
      .run()
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_tx_start)
    expect(AppAnalytics.track).toHaveBeenCalledWith(SendEvents.send_tx_error, {
      error: 'tx failed',
    })
  })
})
