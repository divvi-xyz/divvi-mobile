const mockFirebaseApp = {
  auth: jest.fn(() => ({
    signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
    signOut: jest.fn(() => Promise.resolve()),
  })),
  database: jest.fn(() => ({
    ref: jest.fn((path: string) => ({
      child: jest.fn((childPath: string) => ({
        transaction: jest.fn((callback: Function) => Promise.resolve()),
        on: jest.fn((event: string, callback: Function, errorCallback?: Function) => jest.fn()),
        off: jest.fn((event: string, callback: Function) => {}),
        once: jest.fn((event: string) => Promise.resolve({ val: () => null })),
      })),
      on: jest.fn((event: string, callback: Function, errorCallback?: Function) => jest.fn()),
      off: jest.fn((event: string, callback: Function) => {}),
      once: jest.fn((event: string) => Promise.resolve({ val: () => null })),
    })),
  })),
  messaging: jest.fn(() => ({
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
  })),
}

// Mock the default export
const firebase = jest.fn(() => mockFirebaseApp)

// Add static properties
firebase.messaging = {
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
  },
}

export default firebase

// Mock the named export
export const ReactNativeFirebase = {
  Module: mockFirebaseApp,
  FirebaseApp: mockFirebaseApp,
}
