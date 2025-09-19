const Sentry = {
  config: () => ({ install: jest.fn() }),
  setTagsContext: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  reactNavigationIntegration: jest.fn().mockImplementation(() => ({})),
  Severity: {
    Error: 'error',
  },
  startSpanManual: jest.fn(),
  nativeCrash: jest.fn(),
  wrap: jest.fn().mockImplementation((x) => x),
}

module.exports = Sentry
