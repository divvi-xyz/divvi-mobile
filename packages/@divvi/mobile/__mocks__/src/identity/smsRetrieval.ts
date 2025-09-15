export interface SmsEvent {
  error?: string
  timeout?: string
  message?: string
}

export const startSmsRetriever = jest.fn(() => Promise.resolve(true))
export const addSmsListener = jest.fn((callback: (event: SmsEvent) => void) => {
  // Store the callback for testing
  addSmsListener.mockCallback = callback
  return { remove: jest.fn() }
})
export const removeSmsListener = jest.fn()
