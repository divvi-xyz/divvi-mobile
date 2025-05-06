import { getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import { getAppConfig } from 'src/appConfig'
import { store } from 'src/redux/store'
import Logger from 'src/utils/Logger'
import { TransactionRequest } from 'src/viem/prepareTransactions'
import { Address } from 'viem'
import { markReferralSuccessful, selectIsReferralSuccessful } from './slice'

/**
 * Checks if a user is referred to each provider and returns a data suffix for providers
 * where the user is not yet referred.
 *
 * @param walletAddress - The address of the user being referred
 * @returns A data suffix string for providers where the user is not yet referred, or empty string if no referrals needed
 */
export async function getDivviData({ walletAddress }: { walletAddress: Address }) {
  const config = getAppConfig()
  const consumer = config.divviProtocol?.divviId
  const providers = config.divviProtocol?.campaignIds

  if (!consumer || !providers) {
    return ''
  }

  // Check if this combination has already been successfully referred
  const state = store.getState()
  if (selectIsReferralSuccessful(state, consumer, providers)) {
    return ''
  }

  Logger.info(
    'DivviProtocol',
    `${consumer} is referring ${walletAddress} to ${providers.join(', ')}`
  )

  return getDataSuffix({ consumer, providers })
}

/**
 * Submits a referral to the Divvi protocol if the transaction data ends with the appropriate suffix.
 * This function handles the referral submission process, including retry logic for failed submissions
 * and updating the Redux store with successful referrals.
 *
 * @param {Object} params - The parameters for submitting a referral
 * @param {Address} params.walletAddress - The wallet address of the user
 * @param {Address} params.txHash - The transaction hash
 * @param {number} params.chainId - The chain ID for the transaction
 * @param {TransactionRequest} params.transactionRequest - The transaction request to check for referral suffix
 */
export async function submitDivviReferralIfNeeded({
  walletAddress,
  txHash,
  chainId,
  transactionRequest,
}: {
  walletAddress: Address
  txHash: Address
  chainId: number
  transactionRequest: TransactionRequest
}) {
  const config = getAppConfig()
  const consumer = config.divviProtocol?.divviId
  const providers = config.divviProtocol?.campaignIds

  if (!consumer || !providers) {
    return
  }

  const divviSuffix = getDataSuffix({ consumer, providers })

  if (transactionRequest.data?.endsWith(divviSuffix)) {
    try {
      await submitReferral({
        txHash,
        chainId,
      })

      // Mark all providers as successfully referred at once
      store.dispatch(markReferralSuccessful({ divviId: consumer, campaignIds: providers }))

      Logger.info(
        'DivviProtocol',
        `Submitted referral for consumer ${consumer} referring the user ${walletAddress} to ${providers.join(', ')}`
      )
    } catch (error) {
      if (error instanceof Error && error.message.includes('Client should retry the request')) {
        // try again
        Logger.info(
          'DivviProtocol',
          `Retrying referral for consumer ${consumer} referring the user ${walletAddress} to ${providers.join(', ')}`
        )
        // Sometimes the first attempt fails because the transaction is still being confirmed
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await submitReferral({
          txHash,
          chainId,
        })

        // Mark all providers as successfully referred at once after retry
        store.dispatch(markReferralSuccessful({ divviId: consumer, campaignIds: providers }))
      } else {
        Logger.error(
          'DivviProtocol',
          `Error submitting referral for consumer ${consumer} referring the user ${walletAddress} to ${providers.join(', ')}`,
          error
        )
      }
    }
  }
}
