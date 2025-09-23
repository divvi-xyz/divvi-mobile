import { PayloadAction } from '@reduxjs/toolkit'
import BigNumber from 'bignumber.js'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { JumpstartEvents } from 'src/analytics/Events'
import {
  JumpstarReclaimAction,
  jumpstartReclaimFailed,
  jumpstartReclaimStarted,
  jumpstartReclaimSucceeded,
} from 'src/jumpstart/slice'
import { BaseStandbyTransaction } from 'src/transactions/slice'
import { TokenTransactionTypeV2, newTransactionContext } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { safely } from 'src/utils/safely'
import { publicClient } from 'src/viem'
import { sendPreparedTransactions } from 'src/viem/saga'
import { networkIdToNetwork } from 'src/web3/networkConfig'
import { call, put, spawn, takeEvery } from 'typed-redux-saga'
import { Address } from 'viem'

const TAG = 'WalletJumpstart/saga'

export function* jumpstartReclaim(action: PayloadAction<JumpstarReclaimAction>) {
  const { reclaimTx, networkId, tokenAmount, depositTxHash } = action.payload
  try {
    const createStandbyReclaimTransaction = (
      transactionHash: string,
      _feeCurrencyId?: string
    ): BaseStandbyTransaction => {
      return {
        context: newTransactionContext(TAG, 'Reclaim transaction'),
        networkId,
        type: TokenTransactionTypeV2.Received,
        transactionHash: transactionHash,
        amount: {
          value: new BigNumber(tokenAmount.value).negated().toString(),
          tokenId: tokenAmount.tokenId,
          tokenAddress: tokenAmount.tokenAddress,
        },
        address: reclaimTx.to as Address,
        metadata: {},
      }
    }

    Logger.debug(`${TAG}/jumpstartReclaim`, 'Executing reclaim transaction', reclaimTx)
    const [txHash] = yield* call(sendPreparedTransactions, [reclaimTx], networkId, [
      createStandbyReclaimTransaction,
    ])

    Logger.debug(`${TAG}/jumpstartReclaim`, 'Waiting for transaction receipt')
    const txReceipt = yield* call(
      [publicClient[networkIdToNetwork[networkId]], 'waitForTransactionReceipt'],
      {
        hash: txHash,
      }
    )
    Logger.debug(`${TAG}/jumpstartReclaim`, `Received transaction receipt`, txReceipt)

    if (txReceipt.status !== 'success') {
      throw new Error(`Jumpstart reclaim transaction reverted: ${txReceipt.transactionHash}`)
    }

    yield* put(jumpstartReclaimSucceeded())
    AppAnalytics.track(JumpstartEvents.jumpstart_reclaim_succeeded, {
      networkId,
      depositTxHash,
      reclaimTxHash: txHash,
    })
  } catch (err) {
    Logger.warn(TAG, 'Error reclaiming jumpstart transaction', err)
    AppAnalytics.track(JumpstartEvents.jumpstart_reclaim_failed, { networkId, depositTxHash })
    yield* put(jumpstartReclaimFailed())
  }
}

function* watchJumpstartTransaction() {
  yield* takeEvery(jumpstartReclaimStarted.type, safely(jumpstartReclaim))
}

export function* jumpstartSaga() {
  yield* spawn(watchJumpstartTransaction)
}
