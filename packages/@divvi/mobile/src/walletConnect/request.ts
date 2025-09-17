import { WalletKitTypes } from '@reown/walletkit'
import { SentryTransactionHub } from 'src/sentry/SentryTransactionHub'
import { SentryTransaction } from 'src/sentry/SentryTransactions'
import { Network } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { publicClient, viemTransports } from 'src/viem'
import { ViemWallet } from 'src/viem/getLockableWallet'
import {
  SerializableTransactionRequest,
  getPreparedTransaction,
} from 'src/viem/preparedTransactionSerialization'
import { SupportedActions, chainAgnosticActions } from 'src/walletConnect/constants'
import { getViemWallet } from 'src/web3/contracts'
import networkConfig, {
  networkIdToNetwork,
  walletConnectChainIdToNetwork,
} from 'src/web3/networkConfig'
import { getWalletAddress, unlockAccount } from 'src/web3/saga'
import { call } from 'typed-redux-saga'
import { SignMessageParameters } from 'viem'
import {
  Simple7702SmartAccountImplementation,
  SmartAccount,
  createBundlerClient,
  toSimple7702SmartAccount,
} from 'viem/account-abstraction'

const TAG = 'WalletConnect/request'

// Minimal shape for wallet_sendCalls param & return types we need here
type WalletSendCallsParams = [{ calls: Array<{ to: string; value?: string; data?: string }> }]

function* handleWalletSendCalls(wallet: ViemWallet, network: Network, params: unknown) {
  // 1) Ensure smart account (convert if needed)
  // viem wallet has an `account`; if it's not AA, convert to Simple7702 smart account
  // Ref: toSimple7702SmartAccount
  const baseAccount: any = (wallet as any).account

  const aaAccount = yield* call(toSimple7702SmartAccount as any, {
    client: publicClient[network],
    owner: baseAccount,
  })

  // 2) Create bundler client for this chain
  const bundler = createBundlerClient({
    account: aaAccount as SmartAccount<Simple7702SmartAccountImplementation>,
    chain: (publicClient[network] as any).chain,
    transport: viemTransports[network],
  })

  // 3) Normalize calls to user operation format and send
  const [{ calls }] = (params as WalletSendCallsParams) || [{ calls: [] }]
  const normalizedCalls = (calls || []).map((c) => ({
    to: c.to,
    value: c.value ?? '0x0',
    data: c.data ?? '0x',
  }))

  const userOpHash = yield* call([bundler as any, 'sendUserOperation'], {
    account: aaAccount,
    calls: normalizedCalls,
    paymaster: false,
  } as any)

  return { id: userOpHash }
}

export function* handleRequest(
  {
    request: { method, params },
    chainId,
  }: WalletKitTypes.EventArguments['session_request']['params'],
  serializableTransactionRequest?: SerializableTransactionRequest
) {
  // since the chainId comes from the dapp, we cannot be sure that it is a
  // supported chain id. for transactions that are sent to the blockchain, it is
  // required to that the chainId of the request is supported. for transactions
  // that are performed off chain (e.g. signing), we can safely perform this
  // action using the default network even if the network is not supported.
  // Context
  // https://valora-app.slack.com/archives/C04B61SJ6DS/p1708336430158639?thread_ts=1708021233.998389&cid=C04B61SJ6DS
  const network: Network | undefined = walletConnectChainIdToNetwork[chainId]
  if (!network && !chainAgnosticActions.includes(method)) {
    throw new Error('unsupported network')
  }

  const wallet: ViemWallet = yield* call(
    getViemWallet,
    networkConfig.viemChain[network ?? networkIdToNetwork[networkConfig.defaultNetworkId]]
  )
  const account = yield* call(getWalletAddress)
  yield* call(unlockAccount, account)
  // Call Sentry performance monitoring after entering pin if required
  SentryTransactionHub.startTransaction(SentryTransaction.wallet_connect_transaction)

  switch (method) {
    case SupportedActions.eth_signTransaction: {
      if (!serializableTransactionRequest) {
        throw new Error('preparedTransaction is required when using viem')
      }
      const tx = getPreparedTransaction(serializableTransactionRequest)
      Logger.debug(TAG + '@handleRequest', 'Signing transaction', tx)
      return yield* call(
        [wallet, 'signTransaction'],
        // TODO: fix types
        tx as any
      )
    }
    case SupportedActions.eth_sendTransaction: {
      if (!serializableTransactionRequest) {
        throw new Error('preparedTransaction is required when using viem')
      }
      const tx = getPreparedTransaction(serializableTransactionRequest)
      Logger.debug(TAG + '@handleRequest', 'Sending transaction', tx)
      const hash = yield* call(
        [wallet, 'sendTransaction'],
        // TODO: fix types
        tx as any
      )
      Logger.debug(TAG + '@handleRequest', 'Sent transaction', hash)
      return hash
    }
    case SupportedActions.eth_signTypedData_v4:
    case SupportedActions.eth_signTypedData:
      return (yield* call([wallet, 'signTypedData'], JSON.parse(params[1]))) as string
    case SupportedActions.personal_sign: {
      const data = { message: { raw: params[0] } } as SignMessageParameters
      return (yield* call([wallet, 'signMessage'], data)) as string
    }
    case SupportedActions.eth_sign: {
      const data = { message: { raw: params[1] } } as SignMessageParameters
      return (yield* call([wallet, 'signMessage'], data)) as string
    }
    // EIP-5792 Wallet Call APIs
    case SupportedActions.wallet_sendCalls: {
      return yield* call(handleWalletSendCalls, wallet, network, params)
    }
    case SupportedActions.wallet_getCallsStatus: {
      Logger.debug(TAG + '@handleRequest', 'Stub wallet_getCallsStatus', params)
      // TODO: implement status retrieval for a previously submitted bundle
      return { status: 'pending', receipts: [] }
    }
    case SupportedActions.wallet_showCallsStatus: {
      Logger.debug(TAG + '@handleRequest', 'Stub wallet_showCallsStatus', params)
      // TODO: implement user-facing status display for a given bundle
      return true
    }
    case SupportedActions.wallet_getCapabilities: {
      Logger.debug(TAG + '@handleRequest', 'Stub wallet_getCapabilities', params)
      // TODO: implement actual capabilities reporting
      return yield* call([wallet, 'getCapabilities'])
    }
    default:
      throw new Error('unsupported RPC method')
  }
}
