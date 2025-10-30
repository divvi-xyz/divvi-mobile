import { WebViewRef } from 'src/components/WebView'
import { rpcError } from 'src/walletConnect/constants'
import { Hex } from 'viem'

function emitEvent(webViewRef: React.RefObject<WebViewRef>, event: string, data: any): void {
  const script = `
    if (window.ethereum && window.ethereum._handleEvent) {
      window.ethereum._handleEvent({
        event: '${event}',
        data: ${JSON.stringify(data)}
      });
    }
    true; // Required for injection to work
  `
  webViewRef.current?.injectJavaScript(script)
}

export function emitConnect(webViewRef: React.RefObject<WebViewRef>, chainId: Hex): void {
  emitEvent(webViewRef, 'connect', { chainId })
}

export function emitDisconnect(webViewRef: React.RefObject<WebViewRef>): void {
  emitEvent(webViewRef, 'disconnect', { error: rpcError.DISCONNECTED })
}
