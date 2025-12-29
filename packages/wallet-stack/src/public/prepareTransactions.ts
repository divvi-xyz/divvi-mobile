// See useWallet for why we don't directly import internal modules, except for the types
import type { Address, Hex } from 'viem'
import type { Store } from '../redux/store'
import type { FeeCurrenciesSelector } from '../tokens/selectors'
import type { NetworkId as InternalNetworkId } from '../transactions/types'
import type {
  TransactionRequest as InternalTransactionRequest,
  PrepareTransactions,
} from '../viem/prepareTransactions'
import type { WalletAddressSelector } from '../web3/selectors'
import type { NetworkId } from './types'

export type {
  PreparedTransactionsNeedDecreaseSpendAmountForGas,
  PreparedTransactionsNotEnoughBalanceForGas,
  PreparedTransactionsPossible,
  PreparedTransactionsResult,
} from '../viem/prepareTransactions'

export type TransactionRequest = {
  to: Address
  data?: Hex
  value?: bigint
  // These are needed when preparing more than one transaction
  gas?: bigint // in wei
  estimatedGasUse?: bigint // in wei
}

function toInternalTransactionRequest(
  tx: TransactionRequest,
  walletAddress: Address
): InternalTransactionRequest {
  return {
    from: walletAddress,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gas: tx.gas,
    _estimatedGasUse: tx.estimatedGasUse,
  }
}

function toInternalTransactionRequests(
  txs: TransactionRequest[],
  walletAddress: Address
): InternalTransactionRequest[] {
  return txs.map((tx) => toInternalTransactionRequest(tx, walletAddress))
}

export async function prepareTransactions({
  networkId,
  transactionRequests,
}: {
  networkId: NetworkId
  transactionRequests: TransactionRequest[]
}) {
  const store = require('../redux/store').store as Store
  const feeCurrenciesSelector = require('../tokens/selectors')
    .feeCurrenciesSelector as FeeCurrenciesSelector
  const prepareTransactions = require('../viem/prepareTransactions')
    .prepareTransactions as PrepareTransactions
  const walletAddressSelector = require('../web3/selectors')
    .walletAddressSelector as WalletAddressSelector

  const state = store.getState()
  const feeCurrencies = feeCurrenciesSelector(state, networkId as InternalNetworkId)
  const walletAddress = walletAddressSelector(state)
  if (!walletAddress) {
    throw new Error('Wallet address not found')
  }
  const result = await prepareTransactions({
    feeCurrencies,
    decreasedAmountGasFeeMultiplier: 1,
    baseTransactions: toInternalTransactionRequests(transactionRequests, walletAddress as Address),
    origin: 'framework',
  })
  return result
}
