// @ts-expect-error - ESM module import in CommonJS context
import { createSmartAccountClient } from 'permissionless'
// @ts-expect-error - ESM module import in CommonJS context
import { to7702KernelSmartAccount } from 'permissionless/accounts'
import { Network } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { appViemTransports, publicClient, viemTransports } from 'src/viem'
import { KeychainAccounts } from 'src/web3/KeychainAccounts'
import networkConfig from 'src/web3/networkConfig'
import {
  Account,
  Address,
  Chain,
  Client,
  Transport,
  WalletActions,
  WalletRpcSchema,
  createWalletClient,
} from 'viem'
import { Prettify } from 'viem/chains'

const TAG = 'viem/getLockableWallet'

export function getTransport({ chain, useApp }: { chain: Chain; useApp?: boolean }): Transport {
  const result = Object.entries(networkConfig.viemChain).find(
    ([_, viemChain]) => chain === viemChain
  )
  if (!result) {
    throw new Error(`No network defined for viem chain ${chain}, cannot create wallet`)
  }
  if (useApp) {
    const appTransport = appViemTransports[result[0] as keyof typeof appViemTransports]
    if (!appTransport) {
      throw new Error(`No app transport defined for network ${result[0]}, cannot create wallet`)
    }
    return appTransport
  }
  return viemTransports[result[0] as Network]
}

// Largely copied from https://github.com/wevm/viem/blob/43df39918f990c039b322c05e7130721f7117bbd/src/clients/createWalletClient.ts#L38
export type ViemWallet<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Prettify<Client<transport, chain, account, WalletRpcSchema, Actions<chain, account>>>

type Actions<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = WalletActions<chain, account> & {
  unlockAccount: (passphrase: string, duration: number) => Promise<boolean>
}

export default function getLockableViemWallet(
  accounts: KeychainAccounts,
  chain: Chain,
  address: Address,
  useAppTransport: boolean = false
): ViemWallet {
  Logger.debug(TAG, `Getting viem wallet for ${address} on ${chain.name}`)
  const account = accounts.getViemAccount(address)
  if (!account) {
    throw new Error(`Account ${address} not found in KeychainAccounts`)
  }

  return createWalletClient({
    chain,
    transport: getTransport({ chain, useApp: useAppTransport }),
    account,
  }).extend((client) => {
    return {
      unlockAccount: (passphrase: string, duration: number) =>
        accounts.unlock(account.address, passphrase, duration),
    }
  })
}

export async function getLockableViemSmartWallet(
  accounts: KeychainAccounts,
  chain: Chain,
  address: Address,
  useAppTransport: boolean = false
) {
  Logger.debug(TAG, `Getting viem smart wallet for ${address} on ${chain.name}`)

  const result = Object.entries(networkConfig.viemChain).find(
    ([_, viemChain]) => chain === viemChain
  )
  if (!result) {
    throw new Error(`No network defined for viem chain ${chain}, cannot create wallet`)
  }
  const client = publicClient[result[0] as keyof typeof publicClient]

  const viemWallet = getLockableViemWallet(accounts, chain, address, useAppTransport)
  if (!viemWallet.account) {
    throw new Error(`Viem wallet not found for address ${address} on chain ${chain.name}`)
  }

  const kernelAccount = await to7702KernelSmartAccount({
    client,
    // @ts-expect-error - Type compatibility issue between viem and permissionless versions
    owner: viemWallet.account,
  })

  const smartAccountClient = createSmartAccountClient({
    client,
    chain,
    account: kernelAccount,
    bundlerTransport: getTransport({ chain, useApp: useAppTransport }),
  })

  // Extend the smart account client with unlockAccount functionality
  return smartAccountClient.extend((client) => {
    return {
      unlockAccount: (passphrase: string, duration: number) =>
        accounts.unlock(address, passphrase, duration),
    }
  })
}
