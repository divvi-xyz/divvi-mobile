import { CapabilitiesSchema } from 'viem'

export enum WalletConnectRequestType {
  Loading,
  Session,
  Action,
  TimeOut,
}

export type WalletConnectRequestResult = string | Record<string, Capabilities>

type AtomicCapability = NonNullable<CapabilitiesSchema['getCapabilities']['ReturnType']['atomic']>

type PaymasterServiceCapability = NonNullable<
  CapabilitiesSchema['getCapabilities']['ReturnType']['paymasterService']
>

export type Capabilities = {
  atomic: AtomicCapability
  paymasterService: PaymasterServiceCapability
}
