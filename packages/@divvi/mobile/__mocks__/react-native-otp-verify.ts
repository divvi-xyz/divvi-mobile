export const requestHint = jest.fn(() => Promise.resolve('+49030111111'))
export const getHash = jest.fn(() => Promise.resolve(['test-hash']))
export const startOtpListener = jest.fn(() => Promise.resolve({ remove: jest.fn() }))
export const getOtp = jest.fn(() => Promise.resolve(true))
export const addListener = jest.fn(() => ({ remove: jest.fn() }))
export const removeListener = jest.fn()

// Hook for testing
export const useOtpVerify = jest.fn(() => ({
  hash: ['test-hash'],
  otp: '',
  message: '',
  timeoutError: false,
  stopListener: jest.fn(),
  startListener: jest.fn(),
}))
