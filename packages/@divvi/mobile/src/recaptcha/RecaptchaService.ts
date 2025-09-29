import {
  Recaptcha,
  RecaptchaAction,
  type RecaptchaClient,
} from '@google-cloud/recaptcha-enterprise-react-native'
import { Platform } from 'react-native'
import { getAppConfig } from 'src/appConfig'
import Logger from 'src/utils/Logger'

const TAG = 'recaptcha/RecaptchaService'
const RECAPTCHA_ACTION_TIMEOUT_MS = 10000 // 10 seconds

export enum RecaptchaActionType {
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
  KEYLESS_BACKUP = 'KEYLESS_BACKUP',
}

class RecaptchaServiceImpl {
  private client: RecaptchaClient | null = null
  private initializationPromise: Promise<RecaptchaClient | null> | null = null

  /**
   * Get the reCAPTCHA client
   * @returns Promise<RecaptchaClient | null> - The reCAPTCHA client or null if no client is found
   */
  async getClient(): Promise<RecaptchaClient | null> {
    if (this.client) {
      return this.client
    }
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    const siteKey = this.getSiteKey()
    if (!siteKey) {
      Logger.info(TAG, 'No reCAPTCHA site key found, not initializing reCAPTCHA client')
      return null
    }

    this.initializationPromise = (async () => {
      try {
        this.client = await Recaptcha.fetchClient(siteKey)
        return this.client
      } catch (e) {
        this.initializationPromise = null // allow external retry
        throw e
      }
    })()

    return this.initializationPromise
  }

  /**
   * Get a reCAPTCHA token for a specific action
   * @param actionType - The type of action being performed
   * @returns Promise<string> - The reCAPTCHA token or null if no client is found
   */
  async getToken(action: RecaptchaActionType): Promise<string | null> {
    try {
      const client = await this.getClient()
      if (!client) {
        // This should never happen if consumers check isEnabled() before calling getToken()
        Logger.debug(
          TAG,
          `No reCAPTCHA client found, not executing reCAPTCHA for action: ${action}`
        )
        return null
      }

      Logger.debug(TAG, `Executing reCAPTCHA for action: ${action}`)
      const token = await client.execute(
        RecaptchaAction.custom(action),
        RECAPTCHA_ACTION_TIMEOUT_MS
      )
      Logger.debug(TAG, `reCAPTCHA token generated for action: ${action}`)

      return token
    } catch (error) {
      Logger.error(TAG, `Failed to get reCAPTCHA token for action: ${action}`, error)
      throw error
    }
  }

  private getSiteKey(): string | undefined {
    const platform = Platform.OS
    const recaptchaConfig = getAppConfig().experimental?.recaptcha

    return recaptchaConfig?.[platform === 'ios' ? 'iOSSiteKey' : 'androidSiteKey']
  }

  isEnabled(): boolean {
    const siteKey = this.getSiteKey()
    return !!siteKey
  }
}

export const RecaptchaService = new RecaptchaServiceImpl()
