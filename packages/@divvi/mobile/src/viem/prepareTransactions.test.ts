import { getReferralTag } from '@divvi/referral-sdk'
import BigNumber from 'bignumber.js'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { TransactionEvents } from 'src/analytics/Events'
import { getAppConfig } from 'src/appConfig'
import { TokenBalanceWithAddress } from 'src/tokens/slice'
import { Network, NetworkId } from 'src/transactions/types'
import { estimateFeesPerGas } from 'src/viem/estimateFeesPerGas'
import { appPublicClient, publicClient } from 'src/viem/index'
import {
  TransactionRequest,
  createReducedAmountTransactions,
  getEstimatedGasFee,
  getFeeCurrency,
  getFeeCurrencyAddress,
  getFeeCurrencyAndAmounts,
  getFeeCurrencyToken,
  getFeeDecimals,
  getMaxGasFee,
  isERC20Transfer,
  modifyERC20TransferAmount,
  prepareERC20TransferTransaction,
  prepareSendNativeAssetTransaction,
  prepareTransactions,
  rebuildTransactionsWithOriginalAmounts,
  tryEstimateTransaction,
  tryEstimateTransactions,
} from 'src/viem/prepareTransactions'
import { mockAppConfig, mockCeloTokenBalance, mockEthTokenBalance } from 'test/values'
import {
  Address,
  BaseError,
  EstimateGasExecutionError,
  ExecutionRevertedError,
  Hex,
  InsufficientFundsError,
  InvalidInputRpcError,
  encodeFunctionData,
  erc20Abi,
} from 'viem'
import { estimateGas } from 'viem/actions'
import mocked = jest.mocked

jest.mock('@divvi/referral-sdk')
jest.mock('src/viem/estimateFeesPerGas')
jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  encodeFunctionData: jest.fn(),
}))
jest.mock('viem/actions', () => ({
  ...jest.requireActual('viem/actions'),
  estimateGas: jest.fn(),
}))
jest.mock('src/viem/index', () => ({
  publicClient: {
    celo: {} as unknown as jest.Mocked<(typeof publicClient)[Network.Celo]>,
    arbitrum: {} as unknown as jest.Mocked<(typeof publicClient)[Network.Arbitrum]>,
    ethereum: {} as unknown as jest.Mocked<(typeof publicClient)[Network.Ethereum]>,
  },
  appPublicClient: {
    celo: {} as unknown as jest.Mocked<(typeof publicClient)[Network.Celo]>,
    arbitrum: {} as unknown as jest.Mocked<(typeof publicClient)[Network.Arbitrum]>,
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getReferralTag).mockReturnValue('divviData')
})

describe('prepareTransactions module', () => {
  const mockInsufficientFundsError = new EstimateGasExecutionError(
    new InsufficientFundsError({
      cause: new BaseError('insufficient funds'),
    }),
    {}
  )
  const mockValueExceededBalanceError = new EstimateGasExecutionError(
    new ExecutionRevertedError({
      cause: new BaseError('test mock', { details: 'transfer value exceeded balance of sender' }),
    }),
    {}
  )
  const mockExceededAllowanceError = new EstimateGasExecutionError(
    new ExecutionRevertedError({
      cause: new BaseError("transfer value exceeded sender's allowance for spender"),
    }),
    {}
  )
  const mockInvalidInputRpcError = new EstimateGasExecutionError(
    new InvalidInputRpcError(
      new BaseError('test mock', { details: 'gas required exceeds allowance' })
    ),
    {}
  )

  const mockNativeFeeCurrency = {
    address: '0xfee1',
    balance: new BigNumber(100), // 10k units, 100.0 decimals
    decimals: 2,
    priceUsd: null,
    lastKnownPriceUsd: null,
    tokenId: 'celo-mainnet:native',
    symbol: 'FEE1',
    name: 'Fee token 1',
    networkId: NetworkId['celo-mainnet'],
    isNative: true,
  }
  const mockErc20FeeCurrency = {
    address: '0xfee2',
    balance: new BigNumber(70), // 70k units, 70.0 decimals
    decimals: 3,
    priceUsd: null,
    lastKnownPriceUsd: null,
    tokenId: 'celo-mainnet:0xfee2',
    symbol: 'FEE2',
    name: 'Fee token 2',
    networkId: NetworkId['celo-mainnet'],
    isNative: false, // means we add 50_000 units / 50.0 decimal padding for gas
    isFeeCurrency: true,
  }
  const mockFeeCurrencyWithAdapter: TokenBalanceWithAddress = {
    address: '0xfee3',
    balance: new BigNumber(50), // 50k units, 50.0 decimals
    decimals: 3,
    priceUsd: null,
    lastKnownPriceUsd: null,
    tokenId: 'celo-mainnet:0xfee3',
    symbol: 'FEE3',
    name: 'Fee token 3',
    networkId: NetworkId['celo-mainnet'],
    isNative: false, // means we add 50_000 units / 50.0 decimal padding for gas
    feeCurrencyAdapterAddress: '0xfee3adapter',
    feeCurrencyAdapterDecimals: 18,
  }

  const mockFeeCurrencies: TokenBalanceWithAddress[] = [mockNativeFeeCurrency, mockErc20FeeCurrency]
  const mockSpendToken: TokenBalanceWithAddress = {
    address: '0xspend',
    balance: new BigNumber(5), // 50k units, 5.0 decimals
    decimals: 4,
    priceUsd: null,
    lastKnownPriceUsd: null,
    networkId: NetworkId['celo-mainnet'],
    tokenId: 'celo-mainnet:0xspend',
    symbol: 'SPEND',
    name: 'Spend token',
  }
  const mockPublicClient = {} as unknown as jest.Mocked<(typeof publicClient)[Network.Celo]>
  describe('prepareTransactions function', () => {
    it.each([
      {
        description: 'is attached when data is provided',
        inputData: '0xdata' as Hex,
        expectedData: '0xdatadivviData',
      },
      {
        description: 'is not attached when data is undefined',
        inputData: undefined,
        expectedData: undefined,
      },
    ])('divvi data $description', async ({ inputData, expectedData }) => {
      jest.mocked(getAppConfig).mockReturnValueOnce({
        ...mockAppConfig,
        divviProtocol: {
          divviId: '0xdivviId',
        },
      })
      jest.mocked(getReferralTag).mockReturnValue('divviData')
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(1_000))

      // max gas fee is 100 * 1k = 100k units, too high for either fee currency

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockSpendToken,
        spendTokenAmount: new BigNumber(45_000),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: inputData,
          },
        ],
        isGasSubsidized: true,
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        feeCurrency: mockFeeCurrencies[0],
        transactions: [
          {
            from: '0xfrom',
            to: '0xto',
            data: expectedData,

            gas: BigInt(1000),
            maxFeePerGas: BigInt(100),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(50),
          },
        ],
      })
    })

    it('throws if trying to sendAmount > sendToken balance', async () => {
      await expect(() =>
        prepareTransactions({
          feeCurrencies: mockFeeCurrencies,
          spendToken: mockSpendToken,
          spendTokenAmount: new BigNumber(51_000),
          decreasedAmountGasFeeMultiplier: 1,
          baseTransactions: [
            {
              from: '0xfrom' as Address,
              to: '0xto' as Address,
              data: '0xdata',
            },
          ],
          origin: 'send',
        })
      ).rejects.toThrowError(/Cannot prepareTransactions for amount greater than balance./)
    })
    it('does not throw if trying to sendAmount > sendToken balance when throwOnSpendTokenAmountExceedsBalance is false', async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(1_000))

      await expect(
        prepareTransactions({
          feeCurrencies: mockFeeCurrencies,
          spendToken: mockSpendToken,
          spendTokenAmount: new BigNumber(51_000),
          decreasedAmountGasFeeMultiplier: 1,
          baseTransactions: [
            {
              from: '0xfrom' as Address,
              to: '0xto' as Address,
              data: '0xdata',
            },
          ],
          throwOnSpendTokenAmountExceedsBalance: false,
          origin: 'send',
        })
      ).resolves.toEqual(expect.anything())
    })
    it("returns a 'not-enough-balance-for-gas' result when the balances for feeCurrencies are too low to cover the fee", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(1_000))

      // max gas fee is 100 * 1k = 100k units, too high for either fee currency

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockSpendToken,
        spendTokenAmount: new BigNumber(45_000),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
        ],
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'not-enough-balance-for-gas',
        feeCurrencies: mockFeeCurrencies,
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        TransactionEvents.transaction_prepare_insufficient_gas,
        {
          origin: 'send',
          networkId: NetworkId['celo-mainnet'],
        }
      )
    })
    it("returns a 'possible' result when the balances for feeCurrencies are too low to cover the fee but isGasSubsidized is true", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(1_000))

      // max gas fee is 100 * 1k = 100k units, too high for either fee currency

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockSpendToken,
        spendTokenAmount: new BigNumber(45_000),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
        ],
        isGasSubsidized: true,
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        feeCurrency: mockFeeCurrencies[0],
        transactions: [
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(1000),
            maxFeePerGas: BigInt(100),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(50),
          },
        ],
      })
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'not-enough-balance-for-gas' result when gas estimation throws error due to insufficient funds", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockRejectedValue(mockInsufficientFundsError)

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockSpendToken,
        spendTokenAmount: new BigNumber(50_000),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
        ],
        origin: 'swap',
      })
      expect(result).toStrictEqual({
        type: 'not-enough-balance-for-gas',
        feeCurrencies: mockFeeCurrencies,
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        TransactionEvents.transaction_prepare_insufficient_gas,
        {
          origin: 'swap',
          networkId: NetworkId['celo-mainnet'],
        }
      )
    })
    it("returns a 'not-enough-balance-for-gas' result when gas estimation throws error due to value exceeded balance", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockRejectedValue(mockValueExceededBalanceError)

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockSpendToken,
        spendTokenAmount: new BigNumber(50_000),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
        ],
        origin: 'earn-deposit',
      })
      expect(result).toStrictEqual({
        type: 'not-enough-balance-for-gas',
        feeCurrencies: mockFeeCurrencies,
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        TransactionEvents.transaction_prepare_insufficient_gas,
        {
          origin: 'earn-deposit',
          networkId: NetworkId['celo-mainnet'],
        }
      )
    })
    it('throws if gas estimation throws error for some other reason besides insufficient funds', async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(100),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(50),
      })
      mocked(estimateGas).mockRejectedValue(mockExceededAllowanceError)

      await expect(() =>
        prepareTransactions({
          feeCurrencies: mockFeeCurrencies,
          spendToken: mockSpendToken,
          spendTokenAmount: new BigNumber(20),
          decreasedAmountGasFeeMultiplier: 1,
          baseTransactions: [
            {
              from: '0xfrom' as Address,
              to: '0xto' as Address,
              data: '0xdata',
            },
          ],
          origin: 'send',
        })
      ).rejects.toThrowError(EstimateGasExecutionError)
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'need-decrease-spend-amount-for-gas' result when spending the exact max amount of a feeCurrency, and no other feeCurrency has enough balance to pay for the fee", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockFeeCurrencies[1],
        spendTokenAmount: mockFeeCurrencies[1].balance.shiftedBy(mockFeeCurrencies[1].decimals),
        decreasedAmountGasFeeMultiplier: 1.01,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',

            gas: BigInt(15_000), // 50k will be added for fee currency 1 since it is non-native
          },
        ],
        origin: 'earn-withdraw',
      })
      expect(result).toStrictEqual({
        type: 'need-decrease-spend-amount-for-gas',
        maxGasFeeInDecimal: new BigNumber('65.65'), // (15k + 50k non-native gas token buffer) * 1.01 multiplier / 1000 feeCurrency1 decimals
        estimatedGasFeeInDecimal: new BigNumber('65'), // 15k + 50k non-native gas token buffer / 1000 feeCurrency1 decimals
        feeCurrency: mockFeeCurrencies[1],
        decreasedSpendAmount: new BigNumber(4.35), // 70.0 balance minus maxGasFee
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        TransactionEvents.transaction_prepare_insufficient_gas,
        {
          origin: 'earn-withdraw',
          networkId: NetworkId['celo-mainnet'],
        }
      )
    })
    it("returns a 'possible' result when spending the exact max amount of a feeCurrency, and no other feeCurrency has enough balance to pay for the fee and isGasSubsidized is true", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockFeeCurrencies[1],
        spendTokenAmount: mockFeeCurrencies[1].balance.shiftedBy(mockFeeCurrencies[1].decimals),
        decreasedAmountGasFeeMultiplier: 1.01,
        isGasSubsidized: true,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
            _estimatedGasUse: BigInt(50),
            gas: BigInt(15_000),
          },
        ],
        origin: 'wallet-connect',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        feeCurrency: mockFeeCurrencies[0],
        transactions: [
          {
            _baseFeePerGas: BigInt(1),
            _estimatedGasUse: BigInt(50),
            from: '0xfrom',
            gas: BigInt(15_000),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            to: '0xto',
            data: '0xdata',
          },
        ],
      })
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'need-decrease-spend-amount-for-gas' result when spending close to the max amount of a feeCurrency, and no other feeCurrency has enough balance to pay for the fee", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockFeeCurrencies[1],
        spendTokenAmount: mockFeeCurrencies[1].balance
          .shiftedBy(mockFeeCurrencies[1].decimals)
          .minus(1), // 69.999k
        decreasedAmountGasFeeMultiplier: 1.01,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',

            gas: BigInt(15_000), // 50k will be added for fee currency 1 since it is non-native
          },
        ],
        origin: 'wallet-connect',
      })
      expect(result).toStrictEqual({
        type: 'need-decrease-spend-amount-for-gas',
        maxGasFeeInDecimal: new BigNumber('65.65'), // (15k + 50k non-native gas token buffer) * 1.01 multiplier / 1000 feeCurrency1 decimals
        estimatedGasFeeInDecimal: new BigNumber('65'), // 15k + 50k non-native gas token buffer / 1000 feeCurrency1 decimals
        feeCurrency: mockFeeCurrencies[1],
        decreasedSpendAmount: new BigNumber(4.35), // 70.0 balance minus maxGasFee
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        TransactionEvents.transaction_prepare_insufficient_gas,
        {
          origin: 'wallet-connect',
          networkId: NetworkId['celo-mainnet'],
        }
      )
    })
    it("returns a 'possible' result when spending a feeCurrency, when there's enough balance to cover for the fee", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(500))

      // max gas fee is 0.5k units from first transaction, plus 0.1k units from second transaction

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockFeeCurrencies[0],
        spendTokenAmount: new BigNumber(4_000),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',

            gas: BigInt(100),
            _estimatedGasUse: BigInt(50),
          },
        ],
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        transactions: [
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(500),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(1),
          },
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(100),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(1),
            _estimatedGasUse: BigInt(50),
          },
        ],
        feeCurrency: mockFeeCurrencies[0],
      })
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'possible' result when spending the max balance of a feeCurrency when there's another feeCurrency to pay for the fee", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(500))

      // for fee1 (native): gas fee is 0.5k units from first transaction, plus 0.1k units from second transaction
      // for fee2 (non-native): gas fee is 0.5k units from first transaction, plus 50.1k ((50k * 1) + 0.1k) units from second transaction

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockFeeCurrencies[0],
        spendTokenAmount: mockFeeCurrencies[0].balance.shiftedBy(mockFeeCurrencies[0].decimals),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',

            gas: BigInt(100), // 50k will be added for fee currency 2 since it is non-native
            _estimatedGasUse: BigInt(50),
          },
        ],
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        transactions: [
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(500),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            feeCurrency: mockFeeCurrencies[1].address,
            _baseFeePerGas: BigInt(1),
          },
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(50_100),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            feeCurrency: mockFeeCurrencies[1].address,
            _baseFeePerGas: BigInt(1),
            _estimatedGasUse: BigInt(50_050),
          },
        ],
        feeCurrency: mockFeeCurrencies[1],
      })
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'possible' result when spending the max balance of a token that isn't a feeCurrency when there's another feeCurrency to pay for the fee", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(500))

      // for fee1 (native): gas fee is 0.5k units from first transaction, plus 0.1k units from second transaction

      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        spendToken: mockSpendToken,
        spendTokenAmount: mockSpendToken.balance.shiftedBy(mockSpendToken.decimals),
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',

            gas: BigInt(100), // 50k will be added for fee currency 2 since it is non-native
            _estimatedGasUse: BigInt(50),
          },
        ],
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        transactions: [
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(500),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(1),
          },
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(100),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(1),
            _estimatedGasUse: BigInt(50),
          },
        ],
        feeCurrency: mockFeeCurrencies[0],
      })
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'possible' result when no spendToken and spendAmount are provided but the user has some fee currency balance", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(500))
      // for fee1 (native): gas fee is 0.5k units from first transaction, plus 0.1k units from second transaction
      const result = await prepareTransactions({
        feeCurrencies: mockFeeCurrencies,
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
          },
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
            gas: BigInt(100), // 50k will be added for fee currency 2 since it is non-native
            _estimatedGasUse: BigInt(50),
          },
        ],
        origin: 'send',
      })
      expect(result).toStrictEqual({
        type: 'possible',
        transactions: [
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(500),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(1),
          },
          {
            from: '0xfrom',
            to: '0xto',
            data: '0xdata',

            gas: BigInt(100),
            maxFeePerGas: BigInt(1),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(1),
            _estimatedGasUse: BigInt(50),
          },
        ],
        feeCurrency: mockFeeCurrencies[0],
      })
      expect(AppAnalytics.track).not.toHaveBeenCalled()
    })
    it("returns a 'not-enough-balance-for-gas' result when no spendToken and spendAmount are provided, and the user has no fee currency balance", async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(1),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(1),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(500))
      const mockInsufficientFeeCurrencies = [
        {
          // native gas token, need 500 units for gas
          ...mockFeeCurrencies[0],
          balance: new BigNumber(4),
          decimals: 2,
        },
        {
          // non-native gas token, need 50.5k units for gas (500 units of gas + 50k inflation buffer)
          ...mockFeeCurrencies[1],
          balance: new BigNumber(50),
          decimals: 3,
        },
      ]

      const result = await prepareTransactions({
        feeCurrencies: mockInsufficientFeeCurrencies,
        decreasedAmountGasFeeMultiplier: 1,
        baseTransactions: [
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
            gas: BigInt(500),
          },
        ],
        origin: 'jumpstart-send',
      })
      expect(result).toStrictEqual({
        type: 'not-enough-balance-for-gas',
        feeCurrencies: mockInsufficientFeeCurrencies,
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        TransactionEvents.transaction_prepare_insufficient_gas,
        {
          origin: 'jumpstart-send',
          networkId: NetworkId['celo-mainnet'],
        }
      )
    })
    it('throws if spendAmount is provided and the spendToken is not', async () => {
      await expect(() =>
        prepareTransactions({
          feeCurrencies: mockFeeCurrencies,
          spendTokenAmount: new BigNumber(20),
          decreasedAmountGasFeeMultiplier: 1,
          baseTransactions: [
            {
              from: '0xfrom' as Address,
              to: '0xto' as Address,
              data: '0xdata',
            },
          ],
          origin: 'send',
        })
      ).rejects.toThrowError(
        'prepareTransactions requires a spendToken if spendTokenAmount is greater than 0'
      )
    })
  })
  describe('tryEstimateTransaction', () => {
    it('does not include feeCurrency if address is undefined', async () => {
      mocked(estimateGas).mockResolvedValue(BigInt(123))
      const baseTransaction: TransactionRequest = { from: '0x123' }
      const estimateTransactionOutput = await tryEstimateTransaction({
        client: mockPublicClient,
        baseTransaction,
        maxFeePerGas: BigInt(456),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(200),
        feeCurrencySymbol: 'FEE',
      })
      expect(estimateTransactionOutput && 'feeCurrency' in estimateTransactionOutput).toEqual(false)
      expect(estimateTransactionOutput).toStrictEqual({
        from: '0x123',
        gas: BigInt(123),
        maxFeePerGas: BigInt(456),
        maxPriorityFeePerGas: BigInt(2),
        _baseFeePerGas: BigInt(200),
      })
    })
    it('includes feeCurrency if address is given', async () => {
      mocked(estimateGas).mockResolvedValue(BigInt(123))
      const baseTransaction: TransactionRequest = { from: '0x123' }
      const estimateTransactionOutput = await tryEstimateTransaction({
        client: mockPublicClient,
        baseTransaction,
        maxFeePerGas: BigInt(456),
        feeCurrencySymbol: 'FEE',
        feeCurrencyAddress: '0xabc',
        maxPriorityFeePerGas: BigInt(789),
        baseFeePerGas: BigInt(200),
      })
      expect(estimateTransactionOutput).toStrictEqual({
        from: '0x123',
        gas: BigInt(123),
        maxFeePerGas: BigInt(456),
        feeCurrency: '0xabc',
        maxPriorityFeePerGas: BigInt(789),
        _baseFeePerGas: BigInt(200),
      })
    })
    it('returns null if estimateGas throws EstimateGasExecutionError with cause insufficient funds', async () => {
      mocked(estimateGas).mockRejectedValue(mockInsufficientFundsError)
      const baseTransaction: TransactionRequest = { from: '0x123' }
      const estimateTransactionOutput = await tryEstimateTransaction({
        client: mockPublicClient,
        baseTransaction,
        maxFeePerGas: BigInt(456),
        feeCurrencySymbol: 'FEE',
        feeCurrencyAddress: '0xabc',
        maxPriorityFeePerGas: BigInt(789),
        baseFeePerGas: BigInt(200),
      })
      expect(estimateTransactionOutput).toEqual(null)
    })
    it('returns null if estimateGas throws InvalidInputRpcError with gas required exceeds allowance', async () => {
      mocked(estimateGas).mockRejectedValue(mockInvalidInputRpcError)
      const baseTransaction: TransactionRequest = { from: '0x123' }
      const estimateTransactionOutput = await tryEstimateTransaction({
        client: mockPublicClient,
        baseTransaction,
        maxFeePerGas: BigInt(456),
        feeCurrencySymbol: 'FEE',
        feeCurrencyAddress: '0xabc',
        maxPriorityFeePerGas: BigInt(789),
        baseFeePerGas: BigInt(200),
      })
      expect(estimateTransactionOutput).toEqual(null)
    })
    it('throws if estimateGas throws error for some other reason besides insufficient funds', async () => {
      mocked(estimateGas).mockRejectedValue(mockExceededAllowanceError)
      const baseTransaction: TransactionRequest = { from: '0x123' }
      await expect(() =>
        tryEstimateTransaction({
          client: mockPublicClient,
          baseTransaction,
          maxFeePerGas: BigInt(456),
          feeCurrencySymbol: 'FEE',
          feeCurrencyAddress: '0xabc',
          maxPriorityFeePerGas: BigInt(789),
          baseFeePerGas: BigInt(200),
        })
      ).rejects.toThrowError(EstimateGasExecutionError)
    })
    it('returns null if estimateGas throws Error with name EstimateGasExecutionError but not instanceof EstimateGasExecutionError', async () => {
      // Create a custom error that has the name but is not an instance of EstimateGasExecutionError
      const customError = new Error('Custom error with EstimateGasExecutionError name')
      customError.name = 'EstimateGasExecutionError'
      customError.cause = new InsufficientFundsError({
        cause: new BaseError('insufficient funds'),
      })
      mocked(estimateGas).mockRejectedValue(customError)
      const baseTransaction: TransactionRequest = { from: '0x123' }
      const estimateTransactionOutput = await tryEstimateTransaction({
        client: mockPublicClient,
        baseTransaction,
        maxFeePerGas: BigInt(456),
        feeCurrencySymbol: 'FEE',
        feeCurrencyAddress: '0xabc',
        maxPriorityFeePerGas: BigInt(789),
        baseFeePerGas: BigInt(200),
      })
      expect(estimateTransactionOutput).toEqual(null)
    })
  })
  describe('tryEstimateTransactions', () => {
    it('returns null if estimateGas throws error due to insufficient funds', async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(10),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(5),
      })
      mocked(estimateGas).mockRejectedValue(mockInsufficientFundsError)
      const estimateTransactionsOutput = await tryEstimateTransactions(
        [{ from: '0x123' }, { from: '0x123', gas: BigInt(456) }],
        mockFeeCurrencies[0]
      )
      expect(estimateTransactionsOutput).toEqual(null)
    })
    it('estimates gas only for transactions missing a gas field', async () => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(10),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(5),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(123))
      const estimateTransactionsOutput = await tryEstimateTransactions(
        [{ from: '0x123' }, { from: '0x123', gas: BigInt(456) }],
        mockFeeCurrencies[0]
      )
      expect(estimateTransactionsOutput).toStrictEqual([
        {
          from: '0x123',
          gas: BigInt(123),
          maxFeePerGas: BigInt(10),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(5),
        },
        {
          from: '0x123',
          gas: BigInt(456),
          maxFeePerGas: BigInt(10),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(5),
          _estimatedGasUse: undefined,
        },
      ])
    })
    it.each([
      { client: 'app public', expectedClient: appPublicClient },
      { client: 'public', expectedClient: publicClient },
    ])('uses the $client client for estimating gas', async ({ client, expectedClient }) => {
      mocked(estimateFeesPerGas).mockResolvedValue({
        maxFeePerGas: BigInt(10),
        maxPriorityFeePerGas: BigInt(2),
        baseFeePerGas: BigInt(5),
      })
      mocked(estimateGas).mockResolvedValue(BigInt(123))
      await tryEstimateTransactions(
        [{ from: '0x123' }],
        { ...mockFeeCurrencies[0], networkId: NetworkId['arbitrum-sepolia'] },
        client === 'app public'
      )
      expect(estimateGas).toHaveBeenCalledWith(expectedClient[Network.Arbitrum], expect.anything())
    })
    it('throws if no app public client exists', async () => {
      await expect(
        tryEstimateTransactions(
          [{ from: '0x123' }],
          { ...mockFeeCurrencies[0], networkId: NetworkId['ethereum-sepolia'] },
          true
        )
      ).rejects.toThrowError('App transport not available for network ethereum')
    })
  })
  describe('getMaxGasFee', () => {
    it('adds gas times maxFeePerGas', () => {
      expect(
        getMaxGasFee([
          { gas: BigInt(2), maxFeePerGas: BigInt(3), from: '0x123' },
          { gas: BigInt(5), maxFeePerGas: BigInt(7), from: '0x123' },
        ])
      ).toEqual(new BigNumber(41))
    })
    it('throws if gas or maxFeePerGas are missing', () => {
      expect(() =>
        getMaxGasFee([
          { gas: BigInt(2), maxFeePerGas: BigInt(3), from: '0x123' },
          { gas: BigInt(5), from: '0x123' },
        ])
      ).toThrowError('Missing gas or maxFeePerGas')
      expect(() =>
        getMaxGasFee([
          { maxFeePerGas: BigInt(5), from: '0x123' },
          { gas: BigInt(2), maxFeePerGas: BigInt(3), from: '0x123' },
        ])
      ).toThrowError('Missing gas or maxFeePerGas')
    })
  })

  describe('getEstimatedGasFee', () => {
    it('calculates the estimates gas fee', () => {
      // Uses gas * _baseFeePerGas
      expect(
        getEstimatedGasFee([
          { gas: BigInt(2), maxFeePerGas: BigInt(3), _baseFeePerGas: BigInt(2), from: '0x123' },
          { gas: BigInt(5), maxFeePerGas: BigInt(7), _baseFeePerGas: BigInt(3), from: '0x123' },
        ])
      ).toEqual(new BigNumber(19))
      // Uses _estimatedGasUse * _baseFeePerGas
      expect(
        getEstimatedGasFee([
          {
            gas: BigInt(2),
            maxFeePerGas: BigInt(3),
            _baseFeePerGas: BigInt(2),
            _estimatedGasUse: BigInt(1),
            from: '0x123',
          },
          {
            gas: BigInt(5),
            maxFeePerGas: BigInt(7),
            _baseFeePerGas: BigInt(3),
            _estimatedGasUse: BigInt(2),
            from: '0x123',
          },
        ])
      ).toEqual(new BigNumber(8))
      // Uses _estimatedGasUse * (_baseFeePerGas + maxPriorityFeePerGas)
      expect(
        getEstimatedGasFee([
          {
            gas: BigInt(2),
            maxFeePerGas: BigInt(3),
            maxPriorityFeePerGas: BigInt(1),
            _baseFeePerGas: BigInt(2),
            _estimatedGasUse: BigInt(1),
            from: '0x123',
          },
          {
            gas: BigInt(5),
            maxFeePerGas: BigInt(7),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(3),
            _estimatedGasUse: BigInt(2),
            from: '0x123',
          },
        ])
      ).toEqual(new BigNumber(13))
      // Uses _estimatedGasUse * min(_baseFeePerGas + maxPriorityFeePerGas, maxFeePerGas)
      expect(
        getEstimatedGasFee([
          {
            gas: BigInt(2),
            maxFeePerGas: BigInt(3),
            maxPriorityFeePerGas: BigInt(2),
            _baseFeePerGas: BigInt(2),
            _estimatedGasUse: BigInt(1),
            from: '0x123',
          },
          {
            gas: BigInt(5),
            maxFeePerGas: BigInt(7),
            maxPriorityFeePerGas: BigInt(5),
            _baseFeePerGas: BigInt(3),
            _estimatedGasUse: BigInt(2),
            from: '0x123',
          },
        ])
      ).toEqual(new BigNumber(17))
    })
    it('throws if gas and _estimatedGasUse are missing', () => {
      expect(() =>
        getEstimatedGasFee([
          { gas: BigInt(2), maxFeePerGas: BigInt(3), _baseFeePerGas: BigInt(2), from: '0x123' },
          { maxFeePerGas: BigInt(3), _baseFeePerGas: BigInt(2), from: '0x123' },
        ])
      ).toThrowError('Missing _estimatedGasUse or gas')
    })
    it('throws if _baseFeePerGas or maxFeePerGas are missing', () => {
      expect(() =>
        getEstimatedGasFee([
          { gas: BigInt(2), maxFeePerGas: BigInt(3), _baseFeePerGas: BigInt(2), from: '0x123' },
          { gas: BigInt(5), maxFeePerGas: BigInt(7), from: '0x123' },
        ])
      ).toThrowError('Missing _baseFeePerGas or maxFeePerGas')
      expect(() =>
        getEstimatedGasFee([
          { gas: BigInt(2), maxFeePerGas: BigInt(3), _baseFeePerGas: BigInt(2), from: '0x123' },
          { gas: BigInt(5), _baseFeePerGas: BigInt(3), from: '0x123' },
        ])
      ).toThrowError('Missing _baseFeePerGas or maxFeePerGas')
    })
  })

  describe('getFeeCurrencyAddress', () => {
    it('returns undefined if fee currency is native', () => {
      expect(getFeeCurrencyAddress(mockNativeFeeCurrency)).toEqual(undefined)
    })
    it('returns fee currency address if fee currency is not native', () => {
      expect(getFeeCurrencyAddress(mockErc20FeeCurrency)).toEqual('0xfee2')
    })
    it('returns the fee currency adapter address when not native and not a direct fee currency', () => {
      expect(getFeeCurrencyAddress(mockFeeCurrencyWithAdapter)).toEqual('0xfee3adapter')
    })
    it('throws if the fee currency is not native and does not have an address', () => {
      expect(() => getFeeCurrencyAddress({ ...mockErc20FeeCurrency, address: null })).toThrowError(
        'Fee currency address is missing for fee currency celo-mainnet:0xfee2'
      )
    })
    it('throws if the fee currency is not native, does not have an address and not adapter address', () => {
      expect(() =>
        getFeeCurrencyAddress({
          ...mockFeeCurrencyWithAdapter,
          feeCurrencyAdapterAddress: undefined,
        })
      ).toThrowError(
        'Unable to determine fee currency address for fee currency celo-mainnet:0xfee3'
      )
    })
  })

  describe('isERC20Transfer', () => {
    it('returns true for valid ERC20 transfer data', () => {
      const transferData =
        '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f00000000000000000000000000000000000000000000000000000000000000064' as Hex
      expect(isERC20Transfer(transferData)).toBe(true)
    })

    it('returns false for non-ERC20 transfer data', () => {
      expect(isERC20Transfer('0x12345678' as Hex)).toBe(false)
    })

    it('returns false for undefined data', () => {
      expect(isERC20Transfer(undefined)).toBe(false)
    })

    it('returns false for empty data', () => {
      expect(isERC20Transfer('0x' as Hex)).toBe(false)
    })
  })

  describe('modifyERC20TransferAmount', () => {
    it('modifies the amount in valid ERC20 transfer data', () => {
      const originalData =
        '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f00000000000000000000000000000000000000000000000000000000000000064' as Hex
      const newAmount = new BigNumber(1000)
      const result = modifyERC20TransferAmount(originalData, newAmount)

      expect(result).toBe(
        '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f000000000000000000000000000000000000000000000000000000000000003e8'
      )
      expect(isERC20Transfer(result)).toBe(true)
    })

    it('pads the amount with leading zeros', () => {
      const originalData =
        '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f00000000000000000000000000000000000000000000000000000000000000064' as Hex
      const newAmount = new BigNumber(1)
      const result = modifyERC20TransferAmount(originalData, newAmount)

      // Amount should be padded to 64 hex characters (32 bytes)
      expect(result).toBe(
        '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f00000000000000000000000000000000000000000000000000000000000000001'
      )
    })

    it('throws if data is not an ERC20 transfer', () => {
      const invalidData = '0x12345678' as Hex
      const newAmount = new BigNumber(100)

      expect(() => modifyERC20TransferAmount(invalidData, newAmount)).toThrow(
        'Data is not an ERC20 transfer'
      )
    })

    it('throws if data length is invalid', () => {
      const invalidLengthData = '0xa9059cbb00000000' as Hex
      const newAmount = new BigNumber(100)

      expect(() => modifyERC20TransferAmount(invalidLengthData, newAmount)).toThrow(
        /Invalid ERC20 transfer data length/
      )
    })
  })

  describe('createReducedAmountTransactions', () => {
    it('reduces ERC20 transfer amount by 60%', () => {
      const originalAmount = new BigNumber(1000)
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xtoken' as Address,
          data:
            '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f000000000000000000000000000000000000000000000000000000000000003e8' as Hex,
        },
      ]

      const result = createReducedAmountTransactions(baseTransactions, originalAmount)

      expect(result).toHaveLength(1)
      expect(result[0].from).toBe('0xfrom')
      expect(result[0].to).toBe('0xtoken')
      // Should contain reduced amount (600 = 1000 * 0.6 = 0x258)
      expect(result[0].data).toBe(
        '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f00000000000000000000000000000000000000000000000000000000000000258'
      )
    })

    it('returns unchanged transaction for non-ERC20 transfers', () => {
      const originalAmount = new BigNumber(1000)
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          value: BigInt(1000),
        },
      ]

      const result = createReducedAmountTransactions(baseTransactions, originalAmount)

      expect(result).toEqual(baseTransactions)
    })

    it('handles multiple transactions', () => {
      const originalAmount = new BigNumber(1000)
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xtoken' as Address,
          data:
            '0xa9059cbb0000000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f000000000000000000000000000000000000000000000000000000000000003e8' as Hex,
        },
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          value: BigInt(500),
        },
      ]

      const result = createReducedAmountTransactions(baseTransactions, originalAmount)

      expect(result).toHaveLength(2)
      expect(isERC20Transfer(result[0].data)).toBe(true)
      expect(result[1].value).toBe(BigInt(500))
    })

    it('returns original transaction if modification fails', () => {
      const originalAmount = new BigNumber(1000)
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xtoken' as Address,
          data: '0xa9059cbb0000' as Hex, // Invalid length
        },
      ]

      const result = createReducedAmountTransactions(baseTransactions, originalAmount)

      // Should return the original transaction due to error handling
      expect(result[0].data).toBe('0xa9059cbb0000')
    })
  })

  describe('rebuildTransactionsWithOriginalAmounts', () => {
    it('preserves original transaction data while copying gas estimates', () => {
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          data: '0xoriginaldata' as Hex,
        },
      ]

      const estimatedTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          data: '0xmodifieddata' as Hex,
          gas: BigInt(21000),
          maxFeePerGas: BigInt(100),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(50),
          _estimatedGasUse: BigInt(18000),
        },
      ]

      const result = rebuildTransactionsWithOriginalAmounts(
        baseTransactions,
        estimatedTransactions
      )

      expect(result).toHaveLength(1)
      expect(result[0].data).toBe('0xoriginaldata') // Original data preserved
      expect(result[0].gas).toBe(BigInt(21000)) // Gas estimate copied
      expect(result[0].maxFeePerGas).toBe(BigInt(100))
      expect(result[0].maxPriorityFeePerGas).toBe(BigInt(2))
      expect(result[0]._baseFeePerGas).toBe(BigInt(50))
      expect(result[0]._estimatedGasUse).toBe(BigInt(18000))
    })

    it('includes feeCurrency when present in estimated transaction', () => {
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
        },
      ]

      const estimatedTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          gas: BigInt(21000),
          maxFeePerGas: BigInt(100),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(50),
          feeCurrency: '0xfee' as Address,
        },
      ]

      const result = rebuildTransactionsWithOriginalAmounts(
        baseTransactions,
        estimatedTransactions
      )

      expect(result[0]).toHaveProperty('feeCurrency', '0xfee')
    })

    it('uses gas as _estimatedGasUse if _estimatedGasUse is not present', () => {
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
        },
      ]

      const estimatedTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          gas: BigInt(21000),
          maxFeePerGas: BigInt(100),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(50),
        },
      ]

      const result = rebuildTransactionsWithOriginalAmounts(
        baseTransactions,
        estimatedTransactions
      )

      expect(result[0]._estimatedGasUse).toBe(BigInt(21000))
    })

    it('handles multiple transactions correctly', () => {
      const baseTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto1' as Address,
          data: '0xdata1' as Hex,
        },
        {
          from: '0xfrom' as Address,
          to: '0xto2' as Address,
          data: '0xdata2' as Hex,
        },
      ]

      const estimatedTransactions: TransactionRequest[] = [
        {
          from: '0xfrom' as Address,
          to: '0xto1' as Address,
          data: '0xmodified1' as Hex,
          gas: BigInt(50000),
          maxFeePerGas: BigInt(100),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(50),
        },
        {
          from: '0xfrom' as Address,
          to: '0xto2' as Address,
          data: '0xmodified2' as Hex,
          gas: BigInt(30000),
          maxFeePerGas: BigInt(100),
          maxPriorityFeePerGas: BigInt(2),
          _baseFeePerGas: BigInt(50),
        },
      ]

      const result = rebuildTransactionsWithOriginalAmounts(
        baseTransactions,
        estimatedTransactions
      )

      expect(result).toHaveLength(2)
      expect(result[0].data).toBe('0xdata1')
      expect(result[0].gas).toBe(BigInt(50000))
      expect(result[1].data).toBe('0xdata2')
      expect(result[1].gas).toBe(BigInt(30000))
    })
  })

  it('prepareERC20TransferTransaction', async () => {
    const mockPrepareTransactions = jest.fn()
    mocked(encodeFunctionData).mockReturnValue('0xabc')
    await prepareERC20TransferTransaction(
      {
        fromWalletAddress: '0x123',
        toWalletAddress: '0x456',
        sendToken: mockSpendToken,
        amount: BigInt(100),
        feeCurrencies: mockFeeCurrencies,
      },
      mockPrepareTransactions
    )
    expect(mockPrepareTransactions).toHaveBeenCalledWith({
      feeCurrencies: mockFeeCurrencies,
      spendToken: mockSpendToken,
      spendTokenAmount: new BigNumber(100),
      decreasedAmountGasFeeMultiplier: 1,
      baseTransactions: [
        {
          from: '0x123',
          to: mockSpendToken.address,
          data: '0xabc',
        },
      ],
      origin: 'send',
    })
    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: erc20Abi,
      functionName: 'transfer',
      args: ['0x456', BigInt(100)],
    })
  })

  it('prepareSendNativeAssetTransaction', async () => {
    const mockPrepareTransactions = jest.fn()
    await prepareSendNativeAssetTransaction(
      {
        fromWalletAddress: '0x123',
        toWalletAddress: '0x456',
        amount: BigInt(100),
        feeCurrencies: [mockEthTokenBalance],
        sendToken: mockEthTokenBalance,
      },
      mockPrepareTransactions
    )
    expect(mockPrepareTransactions).toHaveBeenCalledWith({
      feeCurrencies: [mockEthTokenBalance],
      spendToken: mockEthTokenBalance,
      spendTokenAmount: new BigNumber(100),
      decreasedAmountGasFeeMultiplier: 1,
      baseTransactions: [{ from: '0x123', to: '0x456', value: BigInt(100) }],
      origin: 'send',
    })
  })

  describe('getFeeCurrencyAndAmounts', () => {
    it('returns undefined fee currency and fee amounts if prepare transactions result is undefined', () => {
      expect(getFeeCurrencyAndAmounts(undefined)).toStrictEqual({
        feeCurrency: undefined,
        maxFeeAmount: undefined,
        estimatedFeeAmount: undefined,
      })
    })
    it("returns undefined fee currency and fee amounts if prepare transactions result is 'not-enough-balance-for-gas'", () => {
      expect(
        getFeeCurrencyAndAmounts({
          type: 'not-enough-balance-for-gas',
          feeCurrencies: [mockCeloTokenBalance],
        })
      ).toStrictEqual({
        feeCurrency: undefined,
        maxFeeAmount: undefined,
        estimatedFeeAmount: undefined,
      })
    })
    it("returns fee currency and amounts if prepare transactions result is 'possible'", () => {
      expect(
        getFeeCurrencyAndAmounts({
          type: 'possible',
          transactions: [
            {
              from: '0xfrom',
              to: '0xto',
              data: '0xdata',

              gas: BigInt(500),
              maxFeePerGas: BigInt(4),
              maxPriorityFeePerGas: BigInt(1),
              _baseFeePerGas: BigInt(1),
            },
            {
              from: '0xfrom',
              to: '0xto',
              data: '0xdata',

              gas: BigInt(100),
              maxFeePerGas: BigInt(4),
              maxPriorityFeePerGas: BigInt(1),
              _baseFeePerGas: BigInt(1),
            },
          ],
          feeCurrency: mockFeeCurrencies[0],
        })
      ).toStrictEqual({
        feeCurrency: mockFeeCurrencies[0],
        maxFeeAmount: new BigNumber(24),
        estimatedFeeAmount: new BigNumber(12),
      })
    })
    it("returns fee currency and amount if prepare transactions result is 'need-decrease-spend-amount-for-gas'", () => {
      expect(
        getFeeCurrencyAndAmounts({
          type: 'need-decrease-spend-amount-for-gas',
          feeCurrency: mockCeloTokenBalance,
          maxGasFeeInDecimal: new BigNumber(0.1),
          estimatedGasFeeInDecimal: new BigNumber(0.05),
          decreasedSpendAmount: new BigNumber(4),
        })
      ).toStrictEqual({
        feeCurrency: mockCeloTokenBalance,
        maxFeeAmount: new BigNumber(0.1),
        estimatedFeeAmount: new BigNumber(0.05),
      })
    })
  })

  describe(getFeeCurrency, () => {
    it('returns undefined if no transactions are provided', () => {
      const result = getFeeCurrency([])
      expect(result).toBeUndefined()
    })

    it('returns the fee currency if only one transaction is provided', () => {
      const result = getFeeCurrency({
        from: '0xfrom' as Address,
        to: '0xto' as Address,
        data: '0xdata',
        feeCurrency: '0xfee' as Address,
      })
      expect(result).toEqual('0xfee')
    })

    it('returns the fee currency if multiple transactions with the same fee currency are provided', () => {
      const result = getFeeCurrency([
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          data: '0xdata',
          feeCurrency: '0xfee1' as Address,
        },
        {
          from: '0xfrom' as Address,
          to: '0xto' as Address,
          data: '0xdata',
          feeCurrency: '0xfee1' as Address,
        },
      ])
      expect(result).toEqual('0xfee1')
    })

    it('throws an error if multiple transactions with different fee currencies are provided', () => {
      expect(() =>
        getFeeCurrency([
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
            feeCurrency: '0xfee1' as Address,
          },
          {
            from: '0xfrom' as Address,
            to: '0xto' as Address,
            data: '0xdata',
            feeCurrency: '0xfee2' as Address,
          },
        ])
      ).toThrowError('Unexpected usage of multiple fee currencies for prepared transactions')
    })
  })

  describe('getFeeCurrencyToken', () => {
    const basePreparedTransactions = {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
    }
    const networkId = NetworkId['celo-mainnet']
    const tokensById = {
      [mockNativeFeeCurrency.tokenId]: mockNativeFeeCurrency,
      [mockErc20FeeCurrency.tokenId]: mockErc20FeeCurrency,
      [mockFeeCurrencyWithAdapter.tokenId]: mockFeeCurrencyWithAdapter,
    }

    it('returns the native fee currency token when the fee currency field is undefined', () => {
      const feeCurrencyToken = getFeeCurrencyToken(
        [
          {
            ...basePreparedTransactions,
            feeCurrency: undefined,
          } as TransactionRequest,
        ],
        networkId,
        tokensById
      )
      expect(feeCurrencyToken).toBe(mockNativeFeeCurrency)
    })
    it('returns the ERC20 fee currency token by its address', () => {
      const feeCurrencyToken = getFeeCurrencyToken(
        [
          {
            ...basePreparedTransactions,
            feeCurrency: '0xfee2' as Address,
          } as TransactionRequest,
        ],
        networkId,
        tokensById
      )
      expect(feeCurrencyToken).toBe(mockErc20FeeCurrency)
    })
    it('returns the fee currency token by its fee currency adapter address', () => {
      const feeCurrencyToken = getFeeCurrencyToken(
        [
          {
            ...basePreparedTransactions,
            feeCurrency: '0xfee3adapter' as Address,
          } as TransactionRequest,
        ],
        networkId,
        tokensById
      )
      expect(feeCurrencyToken).toBe(mockFeeCurrencyWithAdapter)
    })
    it('returns undefined if the fee currency token is not found', () => {
      const feeCurrencyToken = getFeeCurrencyToken(
        [
          {
            ...basePreparedTransactions,
            feeCurrency: '0xfee4' as Address,
          } as TransactionRequest,
        ],
        networkId,
        tokensById
      )
      expect(feeCurrencyToken).toBeUndefined()
    })
  })

  describe('getFeeDecimals', () => {
    const basePreparedTransactions = {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
    } as TransactionRequest

    it('returns the native fee currency decimals when the tx fee currency is native', () => {
      const result = getFeeDecimals([basePreparedTransactions], mockNativeFeeCurrency)
      expect(result).toBe(2)
    })
    it('returns the ERC20 fee currency decimals when the tx fee currency is the ERC20 address', () => {
      const result = getFeeDecimals(
        [
          {
            ...basePreparedTransactions,
            feeCurrency: '0xfee2' as Address,
          } as TransactionRequest,
        ],
        mockErc20FeeCurrency
      )
      expect(result).toBe(3)
    })
    it('returns the fee currency adapter decimals when the tx fee currency is the fee currency adapter address', () => {
      const result = getFeeDecimals(
        [
          {
            ...basePreparedTransactions,
            feeCurrency: '0xfee3adapter' as Address,
          } as TransactionRequest,
        ],
        mockFeeCurrencyWithAdapter
      )
      expect(result).toBe(18)
    })
    it("throws an error if the passed fee currency doesn't match when the tx fee currency is native", () => {
      expect(() => getFeeDecimals([basePreparedTransactions], mockErc20FeeCurrency)).toThrowError(
        'Passed fee currency (celo-mainnet:0xfee2) must be native'
      )
    })
    it("throws an error if the passed fee currency doesn't match when the tx fee currency is ERC20", () => {
      expect(() =>
        getFeeDecimals(
          [
            {
              ...basePreparedTransactions,
              feeCurrency: '0xfee2' as Address,
            } as TransactionRequest,
          ],
          mockFeeCurrencyWithAdapter
        )
      ).toThrowError(
        'Passed fee currency (celo-mainnet:0xfee3) does not match the fee currency of the prepared transactions (0xfee2)'
      )
    })
    it("throws an error if the passed fee currency doesn't have a adapter decimals when the tx fee currency is a fee currency adapter address", () => {
      expect(() =>
        getFeeDecimals(
          [
            {
              ...basePreparedTransactions,
              feeCurrency: '0xfee3adapter' as Address,
            } as TransactionRequest,
          ],
          { ...mockFeeCurrencyWithAdapter, feeCurrencyAdapterDecimals: undefined }
        )
      ).toThrowError(
        "Passed fee currency (celo-mainnet:0xfee3) does not have 'feeCurrencyAdapterDecimals' set"
      )
    })
  })
})
