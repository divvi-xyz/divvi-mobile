import { addListener, removeListener, startOtpListener } from 'react-native-otp-verify'
import Logger from 'src/utils/Logger'

const TAG = 'identity/smsRetrieval'

export interface SmsEvent {
  error?: string
  timeout?: string
  message?: string
}

export async function startSmsRetriever() {
  Logger.debug(TAG + '@SmsRetriever', 'Starting sms retriever')
  try {
    // startOtpListener starts the SMS listener and returns a subscription
    const subscription = await startOtpListener((message: string) => {
      Logger.debug(TAG + '@SmsRetriever', 'Message Received from sms listener', message)
    })
    if (subscription) {
      Logger.debug(TAG + '@SmsRetriever', 'Retriever started successfully')
      return true
    } else {
      Logger.error(TAG + '@SmsRetriever', 'Start retriever reported failure')
      return false
    }
  } catch (error) {
    Logger.error(TAG + '@SmsRetriever', 'Error starting retriever', error)
    return false
  }
}

export function addSmsListener(onSmsRetrieved: (message: SmsEvent) => void) {
  Logger.debug(TAG + '@SmsRetriever', 'Adding sms listener')
  try {
    // addListener adds a callback to receive SMS messages
    const subscription = addListener((message: string) => {
      if (!message) {
        Logger.error(TAG + '@SmsRetriever', 'Sms listener event is null')
        return
      }

      Logger.debug(TAG + '@SmsRetriever', 'Message Received from sms listener', message)
      // Create a compatible event object
      const event: SmsEvent = { message }
      onSmsRetrieved(event)
    })

    // Store subscription for cleanup if needed
    return subscription
  } catch (error) {
    Logger.error(TAG + '@SmsRetriever', 'Error adding sms listener', error)
  }
}

export function removeSmsListener() {
  try {
    Logger.debug(TAG + '@SmsRetriever', 'Removing sms listener')
    removeListener()
  } catch (error) {
    Logger.error(TAG + '@SmsRetriever', 'Error removing sms listener', error)
  }
}
