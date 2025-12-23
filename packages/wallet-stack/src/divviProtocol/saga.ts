import { Address, submitReferral } from '@divvi/referral-sdk'
import Logger from 'src/utils/Logger'
import { call, delay } from 'typed-redux-saga'

const TAG = 'divviProtocol/saga'

export function* submitDivviReferralSaga({
  txHash,
  chainId,
}: {
  txHash: Address
  chainId: number
}) {
  let attempt = 0
  const MAX_ATTEMPTS = 5

  while (attempt < MAX_ATTEMPTS) {
    try {
      Logger.info(TAG, `Submitting divvi referral ${txHash} attempt ${attempt + 1}`)
      yield* call(submitReferral, { txHash, chainId })
      Logger.info(TAG, `Divvi referral ${txHash} successful`)
      break // Exit on success
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Client error')) {
        // Do not retry on client errors
        Logger.info(TAG, `Divvi referral ${txHash} cancelled due to client error`)
        break
      }

      // Retry on server errors (5xx)
      attempt += 1
      if (attempt >= MAX_ATTEMPTS) {
        // If we've reached the max attempts, pause. We'll retry on the next app load.
        Logger.warn(TAG, `Divvi referral ${txHash} failed after ${MAX_ATTEMPTS} attempts`)
        break
      }

      const backoff = Math.min(2 ** attempt * 1000, 30000) // Exponential, capped at 30s
      Logger.info(TAG, `Retrying divvi referral ${txHash} in ${backoff}ms`)
      yield* delay(backoff)
    }
  }
}
