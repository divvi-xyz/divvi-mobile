export default jest.fn(() => ({
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  requestPermission: jest.fn(() => Promise.resolve(1)), // AUTHORIZED
  hasPermission: jest.fn(() => Promise.resolve(1)), // AUTHORIZED
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
  onMessage: jest.fn((callback: Function) => jest.fn()),
  onNotificationOpenedApp: jest.fn((callback: Function) => jest.fn()),
  onTokenRefresh: jest.fn((callback: Function) => jest.fn()),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
  },
}))

export const FirebaseMessagingTypes = {
  Module: jest.fn(),
  RemoteMessage: jest.fn(),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
  },
}
