import { Address, getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import { getAppConfig } from 'src/appConfig'
import Logger from 'src/utils/Logger'
import { TransactionRequest } from 'src/viem/prepareTransactions'
import { all, call, delay, put, select, takeEvery } from 'typed-redux-saga'
import { referralCancelled, referralSubmitted, referralSuccessful, selectReferrals } from './slice'

const TAG = 'divviProtocol/saga'
export function* submitReferralSaga(action: ReturnType<typeof referralSubmitted>): Generator {
  const referral = action.payload
  let attempt = 0
  const MAX_ATTEMPTS = 5

  while (attempt < MAX_ATTEMPTS) {
    try {
      Logger.info(TAG, `Submitting referral ${referral.txHash} attempt ${attempt + 1}`)
      yield* call(submitReferral, referral)
      Logger.info(TAG, `Referral ${referral.txHash} successful`)
      yield* put(referralSuccessful(referral))
      break // Exit on success
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Client error')) {
        // Do not retry on client errors
        Logger.info(TAG, `Referral ${referral.txHash} cancelled`)
        yield* put(referralCancelled(referral))
        break
      }

      // Retry on server errors (5xx)
      attempt += 1
      if (attempt >= MAX_ATTEMPTS) {
        // If we've reached the max attempts, pause. We'll retry on the next app load.
        break
      }

      const backoff = Math.min(2 ** attempt * 1000, 30000) // Exponential, capped at 30s
      yield* delay(backoff)
    }
  }
}

function* processPendingReferralSaga() {
  const referrals = yield* select(selectReferrals)

  // process all pending referrals
  yield* all(
    Object.values(referrals).map((referral) => {
      if (referral.status === 'pending') {
        return put(referralSubmitted(referral))
      }
    })
  )
}

export function* submitDivviReferralIfNeededSaga({
  txHash,
  chainId,
  transactionRequest,
}: {
  txHash: Address
  chainId: number
  transactionRequest: TransactionRequest
}) {
  const config = getAppConfig()
  const consumer = config.divviProtocol?.divviId
  const providers = config.divviProtocol?.campaignIds

  if (!consumer || !providers || !providers.length) {
    return
  }

  const divviSuffix = getDataSuffix({ consumer, providers })
  Logger.info(
    TAG,
    `Checking if transaction ${txHash} is a divvi referral for ${consumer} and ${providers.join(', ')}`
  )
  if (transactionRequest.data?.endsWith(divviSuffix)) {
    yield* put(
      referralSubmitted({
        txHash,
        chainId,
        divviId: consumer,
        campaignIds: providers,
        status: 'pending',
      })
    )
  }
}

export function* divviProtocolSaga(): Generator {
  yield* takeEvery(referralSubmitted.type, submitReferralSaga)
  yield* takeEvery('APP_LOADED', processPendingReferralSaga)
}
