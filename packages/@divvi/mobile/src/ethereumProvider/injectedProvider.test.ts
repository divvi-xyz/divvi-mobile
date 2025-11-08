import { APP_BUNDLE_ID, APP_NAME } from 'src/config'
import { getInjectedProviderScript } from './injectedProvider'

const mockAppIconBase64 = 'data:image/png;base64,test-icon'

jest.mock('expo-constants', () => {
  return {
    __esModule: true,
    default: {
      expoConfig: {
        extra: {
          appIconBase64: 'data:image/png;base64,test-icon',
        },
      },
    },
  }
})

describe('injectedProvider', () => {
  let mockWindow: any
  let originalWindow: any
  let eventListeners: { [key: string]: Array<(event: any) => void> }
  let dispatchEventCalls: CustomEvent[]

  beforeAll(() => {
    originalWindow = global.window
  })

  beforeEach(() => {
    eventListeners = {}
    dispatchEventCalls = []
    mockWindow = {
      ReactNativeWebView: {
        postMessage: jest.fn(),
      },
      addEventListener: jest.fn((event: string, handler: (event: any) => void) => {
        if (!eventListeners[event]) {
          eventListeners[event] = []
        }
        eventListeners[event].push(handler)
      }),
      dispatchEvent: jest.fn((event: CustomEvent) => {
        dispatchEventCalls.push(event)
        const handlers = eventListeners[event.type] || []
        handlers.forEach((handler) => handler(event))
        return true
      }),
      CustomEvent: class CustomEvent {
        type: string
        detail: any
        constructor(type: string, options?: { detail?: any }) {
          this.type = type
          this.detail = options?.detail
        }
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

  describe('EIP-6963 Provider Discovery', () => {
    it('should announce provider immediately when script is injected', () => {
      const script = getInjectedProviderScript({ isConnected: false, chainId: null })
      // eslint-disable-next-line no-eval
      eval(script)

      expect(mockWindow.dispatchEvent).toHaveBeenCalled()

      // Find the announcement event
      const announcementEvent = dispatchEventCalls.find(
        (event) => event.type === 'eip6963:announceProvider'
      )
      expect(announcementEvent).toBeDefined()
      expect(announcementEvent?.detail).toBeDefined()
      expect(announcementEvent?.detail.info).toBeDefined()
      expect(announcementEvent?.detail.provider).toBe(mockWindow.ethereum)

      // Verify the info structure
      const info = announcementEvent?.detail.info
      expect(info).toHaveProperty('name', APP_NAME)
      expect(info).toHaveProperty('rdns', APP_BUNDLE_ID)
      expect(info).toHaveProperty('icon', mockAppIconBase64)
      expect(info).toHaveProperty('uuid')
      expect(typeof info.uuid).toBe('string')
      expect(info.uuid.length).toBeGreaterThan(0)
    })

    it('should respond to eip6963:requestProvider event with announcement', () => {
      const script = getInjectedProviderScript({ isConnected: true, chainId: '0x1' })
      // eslint-disable-next-line no-eval
      eval(script)

      // Clear previous dispatch calls
      dispatchEventCalls = []

      // Dispatch the request event
      const requestEvent = new mockWindow.CustomEvent('eip6963:requestProvider')
      mockWindow.dispatchEvent(requestEvent)

      // Verify that an announcement was dispatched
      const announcementEvent = dispatchEventCalls.find(
        (event) => event.type === 'eip6963:announceProvider'
      )
      expect(announcementEvent).toBeDefined()
      expect(announcementEvent?.detail).toBeDefined()
      expect(announcementEvent?.detail.info).toBeDefined()
      expect(announcementEvent?.detail.provider).toBe(mockWindow.ethereum)

      // Verify the info structure
      const info = announcementEvent?.detail.info
      expect(info).toHaveProperty('name', APP_NAME)
      expect(info).toHaveProperty('rdns', APP_BUNDLE_ID)
      expect(info).toHaveProperty('icon', mockAppIconBase64)
      expect(info).toHaveProperty('uuid')
      expect(typeof info.uuid).toBe('string')
      expect(info.uuid.length).toBeGreaterThan(0)
    })
  })
})
