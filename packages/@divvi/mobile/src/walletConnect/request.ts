import { SentrySpanHub } from 'src/sentry/SentrySpanHub'
import { SentrySpan } from 'src/sentry/SentrySpans'
import { Network } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { ViemWallet } from 'src/viem/getLockableWallet'
import { getPreparedTransaction } from 'src/viem/preparedTransactionSerialization'
import {
  getWalletCapabilitiesByHexChainId,
  getWalletCapabilitiesByWalletConnectChainId,
} from 'src/walletConnect/capabilities'
import { chainAgnosticActions, SupportedActions } from 'src/walletConnect/constants'
import { ActionableRequest, isNonInteractiveMethod } from 'src/walletConnect/types'
import { getViemWallet } from 'src/web3/contracts'
import networkConfig, {
  networkIdToNetwork,
  walletConnectChainIdToNetwork,
} from 'src/web3/networkConfig'
import { getWalletAddress, unlockAccount } from 'src/web3/saga'
import { call } from 'typed-redux-saga'
import { bytesToHex, Hex, SignMessageParameters } from 'viem'

const TAG = 'WalletConnect/request'

export const handleRequest = function* (actionableRequest: ActionableRequest) {
  const {
    method,
    request: {
      params: {
        request: { params },
        chainId,
      },
    },
  } = actionableRequest

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

  // Unlock the account if the action requires user consent
  if (!isNonInteractiveMethod(method)) {
    yield* call(unlockAccount, account)
  }

  // Call Sentry performance monitoring after entering pin if required
  SentrySpanHub.startSpan(SentrySpan.wallet_connect_transaction)

  switch (method) {
    case SupportedActions.eth_signTransaction: {
      if (!actionableRequest.preparedRequest.success) {
        throw new Error(actionableRequest.preparedRequest.errorMessage)
      }
      const tx = getPreparedTransaction(actionableRequest.preparedRequest.data)
      Logger.debug(TAG + '@handleRequest', 'Signing transaction', tx)
      return yield* call(
        [wallet, 'signTransaction'],
        // TODO: fix types
        tx as any
      )
    }
    case SupportedActions.eth_sendTransaction: {
      if (!actionableRequest.preparedRequest.success) {
        throw new Error(actionableRequest.preparedRequest.errorMessage)
      }
      const tx = getPreparedTransaction(actionableRequest.preparedRequest.data)
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
    case SupportedActions.wallet_getCapabilities: {
      const [_, hexNetworkIds] = params
      return yield* call(getWalletCapabilitiesByHexChainId, hexNetworkIds)
    }
    case SupportedActions.wallet_sendCalls: {
      const id = params[0].id ?? bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
      const supportedCapabilities = yield* call(getWalletCapabilitiesByWalletConnectChainId)

      // TODO: handle atomic execution

      // Fallback to sending transactions sequentially without any atomicity/contiguity guarantees
      if (!actionableRequest.preparedRequest.success) {
        throw new Error(actionableRequest.preparedRequest.errorMessage)
      }

      const transactionHashes: Hex[] = []
      for (const tx of actionableRequest.preparedRequest.data) {
        try {
          const hash = yield* call(
            [wallet, 'sendTransaction'],
            // TODO: fix types
            tx as any
          )
          transactionHashes.push(hash)
        } catch (e) {
          Logger.warn(TAG + '@handleRequest', 'Failed to send transaction, aborting batch', e)
          break
        }
      }

      return {
        id,
        capabilities: {
          ...supportedCapabilities[chainId],
          caip345: {
            caip2: chainId,
            transactionHashes,
          },
        },
      }
    }
    default:
      throw new Error('unsupported RPC method')
  }
}
