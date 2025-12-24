import { rpcError } from 'src/walletConnect/constants'
import { emitConnect, emitDisconnect } from './events'
import { createMockWebViewRef } from './testUtils'

describe('ethereumProvider events', () => {
  describe('emitConnect', () => {
    it('injects the connect event with chain id', () => {
      const webViewRef = createMockWebViewRef()
      emitConnect(webViewRef, '0x1')
      expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(`event: 'connect'`)
      )
      expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(`data: ${JSON.stringify({ chainId: '0x1' })}`)
      )
    })
  })

  describe('emitDisconnect', () => {
    it('injects the disconnect event with error payload', () => {
      const webViewRef = createMockWebViewRef()
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
