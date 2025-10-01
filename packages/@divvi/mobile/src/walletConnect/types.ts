import { CapabilitiesSchema } from 'viem'

export enum WalletConnectRequestType {
  Loading,
  Session,
  Action,
  TimeOut,
}

export type WalletConnectRequestResult = string | Record<string, Capabilities>

export type Capabilities = CapabilitiesSchema['getCapabilities']['ReturnType']
