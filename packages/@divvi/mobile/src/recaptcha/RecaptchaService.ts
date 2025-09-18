import {
  Recaptcha,
  RecaptchaAction,
  type RecaptchaClient,
} from '@google-cloud/recaptcha-enterprise-react-native'
import { Platform } from 'react-native'
import { getAppConfig } from 'src/appConfig'
import { type PublicAppConfig } from 'src/public'
import Logger from 'src/utils/Logger'

const TAG = 'recaptcha/RecaptchaService'

export enum RecaptchaActionType {
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
  KEYLESS_BACKUP = 'KEYLESS_BACKUP',
}

class RecaptchaService {
  private client: RecaptchaClient | null = null
  private initializationPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  private async performInitialization(): Promise<void> {
    try {
      const appConfig: PublicAppConfig = getAppConfig()
      const recaptchaConfig = appConfig.experimental?.recaptcha

      if (!recaptchaConfig?.enabled) {
        Logger.info(TAG, 'reCAPTCHA not enabled')
        return
      }

      // Get the appropriate site key for the current platform
      let siteKey: string | undefined
      const platform = Platform.OS

      if (platform === 'ios') {
        siteKey = recaptchaConfig.iOSSiteKey
        if (siteKey) {
          Logger.debug(TAG, 'Using iOS site key for reCAPTCHA')
        } else {
          Logger.warn(TAG, 'iOS site key not configured for reCAPTCHA')
        }
      } else if (platform === 'android') {
        siteKey = recaptchaConfig.androidSiteKey
        if (siteKey) {
          Logger.debug(TAG, 'Using Android site key for reCAPTCHA')
        } else {
          Logger.warn(TAG, 'Android site key not configured for reCAPTCHA')
        }
      } else {
        Logger.warn(TAG, `Unsupported platform for reCAPTCHA: ${platform}`)
        return
      }

      if (!siteKey) {
        Logger.warn(TAG, `No reCAPTCHA site key configured for platform: ${platform}`)
        return
      }

      Logger.info(TAG, `Initializing reCAPTCHA client for platform: ${platform}`)
      this.client = await Recaptcha.fetchClient(siteKey)
      Logger.info(TAG, 'reCAPTCHA client initialized successfully')
    } catch (error) {
      Logger.error(TAG, 'Failed to initialize reCAPTCHA client', error)
      throw error
    }
  }

  /**
   * Get a reCAPTCHA token for a specific action
   * @param actionType - The type of action being performed
   * @returns Promise<string> - The reCAPTCHA token
   */
  async getToken(actionType: RecaptchaActionType): Promise<string> {
    await this.initialize()

    if (!this.client) {
      throw new Error('reCAPTCHA client not available')
    }

    try {
      let action: RecaptchaAction

      switch (actionType) {
        case RecaptchaActionType.PHONE_VERIFICATION:
          action = RecaptchaAction.custom('PHONE_VERIFICATION')
          break
        case RecaptchaActionType.KEYLESS_BACKUP:
          action = RecaptchaAction.custom('KEYLESS_BACKUP')
          break
        default:
          throw new Error(`Unknown action type: ${actionType}`)
      }

      Logger.debug(TAG, `Executing reCAPTCHA for action: ${actionType}`)
      const token = await this.client.execute(action)
      Logger.debug(TAG, `reCAPTCHA token generated for action: ${actionType}`)

      return token
    } catch (error) {
      Logger.error(TAG, `Failed to get reCAPTCHA token for action: ${actionType}`, error)
      throw error
    }
  }

  /**
   * Check if reCAPTCHA is enabled
   * @returns boolean - True if reCAPTCHA is enabled, false otherwise
   */
  isEnabled(): boolean {
    const appConfig: PublicAppConfig = getAppConfig()
    const recaptchaConfig = appConfig.experimental?.recaptcha
    
    if (!recaptchaConfig?.enabled) {
      return false
    }
    
    const siteKey = Platform.OS === 'ios' ? recaptchaConfig.iOSSiteKey : recaptchaConfig.androidSiteKey
    return !!siteKey
  }
}

export const recaptchaService = new RecaptchaService()
