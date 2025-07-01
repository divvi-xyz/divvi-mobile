import mockAuth from './auth'
import mockMessaging from './messaging'

export default {
  app: jest.fn(() => ({
    messaging: () => mockMessaging,
    auth: () => mockAuth,
  })),
}
