import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { JumpstartEvents } from 'src/analytics/Events'
import {
  jumpstartReclaim
} from 'src/jumpstart/saga'
import {
  jumpstartReclaimFailed,
  jumpstartReclaimStarted,
  jumpstartReclaimSucceeded
} from 'src/jumpstart/slice'
import { Network, NetworkId } from 'src/transactions/types'
import { publicClient } from 'src/viem'
import {
  getSerializablePreparedTransaction
} from 'src/viem/preparedTransactionSerialization'
import { sendPreparedTransactions } from 'src/viem/saga'
import { createMockStore } from 'test/utils'
import { TransactionReceipt } from 'viem'

jest.mock('src/statsig')
jest.mock('src/utils/Logger')
jest.mock('src/analytics/AppAnalytics')
jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  parseEventLogs: jest.fn(),
}))
jest.mock('src/viem/saga', () => ({
  ...jest.requireActual('src/viem/saga'),
  sendPreparedTransactions: jest.fn().mockResolvedValue(['0x1', '0x2']),
}))

const network = Network.Celo

const mockTransactionReceipt = {
  transactionHash: '0xHASH1',
  logs: [],
  status: 'success',
} as unknown as TransactionReceipt

describe('jumpstartReclaim', () => {
  const mockSerializablePreparedTransaction = getSerializablePreparedTransaction({
    from: '0xa',
    to: '0xb',
    value: BigInt(0),
    data: '0x0',
    gas: BigInt(59_480),
  })
  const networkId = NetworkId['celo-alfajores']
  const depositTxHash = '0xaaa'

  it('should send the reclaim transaction and dispatch the success action on success', async () => {
    await expectSaga(jumpstartReclaim, {
      type: jumpstartReclaimStarted.type,
      payload: {
        tokenAmount: {
          value: 1000,
          tokenAddress: '0x123',
          tokenId: 'celo-alfajores:0x123',
        },
        networkId,
        reclaimTx: mockSerializablePreparedTransaction,
        depositTxHash,
      },
    })
      .provide([
        [matchers.call.fn(publicClient[network].waitForTransactionReceipt), mockTransactionReceipt],
      ])
      .withState(createMockStore().getState())
      .put(jumpstartReclaimSucceeded())
      .run()

    expect(sendPreparedTransactions).toHaveBeenCalledWith(
      [mockSerializablePreparedTransaction],
      networkId,
      expect.any(Array)
    )
    expect(AppAnalytics.track).toHaveBeenCalledWith(JumpstartEvents.jumpstart_reclaim_succeeded, {
      networkId,
      depositTxHash,
      reclaimTxHash: '0x1',
    })
  })

  it('should dispatch an error if the reclaim transaction is reverted', async () => {
    await expectSaga(jumpstartReclaim, {
      type: jumpstartReclaimStarted.type,
      payload: {
        tokenAmount: {
          value: 1000,
          tokenAddress: '0x123',
          tokenId: 'celo-alfajores:0x123',
        },
        networkId,
        reclaimTx: mockSerializablePreparedTransaction,
        depositTxHash,
      },
    })
      .provide([
        [
          matchers.call.fn(publicClient[network].waitForTransactionReceipt),
          { ...mockTransactionReceipt, status: 'reverted' },
        ],
      ])
      .withState(createMockStore().getState())
      .not.put(jumpstartReclaimSucceeded())
      .put(jumpstartReclaimFailed())
      .run()

    expect(AppAnalytics.track).toHaveBeenCalledWith(JumpstartEvents.jumpstart_reclaim_failed, {
      networkId,
      depositTxHash,
    })
    expect(sendPreparedTransactions).toHaveBeenCalledWith(
      [mockSerializablePreparedTransaction],
      networkId,
      expect.any(Array)
    )
  })
})
