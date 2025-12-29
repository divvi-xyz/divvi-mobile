import Logger from 'src/utils/Logger'
import { call, delay } from 'typed-redux-saga'
import { RecaptchaService } from './RecaptchaService'

const TAG = 'recaptcha/saga'

export function* recaptchaSaga() {
  if (!RecaptchaService.isEnabled()) {
    return
  }

  Logger.info(TAG, 'Initializing reCAPTCHA client on app start')
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      yield* call([RecaptchaService, 'getClient'])
      return
    } catch (error) {
      Logger.error(TAG, `reCAPTCHA initialization attempt ${attempt} failed`, error)
      if (attempt < 3) {
        yield* delay(1000 * attempt) // 1s, 2s delays
      }
    }
  }
}
