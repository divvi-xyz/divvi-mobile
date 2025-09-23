import Logger from 'src/utils/Logger'
import { recaptchaService } from './RecaptchaService'

const TAG = 'recaptcha/initializeRecaptcha'

export async function initializeRecaptcha(): Promise<void> {
  try {
    Logger.info(TAG, 'Initializing reCAPTCHA service')
    await recaptchaService.initialize()
    Logger.info(TAG, 'reCAPTCHA service initialized successfully')
  } catch (error) {
    Logger.error(TAG, 'Failed to initialize reCAPTCHA service', error)
  }
}
