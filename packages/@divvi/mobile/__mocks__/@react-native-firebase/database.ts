export default jest.fn(() => ({
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
}))

export const FirebaseDatabaseTypes = {
  DataSnapshot: jest.fn(),
}
