import {
  Recaptcha,
  RecaptchaAction,
  type RecaptchaClient,
} from '@google-cloud/recaptcha-enterprise-react-native'
import { Platform } from 'react-native'
import { getAppConfig } from 'src/appConfig'
import Logger from 'src/utils/Logger'

const TAG = 'recaptcha/RecaptchaService'

export enum RecaptchaActionType {
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
  KEYLESS_BACKUP = 'KEYLESS_BACKUP',
}

class RecaptchaServiceImpl {
  private client: RecaptchaClient | null = null
  private initializationPromise: Promise<void> | null = null

  async initializeIfNecessary(): Promise<void> {
    if (this.client) return
    if (this.initializationPromise) return this.initializationPromise

    this.initializationPromise = this.init()
    try {
      await this.initializationPromise
    } catch (err) {
      // If initialization fails, clear the promise so that we can try again later
      this.initializationPromise = null
      throw err
    }
  }

  private async init(): Promise<void> {
    // If client is already initialized, no need to initialize again
    if (this.client) {
      return
    }

    Logger.info(TAG, 'Initializing reCAPTCHA client')
    const clientKey = this.getClientKey()
    if (!clientKey) {
      Logger.info(TAG, 'No client key found, reCAPTCHA not enabled')
      return
    }

    try {
      this.client = await Recaptcha.fetchClient(clientKey)
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
  async getToken(actionType: RecaptchaActionType): Promise<string | null> {
    if (!this.isEnabled()) {
      return null
    }

    try {
      await this.initializeIfNecessary()
      if (!this.client) {
        // This should never happen - if Recaptcha is enabled, the initialization will either set the client or throw an error.
        throw new Error('reCAPTCHA client not available')
      }

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

  private getClientKey(): string | undefined {
    const platform = Platform.OS
    const recaptchaConfig = getAppConfig().experimental?.recaptcha

    return recaptchaConfig?.[platform === 'ios' ? 'iOSClientKey' : 'androidClientKey']
  }

  isEnabled(): boolean {
    const clientKey = this.getClientKey()
    return !!clientKey
  }
}

export const RecaptchaService = new RecaptchaServiceImpl()
