import { useCallback, useState } from 'react'
import Logger from 'src/utils/Logger'
import { RecaptchaActionType, recaptchaService } from './RecaptchaService'

const TAG = 'recaptcha/useRecaptcha'

interface UseRecaptchaResult {
  getToken: (actionType: RecaptchaActionType) => Promise<string>
  isLoading: boolean
  error: string | null
  isEnabled: boolean
}

export function useRecaptcha(): UseRecaptchaResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getToken = useCallback(async (actionType: RecaptchaActionType): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      Logger.debug(TAG, `Requesting reCAPTCHA token for action: ${actionType}`)
      const token = await recaptchaService.getToken(actionType)
      Logger.debug(TAG, `Successfully obtained reCAPTCHA token for action: ${actionType}`)
      return token
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get reCAPTCHA token'
      Logger.error(TAG, `Error getting reCAPTCHA token for action: ${actionType}`, err)
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    getToken,
    isLoading,
    error,
    isEnabled: recaptchaService.isEnabled(),
  }
}
