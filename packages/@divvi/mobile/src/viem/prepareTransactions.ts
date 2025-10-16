import { getReferralTag } from '@divvi/referral-sdk'
import BigNumber from 'bignumber.js'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { TransactionEvents } from 'src/analytics/Events'
import { TransactionOrigin } from 'src/analytics/types'
import { getAppConfig } from 'src/appConfig'
import { STATIC_GAS_PADDING } from 'src/config'
import {
  NativeTokenBalance,
  TokenBalance,
  TokenBalanceWithAddress,
  TokenBalances,
} from 'src/tokens/slice'
import { getTokenId } from 'src/tokens/utils'
import { NetworkId } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { appPublicClient, publicClient } from 'src/viem'
import { estimateFeesPerGas } from 'src/viem/estimateFeesPerGas'
import { networkIdToNetwork } from 'src/web3/networkConfig'
import {
  Address,
  Client,
  ExecutionRevertedError,
  Hex,
  InvalidInputRpcError,
  TransactionRequestEIP1559,
  encodeFunctionData,
  erc20Abi,
} from 'viem'
import { estimateGas } from 'viem/actions'
import { TransactionRequestCIP64 } from 'viem/chains'

const TAG = 'viem/prepareTransactions'

// Constants for ERC20 transfer data manipulation
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb' as const
const SELECTOR_LENGTH = 10 // '0x' + 8 hex chars (function selector)
const ADDRESS_HEX_LENGTH = 64 // 32 bytes in hex
const AMOUNT_HEX_LENGTH = 64 // 32 bytes in hex
const GAS_ESTIMATION_AMOUNT_REDUCTION = 0.6 // Use 60% of amount for gas estimation

// Supported transaction types
export type TransactionRequest = (TransactionRequestCIP64 | TransactionRequestEIP1559) & {
  // Custom fields needed for showing the user the estimated gas fee
  // underscored to denote that they are not part of the TransactionRequest fields from viem
  // and only intended for internal use
  _estimatedGasUse?: bigint
  _baseFeePerGas?: bigint
}

export interface PreparedTransactionsPossible {
  type: 'possible'
  transactions: TransactionRequest[]
  feeCurrency: TokenBalance
}

export interface PreparedTransactionsNeedDecreaseSpendAmountForGas {
  type: 'need-decrease-spend-amount-for-gas'
  feeCurrency: TokenBalance
  maxGasFeeInDecimal: BigNumber
  estimatedGasFeeInDecimal: BigNumber
  decreasedSpendAmount: BigNumber
}

export interface PreparedTransactionsNotEnoughBalanceForGas {
  type: 'not-enough-balance-for-gas'
  feeCurrencies: TokenBalance[]
}

export type PreparedTransactionsResult =
  | PreparedTransactionsPossible
  | PreparedTransactionsNeedDecreaseSpendAmountForGas
  | PreparedTransactionsNotEnoughBalanceForGas

export function getMaxGasFee(txs: TransactionRequest[]): BigNumber {
  let maxGasFee = BigInt(0)
  for (const tx of txs) {
    if (!tx.gas || !tx.maxFeePerGas) {
      throw new Error('Missing gas or maxFeePerGas')
    }
    maxGasFee += BigInt(tx.gas) * BigInt(tx.maxFeePerGas)
  }
  return new BigNumber(maxGasFee.toString())
}

export function getEstimatedGasFee(txs: TransactionRequest[]): BigNumber {
  let estimatedGasFee = BigInt(0)
  for (const tx of txs) {
    // Use _estimatedGasUse if available, otherwise use gas
    const estimatedGas = tx._estimatedGasUse ?? tx.gas
    if (!estimatedGas) {
      throw new Error('Missing _estimatedGasUse or gas')
    }
    if (!tx._baseFeePerGas || !tx.maxFeePerGas) {
      throw new Error('Missing _baseFeePerGas or maxFeePerGas')
    }
    const expectedFeePerGas = tx._baseFeePerGas + (tx.maxPriorityFeePerGas ?? BigInt(0))
    estimatedGasFee +=
      estimatedGas * (expectedFeePerGas < tx.maxFeePerGas ? expectedFeePerGas : tx.maxFeePerGas)
  }
  return new BigNumber(estimatedGasFee.toString())
}

/**
 * Checks if transaction data represents an ERC20 transfer call
 */
function isERC20Transfer(data: Hex | undefined): boolean {
  return !!(data && data.startsWith(ERC20_TRANSFER_SELECTOR))
}

/**
 * Modifies the amount in an ERC20 transfer transaction data field
 *
 * @param originalData - The original transaction data (must be a valid ERC20 transfer)
 * @param newAmount - The new amount to encode in the transfer
 * @returns Modified transaction data with the new amount
 * @throws If the data is not a valid ERC20 transfer
 */
function modifyERC20TransferAmount(originalData: Hex, newAmount: BigNumber): Hex {
  if (!isERC20Transfer(originalData)) {
    throw new Error('Data is not an ERC20 transfer')
  }

  const expectedLength = SELECTOR_LENGTH + ADDRESS_HEX_LENGTH + AMOUNT_HEX_LENGTH
  if (originalData.length !== expectedLength) {
    throw new Error(
      `Invalid ERC20 transfer data length: expected ${expectedLength}, got ${originalData.length}`
    )
  }

  // Extract the selector and recipient address (first 74 characters)
  const recipientPart = originalData.slice(0, SELECTOR_LENGTH + ADDRESS_HEX_LENGTH)
  // Encode the new amount as a 32-byte hex string
  const newAmountHex = newAmount.toString(16).padStart(AMOUNT_HEX_LENGTH, '0')

  return (recipientPart + newAmountHex) as Hex
}

export function getFeeCurrencyAddress(feeCurrency: TokenBalance): Address | undefined {
  if (feeCurrency.isNative) {
    // No address for native currency
    return undefined
  }

  // Direct fee currency
  if (feeCurrency.isFeeCurrency) {
    if (!feeCurrency.address) {
      // This should never happen
      throw new Error(`Fee currency address is missing for fee currency ${feeCurrency.tokenId}`)
    }
    return feeCurrency.address as Address
  }

  // Fee currency adapter
  if (feeCurrency.feeCurrencyAdapterAddress) {
    return feeCurrency.feeCurrencyAdapterAddress
  }

  // This should never happen
  throw new Error(
    `Unable to determine fee currency address for fee currency ${feeCurrency.tokenId}`
  )
}

/**
 * Try estimating gas for a transaction
 *
 * Returns null if execution reverts due to insufficient funds or transfer value exceeds balance of sender. This means
 *   checks comparing the user's balance to send/swap amounts need to be done somewhere else to be able to give
 *   coherent error messages to the user when they lack the funds to perform a transaction.
 *
 * Throws other kinds of errors (e.g. if execution is reverted for some other reason)
 *
 * @param client
 * @param baseTransaction
 * @param maxFeePerGas
 * @param feeCurrencySymbol
 * @param feeCurrencyAddress
 * @param maxPriorityFeePerGas
 * @param spendToken - Optional: the token being spent in the transaction
 * @param spendTokenAmount - Optional: the amount being spent (in smallest units)
 * @param isGasSubsidized - Whether gas is subsidized (if true, skip same-token handling)
 */
export async function tryEstimateTransaction({
  client,
  baseTransaction,
  maxFeePerGas,
  maxPriorityFeePerGas,
  baseFeePerGas,
  feeCurrencySymbol,
  feeCurrencyAddress,
  spendToken,
  spendTokenAmount,
  isGasSubsidized = false,
}: {
  client: Client
  baseTransaction: TransactionRequest
  maxFeePerGas: bigint
  maxPriorityFeePerGas?: bigint
  baseFeePerGas: bigint
  feeCurrencySymbol: string
  feeCurrencyAddress?: Address
  spendToken?: TokenBalance
  spendTokenAmount?: BigNumber
  isGasSubsidized?: boolean
}) {
  // When sending a token and paying fees in the same token, we need special handling
  // because estimating gas with the full send amount will fail with "transfer amount exceeds balance"
  const isSameToken =
    spendToken && spendToken.tokenId === getTokenId(spendToken.networkId, feeCurrencyAddress)
  const needsReducedAmountEstimation =
    isSameToken &&
    !isGasSubsidized &&
    spendTokenAmount &&
    spendTokenAmount.isGreaterThan(0) &&
    isERC20Transfer(baseTransaction.data)

  let txToEstimate = baseTransaction
  if (needsReducedAmountEstimation && baseTransaction.data) {
    // Estimate with a reduced amount to ensure gas estimation succeeds while leaving
    // sufficient balance to cover both the transfer and gas costs
    // This is safe because the amount does not affect gas usage for ERC20 transfers
    const reducedAmount = spendTokenAmount!
      .times(GAS_ESTIMATION_AMOUNT_REDUCTION)
      .integerValue(BigNumber.ROUND_DOWN)

    try {
      txToEstimate = {
        ...baseTransaction,
        data: modifyERC20TransferAmount(baseTransaction.data, reducedAmount),
      }
    } catch (error) {
      Logger.warn(TAG, 'Failed to modify ERC20 transfer amount for gas estimation', error)
      // Fall back to original transaction
      txToEstimate = baseTransaction
    }
  }

  const tx = {
    ...txToEstimate,
    maxFeePerGas,
    maxPriorityFeePerGas,
    // Don't include the feeCurrency field if not present.
    // See https://github.com/wagmi-dev/viem/blob/e0149711da5894ac5f0719414b4ecc06ccaecb7b/src/chains/celo/serializers.ts#L164-L168
    ...(feeCurrencyAddress && { feeCurrency: feeCurrencyAddress }),
  }

  // TODO maybe cache this? and add static padding when using non-native fee currency
  try {
    tx.gas = await estimateGas(client, {
      ...(tx as any), // TODO: fix type, probably related to the generic client type
      account: tx.from,
    })
    tx._baseFeePerGas = baseFeePerGas
    Logger.info(TAG, `estimateGas results`, {
      feeCurrency: tx.feeCurrency,
      gas: tx.gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      baseFeePerGas,
    })
  } catch (e) {
    // Checking for error types by `name` instead of instanceof, instanceof returns false incorrectly. Cause unknown, maybe due to having multiple instances of the viem module.
    if (
      e instanceof Error &&
      e.name === 'EstimateGasExecutionError' &&
      e.cause instanceof Error &&
      (e.cause.name == 'InsufficientFundsError' ||
        (e.cause.name === 'ExecutionRevertedError' && // viem does not reliably label node errors as InsufficientFundsError when the user has enough to pay for the transfer, but not for the transfer + gas
          (/transfer value exceeded balance of sender/.test(
            (e.cause as ExecutionRevertedError).details
          ) ||
            /transfer amount exceeds balance/.test((e.cause as ExecutionRevertedError).details))) ||
        (e.cause.name === 'InvalidInputRpcError' &&
          /gas required exceeds allowance/.test((e.cause as InvalidInputRpcError).details)))
    ) {
      // too much gas was needed
      Logger.warn(TAG, `Couldn't estimate gas with feeCurrency ${feeCurrencySymbol}`, e)
      return null
    }
    throw e
  }

  // If we estimated with a reduced amount, restore the original transaction data
  // while preserving the gas estimates we just calculated
  if (needsReducedAmountEstimation) {
    return {
      ...tx,
      data: baseTransaction.data,
    }
  }

  return tx
}

export async function tryEstimateTransactions(
  baseTransactions: TransactionRequest[],
  feeCurrency: TokenBalance,
  useAppTransport: boolean = false,
  spendToken?: TokenBalance,
  spendTokenAmount?: BigNumber,
  isGasSubsidized: boolean = false
) {
  const transactions: TransactionRequest[] = []

  const network = networkIdToNetwork[feeCurrency.networkId]

  if (useAppTransport && !(network in appPublicClient)) {
    throw new Error(`App transport not available for network ${network}`)
  }

  const client = useAppTransport
    ? appPublicClient[network as keyof typeof appPublicClient]
    : publicClient[network]
  const feeCurrencyAddress = getFeeCurrencyAddress(feeCurrency)
  const { maxFeePerGas, maxPriorityFeePerGas, baseFeePerGas } = await estimateFeesPerGas(
    client,
    feeCurrencyAddress
  )

  for (const baseTx of baseTransactions) {
    if (baseTx.gas) {
      // We have an estimate of gas already and don't want to recalculate it
      // e.g. if this is a swap transaction that depends on an approval transaction that hasn't been submitted yet, so simulation would fail
      transactions.push({
        ...baseTx,
        maxFeePerGas,
        maxPriorityFeePerGas,
        // Don't include the feeCurrency field if not present.
        // See https://github.com/wagmi-dev/viem/blob/e0149711da5894ac5f0719414b4ecc06ccaecb7b/src/chains/celo/serializers.ts#L164-L168
        ...(feeCurrencyAddress && { feeCurrency: feeCurrencyAddress }),
        // We assume the provided gas value is with the native fee currency
        // If it's not, we add the static padding
        gas: baseTx.gas + BigInt(feeCurrency.isNative ? 0 : STATIC_GAS_PADDING),
        _estimatedGasUse: baseTx._estimatedGasUse
          ? baseTx._estimatedGasUse + BigInt(feeCurrency.isNative ? 0 : STATIC_GAS_PADDING)
          : undefined,
        _baseFeePerGas: baseFeePerGas,
      })
    } else {
      const tx = await tryEstimateTransaction({
        client,
        baseTransaction: baseTx,
        feeCurrencySymbol: feeCurrency.symbol,
        feeCurrencyAddress,
        maxFeePerGas,
        maxPriorityFeePerGas,
        baseFeePerGas,
        spendToken,
        spendTokenAmount,
        isGasSubsidized,
      })
      if (!tx) {
        return null
      }
      transactions.push(tx)
    }
  }

  return transactions
}

export type PrepareTransactions = typeof prepareTransactions
/**
 * Prepare transactions to submit to the blockchain.
 *
 * Adds "maxFeePerGas" and "maxPriorityFeePerGas" fields to base transactions. Adds "gas" field to base
 *  transactions if they do not already include them.
 *
 * NOTE: throws if spendTokenAmount exceeds the user's balance of that token, unless throwOnSpendTokenAmountExceedsBalance is false
 *
 * @param feeCurrencies
 * @param spendToken
 * @param spendTokenAmount BigNumber in smallest unit
 * @param decreasedAmountGasFeeMultiplier
 * @param baseTransactions
 * @param throwOnSpendTokenAmountExceedsBalance
 * @param isGasSubsidized
 */
export async function prepareTransactions({
  feeCurrencies,
  spendToken,
  spendTokenAmount = new BigNumber(0),
  decreasedAmountGasFeeMultiplier = 1,
  baseTransactions,
  throwOnSpendTokenAmountExceedsBalance = true,
  isGasSubsidized = false,
  origin,
}: {
  feeCurrencies: TokenBalance[]
  spendToken?: TokenBalance
  spendTokenAmount?: BigNumber
  decreasedAmountGasFeeMultiplier?: number
  baseTransactions: (TransactionRequest & { gas?: bigint })[]
  throwOnSpendTokenAmountExceedsBalance?: boolean
  isGasSubsidized?: boolean
  origin: TransactionOrigin
}): Promise<PreparedTransactionsResult> {
  if (!spendToken && spendTokenAmount.isGreaterThan(0)) {
    throw new Error(
      `prepareTransactions requires a spendToken if spendTokenAmount is greater than 0. spendTokenAmount: ${spendTokenAmount.toString()}`
    )
  }
  if (
    throwOnSpendTokenAmountExceedsBalance &&
    spendToken &&
    spendTokenAmount.isGreaterThan(spendToken.balance.shiftedBy(spendToken.decimals))
  ) {
    throw new Error(
      `Cannot prepareTransactions for amount greater than balance. Amount: ${spendTokenAmount.toString()}, Balance: ${spendToken.balance.toString()}, Decimals: ${
        spendToken.decimals
      }`
    )
  }

  // Attach divvi tag to all transactions if divvi is enabled
  const config = getAppConfig()
  if (config.divviProtocol) {
    const walletAddress = baseTransactions[0].from
    const referralTag =
      walletAddress &&
      getReferralTag({
        consumer: config.divviProtocol.divviId,
        user: walletAddress,
      })
    if (referralTag) {
      baseTransactions.forEach((tx) => {
        tx.data = tx.data && ((tx.data + referralTag) as Hex)
      })
    }
  }

  const gasFees: Array<{
    feeCurrency: TokenBalance
    maxGasFeeInDecimal: BigNumber
    estimatedGasFeeInDecimal: BigNumber
  }> = []
  for (const feeCurrency of feeCurrencies) {
    if (feeCurrency.balance.isLessThanOrEqualTo(0) && !isGasSubsidized) {
      // No balance, try next fee currency
      continue
    }

    const spendAmountDecimal = spendTokenAmount.shiftedBy(-(spendToken?.decimals ?? 0))

    const estimatedTransactions = await tryEstimateTransactions(
      baseTransactions,
      feeCurrency,
      isGasSubsidized,
      spendToken,
      spendTokenAmount,
      isGasSubsidized
    )
    if (!estimatedTransactions) {
      // Not enough balance to pay for gas, try next fee currency
      continue
    }

    const feeDecimals = getFeeDecimals(estimatedTransactions, feeCurrency)
    const maxGasFee = getMaxGasFee(estimatedTransactions)
    const maxGasFeeInDecimal = maxGasFee.shiftedBy(-feeDecimals)
    const estimatedGasFee = getEstimatedGasFee(estimatedTransactions)
    const estimatedGasFeeInDecimal = estimatedGasFee?.shiftedBy(-feeDecimals)
    gasFees.push({ feeCurrency, maxGasFeeInDecimal, estimatedGasFeeInDecimal })
    if (maxGasFeeInDecimal.isGreaterThan(feeCurrency.balance) && !isGasSubsidized) {
      // Not enough balance to pay for gas, try next fee currency
      continue
    }
    if (
      spendToken &&
      spendToken.tokenId === feeCurrency.tokenId &&
      spendAmountDecimal.plus(maxGasFeeInDecimal).isGreaterThan(spendToken.balance) &&
      !isGasSubsidized
    ) {
      // Not enough balance to pay for gas, try next fee currency
      continue
    }

    // This is the one we can use
    return {
      type: 'possible',
      transactions: estimatedTransactions,
      feeCurrency,
    } satisfies PreparedTransactionsPossible
  }

  if (feeCurrencies.length > 0) {
    // there should always be at least one fee currency, the if is just a safeguard
    AppAnalytics.track(TransactionEvents.transaction_prepare_insufficient_gas, {
      origin,
      networkId: feeCurrencies[0].networkId,
    })
  }

  // So far not enough balance to pay for gas
  // let's see if we can decrease the spend amount, if provided
  // if no spend amount is provided, we conclude that the user does not have enough balance to pay for gas
  const result = gasFees.find(({ feeCurrency }) => feeCurrency.tokenId === spendToken?.tokenId)
  if (
    !spendToken ||
    !result ||
    result.maxGasFeeInDecimal.isGreaterThan(result.feeCurrency.balance)
  ) {
    // Can't decrease the spend amount
    return {
      type: 'not-enough-balance-for-gas',
      feeCurrencies,
    } satisfies PreparedTransactionsNotEnoughBalanceForGas
  }

  // We can decrease the spend amount to pay for gas,
  // We'll ask the user if they want to proceed
  const adjustedMaxGasFee = result.maxGasFeeInDecimal.times(decreasedAmountGasFeeMultiplier)
  const maxAmount = spendToken.balance.minus(adjustedMaxGasFee)

  return {
    type: 'need-decrease-spend-amount-for-gas',
    feeCurrency: result.feeCurrency,
    maxGasFeeInDecimal: adjustedMaxGasFee,
    estimatedGasFeeInDecimal: result.estimatedGasFeeInDecimal,
    decreasedSpendAmount: maxAmount,
  } satisfies PreparedTransactionsNeedDecreaseSpendAmountForGas
}

/**
 * Prepare a transaction for sending an ERC-20 token with the 'transfer' method.
 *
 * @param fromWalletAddress the address of the wallet sending the transaction
 * @param toWalletAddress the address of the wallet receiving the token
 * @param sendToken the token to send
 * @param amount the amount of the token to send, denominated in the smallest units for that token
 * @param feeCurrencies the balances of the currencies to consider using for paying the transaction fee
 *
 * @param prepareTxs a function that prepares the transactions (for unit testing-- should use default everywhere else)
 */
export async function prepareERC20TransferTransaction(
  {
    fromWalletAddress,
    toWalletAddress,
    sendToken,
    amount,
    feeCurrencies,
  }: {
    fromWalletAddress: string
    toWalletAddress: string
    sendToken: TokenBalanceWithAddress
    amount: bigint
    feeCurrencies: TokenBalance[]
  },
  prepareTxs = prepareTransactions // for unit testing
): Promise<PreparedTransactionsResult> {
  const baseSendTx: TransactionRequest = {
    from: fromWalletAddress as Address,
    to: sendToken.address as Address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [toWalletAddress as Address, amount],
    }),
  }
  return prepareTxs({
    feeCurrencies,
    spendToken: sendToken,
    spendTokenAmount: new BigNumber(amount.toString()),
    decreasedAmountGasFeeMultiplier: 1,
    baseTransactions: [baseSendTx],
    origin: 'send',
  })
}

/**
 * Prepare a transaction for sending native asset.
 *
 * @param fromWalletAddress - sender address
 * @param toWalletAddress - recipient address
 * @param amount the amount of the token to send, denominated in the smallest units for that token
 * @param feeCurrencies - tokens to consider using for paying the transaction fee
 * @param sendToken - native asset to send. MUST be native asset (e.g. sendable using the 'value' field of a transaction, like ETH or CELO)
 *
 * @param prepareTxs a function that prepares the transactions (for unit testing-- should use default everywhere else)
 **/
export function prepareSendNativeAssetTransaction(
  {
    fromWalletAddress,
    toWalletAddress,
    amount,
    feeCurrencies,
    sendToken,
  }: {
    fromWalletAddress: string
    toWalletAddress: string
    amount: bigint
    feeCurrencies: TokenBalance[]
    sendToken: NativeTokenBalance
  },
  prepareTxs = prepareTransactions
): Promise<PreparedTransactionsResult> {
  const baseSendTx: TransactionRequest = {
    from: fromWalletAddress as Address,
    to: toWalletAddress as Address,
    value: amount,
  }
  return prepareTxs({
    feeCurrencies,
    spendToken: sendToken,
    spendTokenAmount: new BigNumber(amount.toString()),
    decreasedAmountGasFeeMultiplier: 1,
    baseTransactions: [baseSendTx],
    origin: 'send',
  })
}

export type GetFeeCurrencyAndAmounts = typeof getFeeCurrencyAndAmounts
/**
 * Given prepared transactions, get the fee currency and amounts in decimals
 *
 * @param prepareTransactionsResult
 */
export function getFeeCurrencyAndAmounts(
  prepareTransactionsResult: PreparedTransactionsResult | undefined
): {
  feeCurrency: TokenBalance | undefined
  maxFeeAmount: BigNumber | undefined
  estimatedFeeAmount: BigNumber | undefined
} {
  let feeCurrency = undefined
  let maxFeeAmount = undefined
  let estimatedFeeAmount = undefined
  if (prepareTransactionsResult?.type === 'possible') {
    feeCurrency = prepareTransactionsResult.feeCurrency
    const feeDecimals = getFeeDecimals(prepareTransactionsResult.transactions, feeCurrency)
    maxFeeAmount = getMaxGasFee(prepareTransactionsResult.transactions).shiftedBy(-feeDecimals)
    estimatedFeeAmount = getEstimatedGasFee(prepareTransactionsResult.transactions).shiftedBy(
      -feeDecimals
    )
  } else if (prepareTransactionsResult?.type === 'need-decrease-spend-amount-for-gas') {
    feeCurrency = prepareTransactionsResult.feeCurrency
    maxFeeAmount = prepareTransactionsResult.maxGasFeeInDecimal
    estimatedFeeAmount = prepareTransactionsResult.estimatedGasFeeInDecimal
  }
  return {
    feeCurrency,
    maxFeeAmount,
    estimatedFeeAmount,
  }
}

/**
 * Given prepared transaction(s), get the fee currency set.
 * IMPORTANT: it can be a fee currency adapter address, not the actual fee currency address
 *
 * NOTE: throws if the fee currency is not the same for all transactions
 */
export function getFeeCurrency(preparedTransactions: TransactionRequest[]): Address | undefined
export function getFeeCurrency(preparedTransaction: TransactionRequest): Address | undefined
export function getFeeCurrency(x: TransactionRequest[] | TransactionRequest): Address | undefined {
  const preparedTransactions = Array.isArray(x) ? x : [x]

  const feeCurrencies = preparedTransactions.map(_getFeeCurrency)
  // The prepared transactions should always use the same fee currency
  // throw if that's not the case
  if (
    feeCurrencies.length > 1 &&
    feeCurrencies.some((feeCurrency) => feeCurrency !== feeCurrencies[0])
  ) {
    throw new Error('Unexpected usage of multiple fee currencies for prepared transactions')
  }

  return feeCurrencies[0]
}

function _getFeeCurrency(prepareTransaction: TransactionRequest): Address | undefined {
  if ('feeCurrency' in prepareTransaction) {
    return prepareTransaction.feeCurrency
  }

  return undefined
}

export function getFeeCurrencyToken(
  preparedTransactions: TransactionRequest[],
  networkId: NetworkId,
  tokensById: TokenBalances
): TokenBalance | undefined {
  const feeCurrencyAdapterOrAddress = getFeeCurrency(preparedTransactions)

  // First try to find the fee currency token by its address (most common case)
  const feeCurrencyToken = tokensById[getTokenId(networkId, feeCurrencyAdapterOrAddress)]
  if (feeCurrencyToken) {
    return feeCurrencyToken
  }

  // Then try finding the fee currency token by its fee currency adapter address
  if (feeCurrencyAdapterOrAddress) {
    return Object.values(tokensById).find(
      (token) =>
        token &&
        token.networkId === networkId &&
        token.feeCurrencyAdapterAddress === feeCurrencyAdapterOrAddress
    )
  }

  // This indicates we're missing some data
  Logger.error(
    TAG,
    `Could not find fee currency token for prepared transactions with feeCurrency set to '${feeCurrencyAdapterOrAddress}' in network ${networkId}`
  )
  return undefined
}

export function getFeeDecimals(
  preparedTransactions: TransactionRequest[],
  feeCurrency: TokenBalance
): number {
  const feeCurrencyAdapterOrAddress = getFeeCurrency(preparedTransactions)
  if (!feeCurrencyAdapterOrAddress) {
    if (!feeCurrency.isNative) {
      // This should never happen
      throw new Error(`Passed fee currency (${feeCurrency.tokenId}) must be native`)
    }
    return feeCurrency.decimals
  }

  if (feeCurrencyAdapterOrAddress === feeCurrency.feeCurrencyAdapterAddress) {
    if (feeCurrency.feeCurrencyAdapterDecimals === undefined) {
      // This should never happen
      throw new Error(
        `Passed fee currency (${feeCurrency.tokenId}) does not have 'feeCurrencyAdapterDecimals' set`
      )
    }
    return feeCurrency.feeCurrencyAdapterDecimals
  }

  if (feeCurrencyAdapterOrAddress === feeCurrency.address) {
    return feeCurrency.decimals
  }

  // This should never happen
  throw new Error(
    `Passed fee currency (${feeCurrency.tokenId}) does not match the fee currency of the prepared transactions (${feeCurrencyAdapterOrAddress})`
  )
}
