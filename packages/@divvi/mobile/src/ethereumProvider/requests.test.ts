import { rpcError } from 'src/walletConnect/constants'
import { handleProviderRequest } from './requests'
import { createMockWebViewRef } from './testUtils'
import { EthereumProviderRequest } from './types'

describe('handleProviderRequest', () => {
  it('should send an unsupported method error response', () => {
    const webViewRef = createMockWebViewRef()
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
