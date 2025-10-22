import { WalletKitTypes } from '@reown/walletkit'
import { SendCallsBatch } from 'src/sendCalls/slice'
import { SerializableTransactionRequest } from 'src/viem/preparedTransactionSerialization'
import { SupportedActions } from 'src/walletConnect/constants'
import { CapabilitiesSchema, WalletGetCallsStatusReturnType, WalletSendCallsReturnType } from 'viem'

export enum WalletConnectRequestType {
  Loading,
  Session,
  Action,
  TimeOut,
}

export type WalletConnectRequestResult =
  | string
  | Record<string, Capabilities>
  | WalletSendCallsReturnType
  | WalletGetCallsStatusReturnType

export type Capabilities = Pick<
  CapabilitiesSchema['getCapabilities']['ReturnType'],
  'atomic' | 'paymasterService'
>

export type MessageMethod =
  | SupportedActions.eth_sign
  | SupportedActions.eth_signTypedData
  | SupportedActions.eth_signTypedData_v4
  | SupportedActions.personal_sign

export type TransactionMethod =
  | SupportedActions.eth_sendTransaction
  | SupportedActions.eth_signTransaction

export type SendCallsMethod = SupportedActions.wallet_sendCalls

export function isMessageMethod(method: string): method is MessageMethod {
  return (
    method === SupportedActions.eth_sign ||
    method === SupportedActions.eth_signTypedData ||
    method === SupportedActions.eth_signTypedData_v4 ||
    method === SupportedActions.personal_sign
  )
}

export function isTransactionMethod(method: string): method is TransactionMethod {
  return (
    method === SupportedActions.eth_sendTransaction ||
    method === SupportedActions.eth_signTransaction
  )
}

export function isSendCallsMethod(method: string): method is SendCallsMethod {
  return method === SupportedActions.wallet_sendCalls
}

interface RequestBase {
  request: WalletKitTypes.EventArguments['session_request']
}

interface GetCapabilitiesRequest extends RequestBase {
  method: SupportedActions.wallet_getCapabilities
}

export interface MessageRequest extends RequestBase {
  method: MessageMethod
}

export interface TransactionRequest extends RequestBase {
  method: TransactionMethod
  hasInsufficientGasFunds: boolean
  feeCurrenciesSymbols: string[]
  preparedRequest: PreparedTransactionResult<SerializableTransactionRequest>
}

export interface SendCallsRequest extends RequestBase {
  method: SendCallsMethod
  atomic: boolean
  hasInsufficientGasFunds: boolean
  feeCurrenciesSymbols: string[]
  preparedRequest: PreparedTransactionResult<SerializableTransactionRequest[]>
}

interface GetCallsStatusRequest extends RequestBase {
  method: SupportedActions.wallet_getCallsStatus
  id: string
  batch: SendCallsBatch
}

export type ActionableRequest =
  | GetCapabilitiesRequest
  | MessageRequest
  | TransactionRequest
  | SendCallsRequest
  | GetCallsStatusRequest

export type PreparedTransactionResult<T> =
  | { success: true; data: T }
  | { success: false; errorMessage?: string }
