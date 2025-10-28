import React, { RefObject } from 'react'
import { WebViewRef } from 'src/components/WebView'
import { rpcError } from 'src/walletConnect/constants'
import { emitConnect, emitDisconnect } from './events'

const mockWebViewRef = () => {
  const ref = React.createRef() as RefObject<WebViewRef>
  Object.defineProperty(ref, 'current', {
    writable: true,
    value: {
      injectJavaScript: jest.fn(),
    },
  })
  return ref
}

describe('ethereumProvider events', () => {
  let webViewRef: RefObject<WebViewRef>

  beforeEach(() => {
    jest.clearAllMocks()
    webViewRef = mockWebViewRef()
  })

  describe('emitConnect', () => {
    it('injects the connect event with chain id', () => {
      emitConnect(webViewRef, '0x2710')
      expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(`event: 'connect'`)
      )
      expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(`data: ${JSON.stringify({ chainId: '0x2710' })}`)
      )
    })
  })

  describe('emitDisconnect', () => {
    it('injects the disconnect event with error payload', () => {
      emitDisconnect(webViewRef)
      expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(`event: 'disconnect'`)
      )
      expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(`data: ${JSON.stringify({ error: rpcError.DISCONNECTED })}`)
      )
    })
  })
})
