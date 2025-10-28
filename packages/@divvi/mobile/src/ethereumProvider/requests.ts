import { WebViewRef } from 'src/components/WebView'
import { rpcError } from 'src/walletConnect/constants'
import { EthereumProviderRequest, EthereumProviderResponse } from './types'

function sendResponseToWebView(
  webViewRef: React.RefObject<WebViewRef>,
  response: EthereumProviderResponse
): void {
  const script = `
    if (window.ethereum && window.ethereum._handleResponse) {
      window.ethereum._handleResponse(${JSON.stringify(response)});
    }
    true; // Required for injection to work
  `
  webViewRef.current?.injectJavaScript(script)
}

export function handleProviderRequest(
  webViewRef: React.RefObject<WebViewRef>,
  request: EthereumProviderRequest
): void {
  const { id, method: _ } = request
  try {
    // TODO: Implement actual methods
    const response: EthereumProviderResponse = {
      id,
      error: rpcError.UNSUPPORTED_METHOD,
    }
    sendResponseToWebView(webViewRef, response)
    return
  } catch (error) {
    const response: EthereumProviderResponse = {
      id,
      error: rpcError.INTERNAL_ERROR,
    }
    sendResponseToWebView(webViewRef, response)
  }
}
