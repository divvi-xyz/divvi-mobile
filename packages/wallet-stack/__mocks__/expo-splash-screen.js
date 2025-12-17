module.exports = {
  preventAutoHideAsync: jest.fn().mockImplementation(() => Promise.resolve()),
  setOptions: jest.fn(),
  hide: jest.fn(),
  hideAsync: jest.fn().mockImplementation(() => Promise.resolve()),
}
