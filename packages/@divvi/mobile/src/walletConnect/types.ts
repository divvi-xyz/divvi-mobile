import { Capabilities } from './capabilities'

export enum WalletConnectRequestType {
  Loading,
  Session,
  Action,
  TimeOut,
}

export type WalletConnectRequestResult = string | Record<string, Capabilities>
