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
  const txDetails: Array<{
    gas: string
    maxFeePerGas: string
    maxFeePerGasGwei: string
    fee: string
    formula: string
  }> = []

  for (const tx of txs) {
    if (!tx.gas || !tx.maxFeePerGas) {
      throw new Error('Missing gas or maxFeePerGas')
    }
    const txFee = BigInt(tx.gas) * BigInt(tx.maxFeePerGas)
    maxGasFee += txFee

    // Convert maxFeePerGas from wei to gwei for readability (1 gwei = 10^9 wei)
    const maxFeePerGasGwei = new BigNumber(tx.maxFeePerGas.toString()).shiftedBy(-9).toFixed(9)

    txDetails.push({
      gas: tx.gas.toString(),
      maxFeePerGas: tx.maxFeePerGas.toString() + ' wei',
      maxFeePerGasGwei: maxFeePerGasGwei + ' gwei',
      fee: txFee.toString() + ' wei',
      formula: `${tx.gas.toString()} gas × ${maxFeePerGasGwei} gwei = ${txFee.toString()} wei`,
    })
  }

  Logger.debug(TAG, 'Max gas fee calculation (Formula: gas × maxFeePerGas)', {
    totalMaxGasFeeWei: maxGasFee.toString() + ' wei',
    totalMaxGasFeeGwei: new BigNumber(maxGasFee.toString()).shiftedBy(-9).toFixed(9) + ' gwei',
    transactionCount: txs.length,
    transactions: txDetails,
  })

  return new BigNumber(maxGasFee.toString())
}

export function getEstimatedGasFee(txs: TransactionRequest[]): BigNumber {
  let estimatedGasFee = BigInt(0)
  const txDetails: Array<{
    estimatedGas: string
    _estimatedGasUse?: string
    gas?: string
    baseFeePerGas: string
    baseFeePerGasGwei: string
    maxPriorityFeePerGas: string
    maxPriorityFeePerGasGwei: string
    maxFeePerGas: string
    maxFeePerGasGwei: string
    expectedFeePerGas: string
    expectedFeePerGasGwei: string
    usedFeePerGas: string
    usedFeePerGasGwei: string
    fee: string
    formula: string
  }> = []

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
    const usedFeePerGas = expectedFeePerGas < tx.maxFeePerGas ? expectedFeePerGas : tx.maxFeePerGas
    const txFee = estimatedGas * usedFeePerGas

    estimatedGasFee += txFee

    // Convert to gwei for readability (1 gwei = 10^9 wei)
    const baseFeeGwei = new BigNumber(tx._baseFeePerGas.toString()).shiftedBy(-9).toFixed(9)
    const priorityFeeGwei = new BigNumber((tx.maxPriorityFeePerGas ?? BigInt(0)).toString())
      .shiftedBy(-9)
      .toFixed(9)
    const maxFeeGwei = new BigNumber(tx.maxFeePerGas.toString()).shiftedBy(-9).toFixed(9)
    const expectedFeeGwei = new BigNumber(expectedFeePerGas.toString()).shiftedBy(-9).toFixed(9)
    const usedFeeGwei = new BigNumber(usedFeePerGas.toString()).shiftedBy(-9).toFixed(9)

    txDetails.push({
      estimatedGas: estimatedGas.toString() + ' gas',
      _estimatedGasUse: tx._estimatedGasUse?.toString(),
      gas: tx.gas?.toString(),
      baseFeePerGas: tx._baseFeePerGas.toString() + ' wei',
      baseFeePerGasGwei: baseFeeGwei + ' gwei',
      maxPriorityFeePerGas: (tx.maxPriorityFeePerGas ?? BigInt(0)).toString() + ' wei',
      maxPriorityFeePerGasGwei: priorityFeeGwei + ' gwei',
      maxFeePerGas: tx.maxFeePerGas.toString() + ' wei',
      maxFeePerGasGwei: maxFeeGwei + ' gwei',
      expectedFeePerGas: expectedFeePerGas.toString() + ' wei',
      expectedFeePerGasGwei: expectedFeeGwei + ' gwei',
      usedFeePerGas: usedFeePerGas.toString() + ' wei',
      usedFeePerGasGwei: usedFeeGwei + ' gwei',
      fee: txFee.toString() + ' wei',
      formula: `${estimatedGas.toString()} gas × min(${expectedFeeGwei} gwei expected, ${maxFeeGwei} gwei max) = ${estimatedGas.toString()} gas × ${usedFeeGwei} gwei = ${txFee.toString()} wei`,
    })
  }

  Logger.debug(
    TAG,
    'Estimated gas fee calculation (Formula: estimatedGas × min(baseFee + priorityFee, maxFee))',
    {
      totalEstimatedGasFeeWei: estimatedGasFee.toString() + ' wei',
      totalEstimatedGasFeeGwei: new BigNumber(estimatedGasFee.toString())
        .shiftedBy(-9)
        .toFixed(9) + ' gwei',
      transactionCount: txs.length,
      transactions: txDetails,
    }
  )

  return new BigNumber(estimatedGasFee.toString())
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
 */
export async function tryEstimateTransaction({
  client,
  baseTransaction,
  maxFeePerGas,
  maxPriorityFeePerGas,
  baseFeePerGas,
  feeCurrencySymbol,
  feeCurrencyAddress,
}: {
  client: Client
  baseTransaction: TransactionRequest
  maxFeePerGas: bigint
  maxPriorityFeePerGas?: bigint
  baseFeePerGas: bigint
  feeCurrencySymbol: string
  feeCurrencyAddress?: Address
}) {
  const tx = {
    ...baseTransaction,
    maxFeePerGas,
    maxPriorityFeePerGas,
    // Don't include the feeCurrency field if not present.
    // See https://github.com/wagmi-dev/viem/blob/e0149711da5894ac5f0719414b4ecc06ccaecb7b/src/chains/celo/serializers.ts#L164-L168
    ...(feeCurrencyAddress && { feeCurrency: feeCurrencyAddress }),
  }

  // TODO maybe cache this? and add static padding when using non-native fee currency
  try {
    const estimatedGas = await estimateGas(client, {
      ...(tx as any), // TODO: fix type, probably related to the generic client type
      account: tx.from,
    })
    tx.gas = estimatedGas
    tx._baseFeePerGas = baseFeePerGas

    Logger.debug(TAG, 'estimateGas successful', {
      feeCurrencySymbol,
      feeCurrencyAddress,
      estimatedGas: estimatedGas.toString(),
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
      baseFeePerGas: baseFeePerGas.toString(),
      from: tx.from,
      to: tx.to,
      value: tx.value?.toString(),
    })

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
      Logger.warn(TAG, `Couldn't estimate gas with feeCurrency ${feeCurrencySymbol}`, {
        error: e,
        feeCurrencySymbol,
        feeCurrencyAddress,
        errorName: e.name,
        causeName: (e.cause as Error)?.name,
        causeMessage: (e.cause as Error)?.message,
        from: baseTransaction.from,
        to: baseTransaction.to,
        value: baseTransaction.value?.toString(),
      })
      return null
    }
    Logger.error(TAG, `Unexpected error estimating gas for ${feeCurrencySymbol}`, e)
    throw e
  }

  return tx
}

export async function tryEstimateTransactions(
  baseTransactions: TransactionRequest[],
  feeCurrency: TokenBalance,
  useAppTransport: boolean = false
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

      const originalGas = baseTx.gas
      const originalEstimatedGasUse = baseTx._estimatedGasUse
      const paddingAmount = feeCurrency.isNative ? 0 : STATIC_GAS_PADDING
      const paddedGas = baseTx.gas + BigInt(paddingAmount)
      const paddedEstimatedGasUse = originalEstimatedGasUse
        ? originalEstimatedGasUse + BigInt(paddingAmount)
        : undefined

      Logger.debug(TAG, 'Gas calculation - pre-estimated transaction', {
        feeCurrencySymbol: feeCurrency.symbol,
        feeCurrencyTokenId: feeCurrency.tokenId,
        isNative: feeCurrency.isNative,
        originalGas: originalGas.toString(),
        originalEstimatedGasUse: originalEstimatedGasUse?.toString(),
        paddingAmount,
        paddedGas: paddedGas.toString(),
        paddedEstimatedGasUse: paddedEstimatedGasUse?.toString(),
        paddingApplied: !feeCurrency.isNative,
      })

      if (!feeCurrency.isNative) {
        Logger.warn(TAG, 'STATIC_GAS_PADDING applied to pre-estimated gas', {
          feeCurrencySymbol: feeCurrency.symbol,
          paddingAmount: STATIC_GAS_PADDING,
          originalGas: originalGas.toString(),
          newGas: paddedGas.toString(),
        })
      }

      transactions.push({
        ...baseTx,
        maxFeePerGas,
        maxPriorityFeePerGas,
        // Don't include the feeCurrency field if not present.
        // See https://github.com/wagmi-dev/viem/blob/e0149711da5894ac5f0719414b4ecc06ccaecb7b/src/chains/celo/serializers.ts#L164-L168
        ...(feeCurrencyAddress && { feeCurrency: feeCurrencyAddress }),
        // We assume the provided gas value is with the native fee currency
        // If it's not, we add the static padding
        gas: paddedGas,
        _estimatedGasUse: baseTx._estimatedGasUse
          ? baseTx._estimatedGasUse + BigInt(paddingAmount)
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
      })
      if (!tx) {
        return null
      }
      transactions.push(tx)
    }
  }

  return transactions
}

/**
 * Pre-estimate gas fees for a transaction when the send token equals the fee currency.
 * This is necessary because Celo's eth_estimateGas will fail if amount + fees > balance.
 *
 * Following Celo's documentation: when transferring a token and paying fees in that same token,
 * we must calculate the transaction fee BEFORE attempting the full estimation.
 *
 * @param baseTransactions The transactions to estimate (with reduced amounts for testing)
 * @param feeCurrency The fee currency (same as send token)
 * @param spendToken The token being sent
 * @param spendTokenAmount The full amount user wants to send (in smallest units)
 * @param client The blockchain client
 * @param feeCurrencyAddress The fee currency address
 */
async function preEstimateFeesForSameToken({
  baseTransactions,
  feeCurrency,
  spendToken,
  spendTokenAmount,
  client,
  feeCurrencyAddress,
}: {
  baseTransactions: TransactionRequest[]
  feeCurrency: TokenBalance
  spendToken: TokenBalance
  spendTokenAmount: BigNumber
  client: Client
  feeCurrencyAddress?: Address
}): Promise<{ maxGasFeeInDecimal: BigNumber; estimatedGasFeeInDecimal: BigNumber } | null> {
  Logger.info(TAG, 'Pre-estimating fees for same-token transaction', {
    token: spendToken.symbol,
    requestedAmount: spendTokenAmount.shiftedBy(-spendToken.decimals).toString() + ` ${spendToken.symbol}`,
    balance: spendToken.balance.toString() + ` ${spendToken.symbol}`,
  })

  // Step 2: Create a test transaction with a smaller amount (80% of requested)
  // This ensures the estimation will succeed even if the full amount + fees > balance
  const testAmount = spendTokenAmount.times(0.8).integerValue(BigNumber.ROUND_DOWN)

  const testTransactions = baseTransactions.map((tx) => {
    // If it's an ERC20 transfer, update the amount in the data field
    if (tx.data && tx.data.startsWith('0xa9059cbb')) {
      // ERC20 transfer(address,uint256) - update the amount parameter
      const recipientAddress = tx.data.slice(0, 74) // function selector + address (4 + 64 + 6 chars)
      const newAmount = testAmount.toString(16).padStart(64, '0')
      return {
        ...tx,
        data: (recipientAddress + newAmount) as Hex,
      }
    }
    // For native transfers, update the value
    if (tx.value) {
      return {
        ...tx,
        value: BigInt(testAmount.toString()),
      }
    }
    return tx
  })

  Logger.debug(TAG, 'Estimating gas with reduced test amount', {
    originalAmount: spendTokenAmount.shiftedBy(-spendToken.decimals).toString() + ` ${spendToken.symbol}`,
    testAmount: testAmount.shiftedBy(-spendToken.decimals).toString() + ` ${spendToken.symbol}`,
    reductionPercentage: '20%',
  })

  // Step 3: Estimate gas with the reduced amount
  const estimatedTransactions = await tryEstimateTransactions(testTransactions, feeCurrency, false)

  if (!estimatedTransactions) {
    Logger.warn(TAG, 'Pre-estimation failed even with reduced amount', {
      testAmount: testAmount.shiftedBy(-spendToken.decimals).toString() + ` ${spendToken.symbol}`,
    })
    return null
  }

  // Step 4: Calculate fees
  const feeDecimals = getFeeDecimals(estimatedTransactions, feeCurrency)
  const maxGasFee = getMaxGasFee(estimatedTransactions)
  const maxGasFeeInDecimal = maxGasFee.shiftedBy(-feeDecimals)
  const estimatedGasFee = getEstimatedGasFee(estimatedTransactions)
  const estimatedGasFeeInDecimal = estimatedGasFee.shiftedBy(-feeDecimals)

  Logger.info(TAG, 'Pre-estimated gas fees for same-token transaction', {
    token: spendToken.symbol,
    maxGasFee: maxGasFeeInDecimal.toString() + ` ${spendToken.symbol}`,
    estimatedGasFee: estimatedGasFeeInDecimal.toString() + ` ${spendToken.symbol}`,
    note: 'These fees will be used to check if full transaction is possible',
  })

  return { maxGasFeeInDecimal, estimatedGasFeeInDecimal }
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

  const spendAmountDecimal = spendToken
    ? spendTokenAmount.shiftedBy(-spendToken.decimals)
    : new BigNumber(0)

  Logger.debug(TAG, 'prepareTransactions starting', {
    feeCurrenciesCount: feeCurrencies.length,
    spendTokenSymbol: spendToken?.symbol,
    spendTokenAmountWei: spendTokenAmount.toString() + ' wei',
    spendTokenAmountDecimal: spendToken
      ? spendAmountDecimal.toString() + ` ${spendToken.symbol}`
      : 'N/A',
    spendTokenBalance: spendToken
      ? spendToken.balance.toString() + ` ${spendToken.symbol}`
      : 'N/A',
    isGasSubsidized,
    origin,
  })

  for (const feeCurrency of feeCurrencies) {
    Logger.debug(TAG, `Trying fee currency ${feeCurrency.symbol}`, {
      balance: feeCurrency.balance.toString(),
      isNative: feeCurrency.isNative,
      tokenId: feeCurrency.tokenId,
    })

    if (feeCurrency.balance.isLessThanOrEqualTo(0) && !isGasSubsidized) {
      Logger.debug(TAG, `Skipping ${feeCurrency.symbol} - zero balance`)
      // No balance, try next fee currency
      continue
    }

    // Special handling when send token equals fee currency
    // Following Celo docs: we must pre-estimate fees before attempting the full transaction
    if (
      spendToken &&
      spendToken.tokenId === feeCurrency.tokenId &&
      !isGasSubsidized &&
      spendTokenAmount.isGreaterThan(0)
    ) {
      Logger.info(TAG, `Same-token transaction detected: ${spendToken.symbol}`, {
        sendToken: spendToken.symbol,
        feeCurrency: feeCurrency.symbol,
        amount: spendAmountDecimal.toString() + ` ${spendToken.symbol}`,
        balance: spendToken.balance.toString() + ` ${spendToken.symbol}`,
      })

      const network = networkIdToNetwork[feeCurrency.networkId]
      const client = publicClient[network]
      const feeCurrencyAddress = getFeeCurrencyAddress(feeCurrency)

      // Pre-estimate fees with a reduced amount
      const preEstimatedFees = await preEstimateFeesForSameToken({
        baseTransactions,
        feeCurrency,
        spendToken,
        spendTokenAmount,
        client,
        feeCurrencyAddress,
      })

      if (!preEstimatedFees) {
        Logger.warn(TAG, `Could not pre-estimate fees for ${feeCurrency.symbol}`, {
          feeCurrencySymbol: feeCurrency.symbol,
          balance: feeCurrency.balance.toString(),
        })
        // Not enough balance even with reduced amount, try next fee currency
        continue
      }

      // Check if user's requested amount + fees fits in balance
      const totalNeeded = spendAmountDecimal.plus(preEstimatedFees.maxGasFeeInDecimal)
      if (totalNeeded.isGreaterThan(spendToken.balance)) {
        Logger.warn(TAG, `Insufficient balance for same-token transaction`, {
          token: spendToken.symbol,
          requestedAmount: spendAmountDecimal.toString() + ` ${spendToken.symbol}`,
          maxGasFee: preEstimatedFees.maxGasFeeInDecimal.toString() + ` ${spendToken.symbol}`,
          totalNeeded: totalNeeded.toString() + ` ${spendToken.symbol}`,
          balance: spendToken.balance.toString() + ` ${spendToken.symbol}`,
          deficit: totalNeeded.minus(spendToken.balance).toString() + ` ${spendToken.symbol}`,
          note: 'Will attempt to provide decreased amount option',
        })

        // Save the pre-estimated fees for potential "need-decrease-spend-amount-for-gas" result
        gasFees.push({
          feeCurrency,
          maxGasFeeInDecimal: preEstimatedFees.maxGasFeeInDecimal,
          estimatedGasFeeInDecimal: preEstimatedFees.estimatedGasFeeInDecimal,
        })

        // Continue to try other fee currencies, but we have fees for this one
        continue
      }

      // Amount + fees fits! Now do the real estimation with the full amount
      Logger.info(TAG, `Amount + fees fits in balance, proceeding with full estimation`, {
        token: spendToken.symbol,
        totalNeeded: totalNeeded.toString() + ` ${spendToken.symbol}`,
        balance: spendToken.balance.toString() + ` ${spendToken.symbol}`,
        buffer: spendToken.balance.minus(totalNeeded).toString() + ` ${spendToken.symbol}`,
      })
    }

    const estimatedTransactions = await tryEstimateTransactions(
      baseTransactions,
      feeCurrency,
      isGasSubsidized
    )
    if (!estimatedTransactions) {
      Logger.warn(TAG, `Could not estimate transactions with ${feeCurrency.symbol}`, {
        feeCurrencySymbol: feeCurrency.symbol,
        balance: feeCurrency.balance.toString(),
      })
      // Not enough balance to pay for gas, try next fee currency
      continue
    }
    const feeDecimals = getFeeDecimals(estimatedTransactions, feeCurrency)
    const maxGasFee = getMaxGasFee(estimatedTransactions)
    const maxGasFeeInDecimal = maxGasFee.shiftedBy(-feeDecimals)
    const estimatedGasFee = getEstimatedGasFee(estimatedTransactions)
    const estimatedGasFeeInDecimal = estimatedGasFee?.shiftedBy(-feeDecimals)

    Logger.info(TAG, `Gas fee calculated for ${feeCurrency.symbol}`, {
      feeCurrencySymbol: feeCurrency.symbol,
      feeCurrencyBalance: feeCurrency.balance.toString() + ` ${feeCurrency.symbol}`,
      isNative: feeCurrency.isNative,
      maxGasFeeWei: maxGasFee.toString() + ' wei',
      maxGasFeeInToken: maxGasFeeInDecimal.toString() + ` ${feeCurrency.symbol}`,
      estimatedGasFeeWei: estimatedGasFee.toString() + ' wei',
      estimatedGasFeeInToken: estimatedGasFeeInDecimal.toString() + ` ${feeCurrency.symbol}`,
      conversionFormula: `Fee (wei) ÷ 10^${feeDecimals} = Fee (${feeCurrency.symbol})`,
      feeDecimals,
      transactionCount: estimatedTransactions.length,
    })

    // Log detailed gas breakdown per transaction
    estimatedTransactions.forEach((tx, index) => {
      Logger.debug(TAG, `Transaction ${index} gas details`, {
        gas: tx.gas?.toString(),
        _estimatedGasUse: tx._estimatedGasUse?.toString(),
        maxFeePerGas: tx.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
        _baseFeePerGas: tx._baseFeePerGas?.toString(),
        feeCurrency: 'feeCurrency' in tx ? tx.feeCurrency : undefined,
      })
    })

    gasFees.push({ feeCurrency, maxGasFeeInDecimal, estimatedGasFeeInDecimal })
    if (maxGasFeeInDecimal.isGreaterThan(feeCurrency.balance) && !isGasSubsidized) {
      const deficit = maxGasFeeInDecimal.minus(feeCurrency.balance)
      Logger.warn(TAG, `Insufficient balance for gas in ${feeCurrency.symbol}`, {
        feeCurrencySymbol: feeCurrency.symbol,
        check: `maxGasFee (${maxGasFeeInDecimal.toString()} ${feeCurrency.symbol}) > balance (${feeCurrency.balance.toString()} ${feeCurrency.symbol})`,
        maxGasFee: maxGasFeeInDecimal.toString() + ` ${feeCurrency.symbol}`,
        balance: feeCurrency.balance.toString() + ` ${feeCurrency.symbol}`,
        deficit: deficit.toString() + ` ${feeCurrency.symbol}`,
        deficitPercentage: deficit.dividedBy(feeCurrency.balance).times(100).toFixed(2) + '%',
      })
      // Not enough balance to pay for gas, try next fee currency
      continue
    }
    if (
      spendToken &&
      spendToken.tokenId === feeCurrency.tokenId &&
      spendAmountDecimal.plus(maxGasFeeInDecimal).isGreaterThan(spendToken.balance) &&
      !isGasSubsidized
    ) {
      const totalNeeded = spendAmountDecimal.plus(maxGasFeeInDecimal)
      const deficit = totalNeeded.minus(spendToken.balance)
      Logger.warn(
        TAG,
        `Insufficient balance for transaction + gas in ${feeCurrency.symbol}`,
        {
          feeCurrencySymbol: feeCurrency.symbol,
          spendTokenSymbol: spendToken.symbol,
          check: `${spendAmountDecimal.toString()} ${spendToken.symbol} (send) + ${maxGasFeeInDecimal.toString()} ${feeCurrency.symbol} (gas) = ${totalNeeded.toString()} ${spendToken.symbol} > ${spendToken.balance.toString()} ${spendToken.symbol} (balance)`,
          spendAmount: spendAmountDecimal.toString() + ` ${spendToken.symbol}`,
          maxGasFee: maxGasFeeInDecimal.toString() + ` ${feeCurrency.symbol}`,
          totalNeeded: totalNeeded.toString() + ` ${spendToken.symbol}`,
          balance: spendToken.balance.toString() + ` ${spendToken.symbol}`,
          deficit: deficit.toString() + ` ${spendToken.symbol}`,
          deficitPercentage: deficit.dividedBy(spendToken.balance).times(100).toFixed(2) + '%',
        }
      )
      // Not enough balance to pay for gas, try next fee currency
      continue
    }

    // This is the one we can use
    const successLog: any = {
      feeCurrencySymbol: feeCurrency.symbol,
      maxGasFee: maxGasFeeInDecimal.toString() + ` ${feeCurrency.symbol}`,
      estimatedGasFee: estimatedGasFeeInDecimal.toString() + ` ${feeCurrency.symbol}`,
      feeCurrencyBalance: feeCurrency.balance.toString() + ` ${feeCurrency.symbol}`,
      transactionCount: estimatedTransactions.length,
    }

    if (spendToken && spendToken.tokenId === feeCurrency.tokenId) {
      const spendAmountDecimal = spendTokenAmount.shiftedBy(-(spendToken?.decimals ?? 0))
      const totalCost = spendAmountDecimal.plus(maxGasFeeInDecimal)
      const remaining = spendToken.balance.minus(totalCost)
      successLog.spendToken = spendToken.symbol
      successLog.spendAmount = spendAmountDecimal.toString() + ` ${spendToken.symbol}`
      successLog.totalCost =
        `${spendAmountDecimal.toString()} ${spendToken.symbol} (send) + ${maxGasFeeInDecimal.toString()} ${feeCurrency.symbol} (gas) = ` +
        totalCost.toString() +
        ` ${spendToken.symbol}`
      successLog.remainingBalance = remaining.toString() + ` ${spendToken.symbol}`
      successLog.balanceCheck = `${totalCost.toString()} ${spendToken.symbol} (total) < ${spendToken.balance.toString()} ${spendToken.symbol} (balance) ✓`
    } else {
      successLog.balanceCheck = `${maxGasFeeInDecimal.toString()} ${feeCurrency.symbol} (gas) < ${feeCurrency.balance.toString()} ${feeCurrency.symbol} (balance) ✓`
    }

    Logger.info(TAG, `Successfully prepared transactions with ${feeCurrency.symbol}`, successLog)
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

  Logger.warn(TAG, 'No fee currency had sufficient balance for transaction', {
    feeCurrenciesCount: feeCurrencies.length,
    gasFees: gasFees.map((gf) => ({
      symbol: gf.feeCurrency.symbol,
      balance: gf.feeCurrency.balance.toString(),
      maxGasFee: gf.maxGasFeeInDecimal.toString(),
      estimatedGasFee: gf.estimatedGasFeeInDecimal.toString(),
    })),
    spendTokenSymbol: spendToken?.symbol,
    spendTokenBalance: spendToken?.balance.toString(),
    spendAmount: spendTokenAmount.toString(),
  })

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
    Logger.error(
      TAG,
      'Transaction preparation failed: not enough balance for gas',
      undefined,
      false
    )
    Logger.info(TAG, 'Transaction failure details', {
      reason: 'not-enough-balance-for-gas',
      hasSpendToken: !!spendToken,
      hasResult: !!result,
      feeCurrenciesAttempted: feeCurrencies.map((fc) => ({
        symbol: fc.symbol,
        balance: fc.balance.toString(),
        isNative: fc.isNative,
      })),
      gasFeesSummary: gasFees.map((gf) => ({
        symbol: gf.feeCurrency.symbol,
        maxGasFee: gf.maxGasFeeInDecimal.toString(),
        balance: gf.feeCurrency.balance.toString(),
      })),
    })
    return {
      type: 'not-enough-balance-for-gas',
      feeCurrencies,
    } satisfies PreparedTransactionsNotEnoughBalanceForGas
  }

  // We can decrease the spend amount to pay for gas,
  // We'll ask the user if they want to proceed
  const adjustedMaxGasFee = result.maxGasFeeInDecimal.times(decreasedAmountGasFeeMultiplier)
  const maxAmount = spendToken.balance.minus(adjustedMaxGasFee)

  Logger.info(TAG, 'Transaction requires decreased spend amount', {
    feeCurrencySymbol: result.feeCurrency.symbol,
    originalSpendAmount: spendTokenAmount.toString(),
    decreasedSpendAmount: maxAmount.toString(),
    adjustedMaxGasFee: adjustedMaxGasFee.toString(),
    estimatedGasFee: result.estimatedGasFeeInDecimal.toString(),
    decreasedAmountGasFeeMultiplier,
    spendTokenBalance: spendToken.balance.toString(),
  })

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
