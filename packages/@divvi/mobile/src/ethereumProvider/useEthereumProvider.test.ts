import { renderHook } from '@testing-library/react-native'
import { RefObject } from 'react'
import { WebViewRef } from 'src/components/WebView'
import { emitConnect, emitDisconnect } from './events'
import { handleProviderRequest } from './requests'
import { createMockWebViewRef } from './testUtils'
import { useEthereumProvider } from './useEthereumProvider'

jest.mock('src/redux/hooks', () => ({ useSelector: jest.fn() }))
jest.mock('./injectedProvider', () => ({ getInjectedProviderScript: jest.fn() }))
jest.mock('./requests', () => ({ handleProviderRequest: jest.fn() }))
jest.mock('./events', () => ({ emitConnect: jest.fn(), emitDisconnect: jest.fn() }))

const mockMessage = (type: string, data: any) =>
  ({
    nativeEvent: { data: JSON.stringify({ type, data }) },
  }) as any

describe('useEthereumProvider', () => {
  let webViewRef: RefObject<WebViewRef>
  let mockUseSelector: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    webViewRef = createMockWebViewRef()

    const { useSelector } = require('src/redux/hooks')
    mockUseSelector = useSelector as jest.Mock
    mockUseSelector.mockReturnValue(true)
  })

  describe('handleMessage', () => {
    it('parses and handles request messages', () => {
      const { result } = renderHook(() => useEthereumProvider(webViewRef))
      const mockRequest = { id: 'testId', method: 'eth_requestAccounts', params: [] }
      const event = mockMessage('request', mockRequest)

      result.current.handleMessage(event)

      expect(handleProviderRequest).toHaveBeenCalledWith(webViewRef, mockRequest, true)
    })

    it('ignores non-request messages', () => {
      const { result } = renderHook(() => useEthereumProvider(webViewRef))
      const event = mockMessage('response', { id: 'testId', result: 'success' })

      result.current.handleMessage(event)

      expect(handleProviderRequest).not.toHaveBeenCalled()
    })
  })

  describe('network connection', () => {
    it('emits connect event when network comes online', () => {
      mockUseSelector.mockReturnValue(false)
      const { rerender } = renderHook(({ ref }) => useEthereumProvider(ref), {
        initialProps: { ref: webViewRef },
      })

      // Network comes online
      mockUseSelector.mockReturnValue(true)
      rerender({ ref: webViewRef })

      expect(emitConnect).toHaveBeenCalledWith(webViewRef, '0xaef3')
      expect(emitDisconnect).not.toHaveBeenCalled()
    })

    it('emits disconnect event when network goes offline', () => {
      mockUseSelector.mockReturnValue(true)
      const { rerender } = renderHook(({ ref }) => useEthereumProvider(ref), {
        initialProps: { ref: webViewRef },
      })

      // Network goes offline
      mockUseSelector.mockReturnValue(false)
      rerender({ ref: webViewRef })

      expect(emitDisconnect).toHaveBeenCalledWith(webViewRef)
      expect(emitConnect).not.toHaveBeenCalled()
    })
  })
})
