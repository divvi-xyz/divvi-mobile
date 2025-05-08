import { getDataSuffix } from '@divvi/referral-sdk'
import { getAppConfig } from 'src/appConfig'
import { store } from 'src/redux/store'
import Logger from 'src/utils/Logger'
import { hasReferralSucceededSelector } from './slice'

/**
 * Checks if a user is referred to each provider and returns a data suffix for providers
 * where the user is not yet referred.
 *
 * @returns A data suffix string for providers where the user is not yet referred, or empty string if no referrals needed
 */
export async function getDivviData() {
  const config = getAppConfig()
  const consumer = config.divviProtocol?.divviId
  const providers = config.divviProtocol?.campaignIds

  if (!consumer || !providers || !providers.length) {
    return ''
  }

  // Check if this combination has already been successfully referred
  const state = store.getState()
  if (hasReferralSucceededSelector(state, consumer, providers)) {
    return ''
  }

  Logger.info('DivviProtocol', `${consumer} is referring to ${providers.join(', ')}`)

  return getDataSuffix({ consumer, providers })
}
