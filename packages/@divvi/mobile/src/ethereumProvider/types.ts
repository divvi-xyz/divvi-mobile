type EthereumProviderEvent = 'connect' | 'disconnect'

interface EthereumProviderError {
  code: number
  message: string
  data?: unknown
}

export interface EthereumProviderRequest {
  id: string
  method: string
  params?: unknown[]
}

export interface EthereumProviderResponse {
  id: string
  result?: unknown
  error?: EthereumProviderError
}

interface ProviderEventMessage {
  event: EthereumProviderEvent
  data?: unknown
}

export type ProviderMessage =
  | {
      type: 'request'
      data: EthereumProviderRequest
    }
  | {
      type: 'response'
      data: EthereumProviderResponse
    }
  | {
      type: 'event'
      data: ProviderEventMessage
    }
