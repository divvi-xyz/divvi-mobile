import BigNumber from 'bignumber.js'
import { useAsyncCallback } from 'react-async-hook'
import { tokenAmountInSmallestUnit } from 'src/tokens/saga'
import { TokenBalance, isNativeTokenBalance, tokenBalanceHasAddress } from 'src/tokens/slice'
import Logger from 'src/utils/Logger'
import {
  prepareERC20TransferTransaction,
  prepareSendNativeAssetTransaction,
  type PreparedTransactionsResult,
} from 'src/viem/prepareTransactions'

const TAG = 'src/send/usePrepareSendTransactions'

type PrepareSendTransactionsCallbackProps = {
  amount: BigNumber
  token: TokenBalance
  recipientAddress: string
  walletAddress: string
  feeCurrencies: TokenBalance[]
}
export async function prepareSendTransactionsCallback({
  amount,
  token,
  recipientAddress,
  walletAddress,
  feeCurrencies,
}: PrepareSendTransactionsCallbackProps) {
  if (amount.isLessThanOrEqualTo(0)) {
    return
  }
  const baseTransactionParams = {
    // not including sendToken yet because of typing. need to check whether token has address field or not first, required for erc-20 transfers
    fromWalletAddress: walletAddress,
    toWalletAddress: recipientAddress,
    amount: BigInt(tokenAmountInSmallestUnit(amount, token.decimals)),
    feeCurrencies,
  }
  if (tokenBalanceHasAddress(token)) {
    // NOTE: CELO will be sent as ERC-20. This makes analytics easier, but if gas prices increase later on and/or we
    //   gain analytics coverage for native CELO transfers, we could switch to sending CELO as native asset to save on gas
    const transactionParams = { ...baseTransactionParams, sendToken: token }
    return prepareERC20TransferTransaction(transactionParams)
  } else if (isNativeTokenBalance(token)) {
    return prepareSendNativeAssetTransaction({
      ...baseTransactionParams,
      sendToken: token,
    })
  } else {
    Logger.error(
      TAG,
      `Token does not have address AND is not native. token: ${JSON.stringify(token)}}`
    )
  }
}

/**
 * Hook to prepare transactions for sending crypto.
 */
export function usePrepareSendTransactions(
  existingPrepareTransactionResult?: PreparedTransactionsResult
) {
  const prepareTransactions = useAsyncCallback(
    (props: PrepareSendTransactionsCallbackProps) => {
      if (existingPrepareTransactionResult) return
      return prepareSendTransactionsCallback(props)
    },
    {
      onError: (error) => {
        Logger.error(TAG, `prepareTransactionsOutput: ${error}`)
      },
    }
  )

  return {
    prepareTransactionsResult: existingPrepareTransactionResult ?? prepareTransactions.result,
    refreshPreparedTransactions: prepareTransactions.execute,
    clearPreparedTransactions: prepareTransactions.reset,
    prepareTransactionError: prepareTransactions.error,
    prepareTransactionLoading: existingPrepareTransactionResult
      ? false
      : prepareTransactions.loading,
  }
}
