const mockDatabaseRef = {
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(() => Promise.resolve({ val: () => null })),
  child: jest.fn(() => ({
    transaction: jest.fn((fn) => fn(null)),
  })),
}

const mockDatabase = {
  ref: jest.fn(() => mockDatabaseRef),
}

export default {
  firebase: {
    database: jest.fn(() => mockDatabase),
  },
}
