import React, { RefObject } from 'react'
import { WebViewRef } from 'src/components/WebView'
import { rpcError } from 'src/walletConnect/constants'
import { handleProviderRequest } from './requests'
import { EthereumProviderRequest } from './types'

describe('handleProviderRequest', () => {
  let webViewRef: RefObject<WebViewRef>

  beforeEach(() => {
    jest.clearAllMocks()
    webViewRef = React.createRef() as RefObject<WebViewRef>
    Object.defineProperty(webViewRef, 'current', {
      writable: true,
      value: {
        injectJavaScript: jest.fn(),
      },
    })
  })

  it('should send an unsupported method error response', () => {
    const request: EthereumProviderRequest = {
      id: 'testId',
      method: 'eth_requestAccounts',
      params: [],
    }

    handleProviderRequest(webViewRef, request)

    const expectedResponse = {
      id: request.id,
      error: rpcError.UNSUPPORTED_METHOD,
    }

    expect(webViewRef.current?.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify(expectedResponse))
    )
  })
})
