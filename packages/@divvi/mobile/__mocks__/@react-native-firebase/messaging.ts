const mockMessaging = {
  getToken: jest.fn().mockResolvedValue('someToken'),
  hasPermission: jest.fn().mockResolvedValue(1),
  requestPermission: jest.fn().mockResolvedValue(1),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onTokenRefresh: jest.fn((callback) => callback('mock-token')),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  },
}

export default mockMessaging
