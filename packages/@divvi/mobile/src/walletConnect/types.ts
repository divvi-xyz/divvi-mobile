import { WalletKitTypes } from '@reown/walletkit'
import { SerializableTransactionRequest } from 'src/viem/preparedTransactionSerialization'
import { SupportedActions } from 'src/walletConnect/constants'
import { CapabilitiesSchema } from 'viem'

export enum WalletConnectRequestType {
  Loading,
  Session,
  Action,
  TimeOut,
}

export type WalletConnectRequestResult = string | Record<string, Capabilities>

export type Capabilities = CapabilitiesSchema['getCapabilities']['ReturnType']

type NonInteractiveMethod = SupportedActions.wallet_getCapabilities

export type MessageMethod =
  | SupportedActions.eth_sign
  | SupportedActions.eth_signTypedData
  | SupportedActions.eth_signTypedData_v4
  | SupportedActions.personal_sign

export type TransactionMethod =
  | SupportedActions.eth_sendTransaction
  | SupportedActions.eth_signTransaction

export type SendCallsMethod = SupportedActions.wallet_sendCalls

export function isNonInteractiveMethod(method: string): method is NonInteractiveMethod {
  return method === SupportedActions.wallet_getCapabilities
}

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

interface NonInteractiveRequest extends RequestBase {
  method: NonInteractiveMethod
}

export interface MessageRequest extends RequestBase {
  method: MessageMethod
}

interface TransactionRequestBase extends RequestBase {
  hasInsufficientGasFunds: boolean
  feeCurrenciesSymbols: string[]
}

export interface TransactionRequest extends TransactionRequestBase {
  method: TransactionMethod
  preparedTransaction: PreparedTransaction
}

export interface SendCallsRequest extends TransactionRequestBase {
  method: SendCallsMethod
  preparedTransactions: PreparedTransactions
}

export type ActionableRequest =
  | NonInteractiveRequest
  | MessageRequest
  | TransactionRequest
  | SendCallsRequest

export type PreparedTransaction =
  | { success: true; transactionRequest: SerializableTransactionRequest }
  | { success: false; errorMessage: string }

export type PreparedTransactions =
  | { success: true; transactionRequests: SerializableTransactionRequest[] }
  | { success: false; errorMessage: string }
