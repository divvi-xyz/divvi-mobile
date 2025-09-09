export default jest.fn(() => ({
  signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
  signOut: jest.fn(() => Promise.resolve()),
  currentUser: null,
  onAuthStateChanged: jest.fn((callback: Function) => jest.fn()),
}))
