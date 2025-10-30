import { getInjectedProviderScript } from './injectedProvider'

describe('injectedProvider', () => {
  let mockWindow: any
  let originalWindow: any

  beforeAll(() => {
    originalWindow = global.window
  })

  beforeEach(() => {
    mockWindow = {
      ReactNativeWebView: {
        postMessage: jest.fn(),
      },
    }
    global.window = mockWindow
  })

  afterEach(() => {
    global.window = originalWindow
    jest.clearAllMocks()
  })

  it('should inject the window.ethereum object', () => {
    const script = getInjectedProviderScript({ isConnected: false, chainId: null })
    // eslint-disable-next-line no-eval
    eval(script)
    expect(mockWindow.ethereum).toBeDefined()
  })

  it('should send a request message', () => {
    const script = getInjectedProviderScript({ isConnected: true, chainId: '0x1' })
    // eslint-disable-next-line no-eval
    eval(script)
    mockWindow.ethereum.request({ method: 'eth_requestAccounts', params: [] })

    expect(mockWindow.ReactNativeWebView.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"request"')
    )
    expect(mockWindow.ReactNativeWebView.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"method":"eth_requestAccounts"')
    )
  })

  it('should handle a successful response', async () => {
    const script = getInjectedProviderScript({ isConnected: true, chainId: '0x1' })
    // eslint-disable-next-line no-eval
    eval(script)
    const requestPromise = mockWindow.ethereum.request({
      method: 'eth_requestAccounts',
      params: [],
    })

    const message = JSON.parse(mockWindow.ReactNativeWebView.postMessage.mock.calls[0][0])
    const requestId = message.data.id

    mockWindow.ethereum._handleResponse({
      id: requestId,
      result: ['0x123'],
    })

    await expect(requestPromise).resolves.toEqual(['0x123'])
  })

  it('should handle an error response', async () => {
    const script = getInjectedProviderScript({ isConnected: true, chainId: '0x1' })
    // eslint-disable-next-line no-eval
    eval(script)
    const requestPromise = mockWindow.ethereum.request({
      method: 'eth_requestAccounts',
      params: [],
    })

    const message = JSON.parse(mockWindow.ReactNativeWebView.postMessage.mock.calls[0][0])
    const requestId = message.data.id
    const error = { code: 4001, message: 'User Rejected Request' }

    mockWindow.ethereum._handleResponse({
      id: requestId,
      error,
    })

    await expect(requestPromise).rejects.toEqual(error)
  })

  it('should handle events', () => {
    const script = getInjectedProviderScript({ isConnected: false, chainId: null })
    // eslint-disable-next-line no-eval
    eval(script)
    const connectListener = jest.fn()
    mockWindow.ethereum.on('connect', connectListener)

    mockWindow.ethereum._handleEvent({
      event: 'connect',
      data: { chainId: '0x1' },
    })

    expect(connectListener).toHaveBeenCalledWith({ chainId: '0x1' })
  })
})
