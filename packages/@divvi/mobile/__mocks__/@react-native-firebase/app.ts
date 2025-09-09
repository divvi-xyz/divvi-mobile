const mockFirebaseApp = {}

const firebase = jest.fn(() => mockFirebaseApp)

firebase.messaging = {
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
  },
}

export default firebase
