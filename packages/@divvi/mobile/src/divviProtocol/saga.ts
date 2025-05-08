import { Address, getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import { getAppConfig } from 'src/appConfig'
import { RootState } from 'src/redux/store'
import { TransactionRequest } from 'src/viem/prepareTransactions'
import { call, delay, put, select, takeEvery } from 'typed-redux-saga'
import { referralCancelled, referralSubmitted, referralSuccessful } from './slice'

function* submitReferralSaga(action: ReturnType<typeof referralSubmitted>): Generator {
  const referral = action.payload
  let attempt = 0
  const MAX_ATTEMPTS = 5

  while (attempt < MAX_ATTEMPTS) {
    try {
      yield* call(submitReferral, referral)
      yield* put(referralSuccessful(referral))
      break // Exit on success
    } catch (error: unknown) {
      const status = error instanceof Error ? 500 : (error as { status?: number }).status || 500

      if (status >= 400 && status < 500) {
        // Do not retry on client errors
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

function* processPendingReferralSaga(): Generator {
  const state = yield* select((state: RootState) => state.divviProtocol)

  if (state.pendingReferral) {
    yield* put(referralSubmitted(state.pendingReferral))
  }
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

  const divviSuffix = yield* call(getDataSuffix, { consumer, providers })

  if (transactionRequest.data?.endsWith(divviSuffix)) {
    yield* put(
      referralSubmitted({
        txHash,
        chainId,
        divviId: consumer,
        campaignIds: providers,
      })
    )
  }
}

export function* divviProtocolSaga(): Generator {
  yield* takeEvery(referralSubmitted.type, submitReferralSaga)
  yield* takeEvery('APP_LOADED', processPendingReferralSaga)
}
