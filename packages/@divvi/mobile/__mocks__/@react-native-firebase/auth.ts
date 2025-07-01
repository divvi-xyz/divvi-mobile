const mockAuth = {
  signOut: jest.fn().mockResolvedValue(undefined),
  signInAnonymously: jest.fn().mockResolvedValue({
    user: { uid: 'mock-uid' },
  }),
}

export default mockAuth
