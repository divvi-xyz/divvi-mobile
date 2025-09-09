export default jest.fn(() => ({
  logEvent: jest.fn(),
  setAnalyticsCollectionEnabled: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  resetAnalyticsData: jest.fn(),
}))
