import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { DeviceEventEmitter } from 'react-native'
import { getNumberFormatSettings } from 'react-native-localize'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents, FeeEvents } from 'src/analytics/Events'
import EarnEnterAmount from 'src/earn/EarnEnterAmount'
import { usePrepareEnterAmountTransactionsCallback } from 'src/earn/hooks'
import { Status as EarnStatus } from 'src/earn/slice'
import { CICOFlow } from 'src/fiatExchanges/types'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import { SwapTransaction } from 'src/swap/types'
import { TokenBalance } from 'src/tokens/slice'
import { getSerializableTokenBalance } from 'src/tokens/utils'
import { NetworkId } from 'src/transactions/types'
import { getSerializablePreparedTransactionsPossible } from 'src/viem/preparedTransactionSerialization'
import {
  PreparedTransactionsNeedDecreaseSpendAmountForGas,
  PreparedTransactionsNotEnoughBalanceForGas,
  PreparedTransactionsPossible,
} from 'src/viem/prepareTransactions'
import networkConfig from 'src/web3/networkConfig'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore } from 'test/utils'
import {
  mockAaveArbUsdcTokenId,
  mockAccount,
  mockArbArbTokenId,
  mockArbEthTokenId,
  mockArbUsdcTokenId,
  mockCeloAddress,
  mockCeloTokenId,
  mockCusdTokenId,
  mockEarnPositions,
  mockPositions,
  mockRewardsPositions,
  mockTokenBalances,
  mockUSDCAddress,
  mockUSDCTokenId,
} from 'test/values'

jest.mock('react-native-localize')
jest.mock('src/statsig') // for cross chain swap and indirect use in hooksApiSelector
jest.mock('src/earn/hooks', () => ({
  ...jest.requireActual('src/earn/hooks'),
  usePrepareEnterAmountTransactionsCallback: jest.fn(),
}))

const mockPreparedTransaction: PreparedTransactionsPossible = {
  type: 'possible' as const,
  transactions: [
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(5e12),
      _baseFeePerGas: BigInt(1),
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
    },
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(1e12),
      _baseFeePerGas: BigInt(1),
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
    },
  ],
  feeCurrency: {
    ...mockTokenBalances[mockArbEthTokenId],
    isNative: true,
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
}

const mockPreparedTransactionNotEnough: PreparedTransactionsNotEnoughBalanceForGas = {
  type: 'not-enough-balance-for-gas' as const,
  feeCurrencies: [
    {
      ...mockTokenBalances[mockArbEthTokenId],
      isNative: true,
      balance: new BigNumber(0),
      priceUsd: new BigNumber(1500),
      lastKnownPriceUsd: new BigNumber(1500),
    },
  ],
}

const mockPreparedTransactionDecreaseSpend: PreparedTransactionsNeedDecreaseSpendAmountForGas = {
  type: 'need-decrease-spend-amount-for-gas' as const,
  feeCurrency: {
    ...mockTokenBalances[mockArbEthTokenId],
    isNative: true,
    balance: new BigNumber(0),
    priceUsd: new BigNumber(1500),
    lastKnownPriceUsd: new BigNumber(1500),
  },
  maxGasFeeInDecimal: new BigNumber(1),
  estimatedGasFeeInDecimal: new BigNumber(1),
  decreasedSpendAmount: new BigNumber(1),
}

const mockArbFeeCurrencies: TokenBalance[] = [
  {
    ...mockTokenBalances[mockArbEthTokenId],
    isNative: true,
    balance: new BigNumber(1),
    priceUsd: new BigNumber(1500),
    lastKnownPriceUsd: new BigNumber(1500),
  },
]

const mockCeloFeeCurrencies: TokenBalance[] = [
  {
    ...mockTokenBalances[mockCeloTokenId],
    isNative: true,
    balance: new BigNumber(5),
    priceUsd: new BigNumber(mockTokenBalances[mockCeloTokenId].priceUsd!),
    lastKnownPriceUsd: new BigNumber(mockTokenBalances[mockCeloTokenId].priceUsd!),
  },
  {
    ...mockTokenBalances[mockCusdTokenId],
    balance: new BigNumber(5),
    priceUsd: new BigNumber(mockTokenBalances[mockCusdTokenId].priceUsd!),
    lastKnownPriceUsd: new BigNumber(mockTokenBalances[mockCusdTokenId].priceUsd!),
  },
]

const mockSwapTransaction: SwapTransaction = {
  swapType: 'same-chain',
  chainId: 42161,
  price: '2439',
  guaranteedPrice: '2377',
  appFeePercentageIncludedInPrice: '0.6',
  sellTokenAddress: '0xEeeeeeE',
  buyTokenAddress: mockUSDCAddress,
  sellAmount: '410000000000000',
  buyAmount: '1000000',
  allowanceTarget: '0x0000000000000000000000000000000000000123',
  from: mockAccount,
  to: '0x0000000000000000000000000000000000000123',
  value: '0',
  data: '0x0',
  gas: '1800000',
  estimatedGasUse: undefined,
  estimatedPriceImpact: '0.1',
}

const mockCrossChainSwapTransaction: SwapTransaction = {
  ...mockSwapTransaction,
  swapType: 'cross-chain',
  estimatedDuration: 300,
  maxCrossChainFee: '1000000000000000',
  estimatedCrossChainFee: '500000000000000',
  sellTokenAddress: mockCeloAddress,
  price: '4',
  guaranteedPrice: '4',
}

function createStore(depositStatus: EarnStatus = 'idle') {
  return createMockStore({
    tokens: {
      tokenBalances: {
        ...mockTokenBalances,
        mockArbUsdcTokenId: {
          ...mockTokenBalances[mockArbUsdcTokenId],
          balance: '10',
        },
        mockArbEthTokenId: {
          ...mockTokenBalances[mockArbEthTokenId],
          balance: '1',
        },
        mockArbArbTokenId: {
          ...mockTokenBalances[mockArbArbTokenId],
          minimumAppVersionToSwap: '1.0.0',
          balance: '1',
        },
        mockAaveArbUsdcTokenId: {
          ...mockTokenBalances[mockAaveArbUsdcTokenId],
          balance: '10',
        },
        mockCeloTokenId: {
          ...mockTokenBalances[mockCeloTokenId],
          balance: '5',
        },
        mockCusdTokenId: {
          ...mockTokenBalances[mockCusdTokenId],
          balance: '5',
        },
        mockUSDCTokenId: {
          ...mockTokenBalances[mockUSDCTokenId],
          balance: '5',
        },
      },
    },
    positions: {
      positions: [...mockPositions, ...mockRewardsPositions],
    },
    earn: {
      depositStatus,
    },
  })
}

const store = createStore()

const params = {
  pool: mockEarnPositions[0],
}

const mockPoolWithHighPricePerShare = {
  ...mockEarnPositions[0],
  pricePerShare: ['2'],
  balance: '10',
}

describe('EarnEnterAmount', () => {
  const refreshPreparedTransactionsSpy = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(getFeatureGate)
      .mockImplementation(
        (featureGateName) => featureGateName === StatsigFeatureGates.SHOW_POSITIONS
      )
    jest
      .mocked(getNumberFormatSettings)
      .mockReturnValue({ decimalSeparator: '.', groupingSeparator: ',' })
    store.clearActions()
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: undefined,
      refreshPreparedTransactions: refreshPreparedTransactionsSpy,
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })
  })

  describe('deposit', () => {
    const depositParams = { ...params, mode: 'deposit' }
    it('should show only the deposit token and not include the token dropdown', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={depositParams} />
        </Provider>
      )

      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeTruthy()
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toHaveTextContent('USDC')
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeDisabled()
      expect(queryByTestId('downArrowIcon')).toBeFalsy()
    })

    it('should apply the maximum amount if the user selects the max option', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={depositParams} />
        </Provider>
      )
      await act(() => {
        DeviceEventEmitter.emit('keyboardDidShow', { endCoordinates: { height: 100 } })
      })

      fireEvent.press(within(getByTestId('EarnEnterAmount/AmountOptions')).getByText('maxSymbol'))
      expect(getByTestId('EarnEnterAmount/TokenAmountInput').props.value).toBe('10') // balance
    })

    it('should prepare transactions with the expected inputs', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={depositParams} />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '.25')

      await waitFor(() => expect(refreshPreparedTransactionsSpy).toHaveBeenCalledTimes(1))
      expect(refreshPreparedTransactionsSpy).toHaveBeenCalledWith({
        amount: '0.25',
        token: {
          ...mockTokenBalances[mockArbUsdcTokenId],
          priceUsd: new BigNumber(1),
          lastKnownPriceUsd: new BigNumber(1),
          balance: new BigNumber(10),
        },
        walletAddress: mockAccount.toLowerCase(),
        pool: mockEarnPositions[0],
        hooksApiUrl: networkConfig.hooksApiUrl,
        feeCurrencies: mockArbFeeCurrencies,
        shortcutId: 'deposit',
        useMax: false,
      })
    })

    it('should show tx details and handle navigating to the deposit confirmation screen', async () => {
      jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
        prepareTransactionsResult: {
          prepareTransactionsResult: mockPreparedTransaction,
          swapTransaction: undefined,
        },
        refreshPreparedTransactions: jest.fn(),
        clearPreparedTransactions: jest.fn(),
        prepareTransactionError: undefined,
        isPreparingTransactions: false,
      })
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={depositParams} />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '8')

      await waitFor(() => expect(getByText('earnFlow.enterAmount.continue')).not.toBeDisabled())

      expect(getByTestId('EnterAmountDepositDetails/Deposit/Label')).toHaveTextContent('deposit')
      expect(getByTestId('EnterAmountDepositDetails/Deposit/Value')).toHaveTextContent(
        'tokenAndLocalAmount, {"tokenAmount":"8.00","localAmount":"10.64","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
      )

      expect(getByTestId('EnterAmountDepositDetails/Fee/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountDepositDetails/Fee/Label')).toHaveTextContent('networkFee')
      expect(getByTestId('EnterAmountDepositDetails/Fee/Value')).toHaveTextContent(
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
      )

      fireEvent.press(getByText('earnFlow.enterAmount.continue'))

      await waitFor(() => expect(AppAnalytics.track).toHaveBeenCalledTimes(1))
      expect(AppAnalytics.track).toHaveBeenCalledWith(EarnEvents.earn_enter_amount_continue_press, {
        amountEnteredIn: 'token',
        amountInUsd: '8.00',
        networkId: NetworkId['arbitrum-sepolia'],
        depositTokenId: mockArbUsdcTokenId,
        providerId: mockEarnPositions[0].appId,
        poolId: mockEarnPositions[0].positionId,
        fromTokenId: mockArbUsdcTokenId,
        fromTokenAmount: '8',
        fromNetworkId: NetworkId['arbitrum-sepolia'],
        depositTokenAmount: '8',
        mode: 'deposit',
      })
      expect(navigate).toHaveBeenCalledWith(Screens.EarnDepositConfirmationScreen, {
        ...depositParams,
        swapTransaction: undefined,
        inputTokenAmount: '8',
        preparedTransaction: getSerializablePreparedTransactionsPossible(mockPreparedTransaction),
        inputTokenInfo: getSerializableTokenBalance({
          ...mockTokenBalances[mockArbUsdcTokenId],
          priceUsd: new BigNumber(1),
          lastKnownPriceUsd: new BigNumber(1),
          balance: new BigNumber(10),
        }),
      })
    })
  })

  describe('swap-deposit', () => {
    const swapDepositParams = { ...params, mode: 'swap-deposit' }
    it('should show the token dropdown and allow the user to select a token only from same chain if feature gate is off', async () => {
      const { getByTestId, getAllByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeTruthy()
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toHaveTextContent('ETH')
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeEnabled()
      expect(getByTestId('downArrowIcon')).toBeTruthy()
      expect(getAllByTestId('TokenBalanceItem')).toHaveLength(2)
      expect(getAllByTestId('TokenBalanceItem')[0]).toHaveTextContent('ETH')
      expect(getAllByTestId('TokenBalanceItem')[0]).toHaveTextContent('Arbitrum Sepolia')
      expect(getAllByTestId('TokenBalanceItem')[1]).toHaveTextContent('ARB')
      expect(getAllByTestId('TokenBalanceItem')[1]).toHaveTextContent('Arbitrum Sepolia')
      expect(getByTestId('TokenBottomSheet')).not.toHaveTextContent('USDC')
    })

    it('should show the token dropdown and allow the user to select a token from all chains if feature gate is on', async () => {
      jest
        .mocked(getFeatureGate)
        .mockImplementation(
          (featureGateName) =>
            featureGateName === StatsigFeatureGates.ALLOW_CROSS_CHAIN_SWAP_AND_DEPOSIT ||
            featureGateName === StatsigFeatureGates.SHOW_POSITIONS
        )
      const { getByTestId, getAllByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeTruthy()
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toHaveTextContent('ETH')
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeEnabled()
      expect(getByTestId('downArrowIcon')).toBeTruthy()
      expect(getAllByTestId('TokenBalanceItem')).toHaveLength(6)
      expect(getAllByTestId('TokenBalanceItem')[0]).toHaveTextContent('ETH')
      expect(getAllByTestId('TokenBalanceItem')[0]).toHaveTextContent('Arbitrum Sepolia')
      expect(getAllByTestId('TokenBalanceItem')[1]).toHaveTextContent('ARB')
      expect(getAllByTestId('TokenBalanceItem')[1]).toHaveTextContent('Arbitrum Sepolia')
      expect(getAllByTestId('TokenBalanceItem')[2]).toHaveTextContent('CELO')
      expect(getAllByTestId('TokenBalanceItem')[2]).toHaveTextContent('Celo Alfajores')
      expect(getAllByTestId('TokenBalanceItem')[3]).toHaveTextContent('cUSD')
      expect(getAllByTestId('TokenBalanceItem')[3]).toHaveTextContent('Celo Alfajores')
      expect(getAllByTestId('TokenBalanceItem')[4]).toHaveTextContent('USDC')
      expect(getAllByTestId('TokenBalanceItem')[4]).toHaveTextContent('Ethereum Sepolia')
      expect(getAllByTestId('TokenBalanceItem')[5]).toHaveTextContent('POOF')
      expect(getAllByTestId('TokenBalanceItem')[5]).toHaveTextContent('Celo Alfajores')
    })

    it('should default to the swappable token if only one is eligible and not show dropdown', async () => {
      const store = createMockStore({
        tokens: {
          tokenBalances: {
            ...mockTokenBalances,
            [mockArbUsdcTokenId]: {
              ...mockTokenBalances[mockArbUsdcTokenId],
              balance: '10',
            },
            mockArbEthTokenId: {
              ...mockTokenBalances[mockArbEthTokenId],
              minimumAppVersionToSwap: '1.0.0',
              balance: '0', // not eligible for swap
            },
            mockArbArbTokenId: {
              ...mockTokenBalances[mockArbArbTokenId],
              balance: '1', // eligible for swap
            },
          },
        },
      })

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeTruthy()
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toHaveTextContent('ARB')
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeDisabled()
      expect(queryByTestId('downArrowIcon')).toBeFalsy()
    })

    it('should prepare transactions with the expected inputs for same-chain swap', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '.25')

      await waitFor(() => expect(refreshPreparedTransactionsSpy).toHaveBeenCalledTimes(1))
      expect(refreshPreparedTransactionsSpy).toHaveBeenCalledWith({
        amount: '0.25',
        token: {
          ...mockTokenBalances[mockArbEthTokenId],
          priceUsd: new BigNumber(1500),
          lastKnownPriceUsd: new BigNumber(1500),
          balance: new BigNumber(1),
        },
        walletAddress: mockAccount.toLowerCase(),
        pool: mockEarnPositions[0],
        hooksApiUrl: networkConfig.hooksApiUrl,
        feeCurrencies: mockArbFeeCurrencies,
        shortcutId: 'swap-deposit',
        useMax: false,
      })
    })

    it('should prepare transactions with the expected inputs for cross-chain swap', async () => {
      jest
        .mocked(getFeatureGate)
        .mockImplementation(
          (featureGateName) =>
            featureGateName === StatsigFeatureGates.ALLOW_CROSS_CHAIN_SWAP_AND_DEPOSIT ||
            featureGateName === StatsigFeatureGates.SHOW_POSITIONS
        )
      const { getByTestId, getAllByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      fireEvent.press(getAllByTestId('TokenBalanceItem')[2]) // select celo for cross chain swap
      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '.25')

      await waitFor(() => expect(refreshPreparedTransactionsSpy).toHaveBeenCalledTimes(1))
      expect(refreshPreparedTransactionsSpy).toHaveBeenCalledWith({
        amount: '0.25',
        token: {
          ...mockTokenBalances[mockCeloTokenId],
          priceUsd: new BigNumber(mockTokenBalances[mockCeloTokenId].priceUsd!),
          lastKnownPriceUsd: new BigNumber(mockTokenBalances[mockCeloTokenId].priceUsd!),
          balance: new BigNumber(5),
        },
        walletAddress: mockAccount.toLowerCase(),
        pool: mockEarnPositions[0],
        hooksApiUrl: networkConfig.hooksApiUrl,
        feeCurrencies: expect.arrayContaining(mockCeloFeeCurrencies),
        shortcutId: 'swap-deposit',
        useMax: false,
      })
    })

    it('should show tx details and handle navigating to the deposit confirmation screen for same-chain swap', async () => {
      jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
        prepareTransactionsResult: {
          prepareTransactionsResult: mockPreparedTransaction,
          swapTransaction: mockSwapTransaction,
        },
        refreshPreparedTransactions: jest.fn(),
        clearPreparedTransactions: jest.fn(),
        prepareTransactionError: undefined,
        isPreparingTransactions: false,
      })
      const { getByTestId, getByText, queryByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '0.00041')

      await waitFor(() => expect(getByText('earnFlow.enterAmount.continue')).not.toBeDisabled())

      expect(getByTestId('EnterAmountDepositDetails/Swap/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountDepositDetails/Swap/Label')).toHaveTextContent(
        'earnFlow.enterAmount.swap'
      )
      expect(getByTestId('EnterAmountDepositDetails/Swap/From')).toHaveTextContent(
        'tokenAmount, {"tokenAmount":"0.00041","tokenSymbol":"ETH"}'
      )
      expect(getByTestId('EnterAmountDepositDetails/Swap/To')).toHaveTextContent(
        'tokenAmount, {"tokenAmount":"1.00","tokenSymbol":"USDC"}'
      )

      expect(getByTestId('EnterAmountDepositDetails/Deposit/Label')).toHaveTextContent('deposit')
      expect(getByTestId('EnterAmountDepositDetails/Deposit/Value')).toHaveTextContent(
        'tokenAndLocalAmount, {"tokenAmount":"1.00","localAmount":"1.33","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
      )

      expect(getByTestId('EnterAmountDepositDetails/Fee/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountDepositDetails/Fee/Label')).toHaveTextContent('fees')
      expect(getByTestId('EnterAmountDepositDetails/Fee/Value')).toHaveTextContent(
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
      )

      expect(queryByTestId('EnterAmountDepositDetails/EstimatedDuration')).toBeFalsy()

      fireEvent.press(getByText('earnFlow.enterAmount.continue'))

      await waitFor(() => expect(AppAnalytics.track).toHaveBeenCalledTimes(1))
      expect(AppAnalytics.track).toHaveBeenCalledWith(EarnEvents.earn_enter_amount_continue_press, {
        amountEnteredIn: 'token',
        amountInUsd: '0.62',
        networkId: NetworkId['arbitrum-sepolia'],
        fromTokenAmount: '0.00041',
        depositTokenId: mockArbUsdcTokenId,
        providerId: mockEarnPositions[0].appId,
        poolId: mockEarnPositions[0].positionId,
        fromTokenId: mockArbEthTokenId,
        fromNetworkId: NetworkId['arbitrum-sepolia'],
        depositTokenAmount: '0.99999',
        mode: 'swap-deposit',
        swapType: 'same-chain',
      })
      expect(navigate).toHaveBeenCalledWith(Screens.EarnDepositConfirmationScreen, {
        ...swapDepositParams,
        swapTransaction: mockSwapTransaction,
        inputTokenAmount: '0.00041',
        preparedTransaction: getSerializablePreparedTransactionsPossible(mockPreparedTransaction),
        inputTokenInfo: getSerializableTokenBalance({
          ...mockTokenBalances[mockArbEthTokenId],
          priceUsd: new BigNumber(1500),
          lastKnownPriceUsd: new BigNumber(1500),
          balance: new BigNumber(1),
        }),
      })
    })

    it('should show tx details and handle navigating to the deposit confirmation screen for cross-chain swap', async () => {
      jest
        .mocked(getFeatureGate)
        .mockImplementation(
          (featureGateName) =>
            featureGateName === StatsigFeatureGates.ALLOW_CROSS_CHAIN_SWAP_AND_DEPOSIT ||
            featureGateName === StatsigFeatureGates.SHOW_POSITIONS
        )
      jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
        prepareTransactionsResult: {
          prepareTransactionsResult: mockPreparedTransaction,
          swapTransaction: mockCrossChainSwapTransaction,
        },
        refreshPreparedTransactions: jest.fn(),
        clearPreparedTransactions: jest.fn(),
        prepareTransactionError: undefined,
        isPreparingTransactions: false,
      })
      const { getByTestId, getByText, getAllByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={swapDepositParams} />
        </Provider>
      )

      fireEvent.press(getAllByTestId('TokenBalanceItem')[2]) // select celo for cross chain swap
      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '0.25')

      await waitFor(() => expect(getByText('earnFlow.enterAmount.continue')).not.toBeDisabled())

      expect(getByTestId('EnterAmountDepositDetails/Swap/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountDepositDetails/Swap/Label')).toHaveTextContent(
        'earnFlow.enterAmount.swap'
      )
      expect(getByTestId('EnterAmountDepositDetails/Swap/From')).toHaveTextContent(
        'tokenAmount, {"tokenAmount":"0.25","tokenSymbol":"CELO"}'
      )
      expect(getByTestId('EnterAmountDepositDetails/Swap/To')).toHaveTextContent(
        'tokenAmount, {"tokenAmount":"1.00","tokenSymbol":"USDC"}'
      )

      expect(getByTestId('EnterAmountDepositDetails/Deposit/Label')).toHaveTextContent('deposit')
      expect(getByTestId('EnterAmountDepositDetails/Deposit/Value')).toHaveTextContent(
        'tokenAndLocalAmount, {"tokenAmount":"1.00","localAmount":"1.33","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
      )

      expect(getByTestId('EnterAmountDepositDetails/Fee/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountDepositDetails/Fee/Label')).toHaveTextContent('fees')
      expect(getByTestId('EnterAmountDepositDetails/Fee/Value')).toHaveTextContent(
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
      )

      expect(getByTestId('EnterAmountDepositDetails/EstimatedDuration/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountDepositDetails/EstimatedDuration/Label')).toHaveTextContent(
        'earnFlow.enterAmount.estimatedDuration'
      )
      expect(getByTestId('EnterAmountDepositDetails/EstimatedDuration/Value')).toHaveTextContent(
        'swapScreen.transactionDetails.estimatedTransactionTimeInMinutes, {"minutes":5}'
      )

      fireEvent.press(getByText('earnFlow.enterAmount.continue'))

      await waitFor(() => expect(AppAnalytics.track).toHaveBeenCalledTimes(2)) // one for token selection, one for continue press

      expect(AppAnalytics.track).toHaveBeenCalledWith(EarnEvents.earn_enter_amount_continue_press, {
        amountEnteredIn: 'token',
        amountInUsd: '3.31',
        networkId: NetworkId['arbitrum-sepolia'],
        fromTokenAmount: '0.25',
        depositTokenId: mockArbUsdcTokenId,
        providerId: mockEarnPositions[0].appId,
        poolId: mockEarnPositions[0].positionId,
        fromTokenId: mockCeloTokenId,
        fromNetworkId: NetworkId['celo-alfajores'],
        depositTokenAmount: '1',
        mode: 'swap-deposit',
        swapType: 'cross-chain',
      })
      expect(navigate).toHaveBeenCalledWith(Screens.EarnDepositConfirmationScreen, {
        ...swapDepositParams,
        swapTransaction: mockCrossChainSwapTransaction,
        inputTokenAmount: '0.25',
        preparedTransaction: getSerializablePreparedTransactionsPossible(mockPreparedTransaction),
        inputTokenInfo: getSerializableTokenBalance(mockCeloFeeCurrencies[0]),
      })
    })
  })

  describe('withdraw', () => {
    const withdrawParams = { ...params, mode: 'withdraw' }
    it('should show the deposit token and a disabled token dropdown', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={withdrawParams} />
        </Provider>
      )

      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeTruthy()
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toHaveTextContent('USDC')
      expect(getByTestId('EarnEnterAmount/TokenSelect')).toBeDisabled()
      expect(queryByTestId('downArrowIcon')).toBeFalsy()
    })

    it('should apply the maximum amount if the user selects the max option', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={withdrawParams} />
        </Provider>
      )
      await act(() => {
        DeviceEventEmitter.emit('keyboardDidShow', { endCoordinates: { height: 100 } })
      })

      fireEvent.press(within(getByTestId('EarnEnterAmount/AmountOptions')).getByText('maxSymbol'))
      expect(getByTestId('EarnEnterAmount/TokenAmountInput').props.value).toBe('11') // balance * pool price per share
    })

    it('should prepare transactions with the expected inputs', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator
            component={EarnEnterAmount}
            params={{ pool: mockPoolWithHighPricePerShare, mode: 'withdraw' }}
          />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '.25')

      await waitFor(() => expect(refreshPreparedTransactionsSpy).toHaveBeenCalledTimes(1))
      expect(refreshPreparedTransactionsSpy).toHaveBeenCalledWith({
        amount: '0.125',
        token: {
          ...mockTokenBalances[mockAaveArbUsdcTokenId],
          priceUsd: new BigNumber(1),
          lastKnownPriceUsd: new BigNumber(1),
          balance: new BigNumber(10),
        },
        walletAddress: mockAccount.toLowerCase(),
        pool: mockPoolWithHighPricePerShare,
        hooksApiUrl: networkConfig.hooksApiUrl,
        feeCurrencies: mockArbFeeCurrencies,
        shortcutId: 'withdraw',
        useMax: false,
      })
    })

    it('should show tx details for withdrawal', async () => {
      jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
        prepareTransactionsResult: {
          prepareTransactionsResult: mockPreparedTransaction,
          swapTransaction: undefined,
        },
        refreshPreparedTransactions: jest.fn(),
        clearPreparedTransactions: jest.fn(),
        prepareTransactionError: undefined,
        isPreparingTransactions: false,
      })

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnEnterAmount} params={withdrawParams} />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '8')

      await waitFor(() => expect(getByText('earnFlow.enterAmount.continue')).not.toBeDisabled())

      expect(getByTestId('FeeInfoBottomSheet')).toBeTruthy()
      expect(getByTestId('EnterAmountWithdrawDetails/NetworkFee/InfoIcon')).toBeTruthy()
      expect(getByTestId('EnterAmountWithdrawDetails/NetworkFee/Label')).toHaveTextContent(
        'networkFee'
      )
      expect(getByTestId('EnterAmountWithdrawDetails/NetworkFee/Value')).toHaveTextContent(
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
      )

      fireEvent.press(getByText('earnFlow.enterAmount.continue'))

      await waitFor(() => expect(AppAnalytics.track).toHaveBeenCalledTimes(1))
      expect(AppAnalytics.track).toHaveBeenCalledWith(EarnEvents.earn_enter_amount_continue_press, {
        amountEnteredIn: 'token',
        amountInUsd: '8.00',
        networkId: NetworkId['arbitrum-sepolia'],
        depositTokenId: mockArbUsdcTokenId,
        providerId: mockEarnPositions[0].appId,
        poolId: mockEarnPositions[0].positionId,
        fromTokenId: 'arbitrum-sepolia:0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
        fromTokenAmount: '8',
        fromNetworkId: NetworkId['arbitrum-sepolia'],
        mode: 'withdraw',
      })

      expect(navigate).toHaveBeenCalledWith(Screens.EarnWithdrawConfirmationScreen, {
        pool: mockEarnPositions[0],
        mode: 'withdraw',
        inputTokenAmount: '8',
        useMax: false,
      })
    })

    it('should allow the user to set an input value over the pool balance if pricePerShare is greater than 1', async () => {
      jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
        prepareTransactionsResult: {
          prepareTransactionsResult: mockPreparedTransaction,
          swapTransaction: undefined,
        },
        refreshPreparedTransactions: jest.fn(),
        clearPreparedTransactions: jest.fn(),
        prepareTransactionError: undefined,
        isPreparingTransactions: false,
      })

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <MockedNavigator
            component={EarnEnterAmount}
            params={{ pool: mockPoolWithHighPricePerShare, mode: 'withdraw' }}
          />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '15')
      expect(queryByTestId('EarnEnterAmount/NotEnoughBalanceWarning')).toBeFalsy()
      expect(getByTestId('EarnEnterAmount/Continue')).toBeEnabled()
    })

    it('should not allow the user to set an input amount higher than pool balance * pricePerShare', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator
            component={EarnEnterAmount}
            params={{ pool: mockPoolWithHighPricePerShare, mode: 'withdraw' }}
          />
        </Provider>
      )

      fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '20.001')
      expect(getByTestId('EarnEnterAmount/NotEnoughBalanceWarning')).toBeTruthy()
      expect(getByTestId('EarnEnterAmount/Continue')).toBeDisabled()
    })

    it('should show the Claiming Reward line item if withdrawalIncludesClaim is true and user has rewards', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator
            component={EarnEnterAmount}
            params={{
              pool: {
                ...mockEarnPositions[0],
                dataProps: { ...mockEarnPositions[0].dataProps, withdrawalIncludesClaim: true },
              },
              mode: 'withdraw',
            }}
          />
        </Provider>
      )

      expect(getByTestId('EnterAmountWithdrawDetails/ClaimingReward-0')).toBeTruthy()
      expect(getByTestId('EnterAmountWithdrawDetails/ClaimingReward-0/Label')).toHaveTextContent(
        'earnFlow.enterAmount.claimingReward'
      )
      expect(getByTestId('EnterAmountWithdrawDetails/ClaimingReward-0/Value')).toHaveTextContent(
        'tokenAndLocalAmount, {"tokenAmount":"0.01","localAmount":"0.016","tokenSymbol":"ARB","localCurrencySymbol":"₱"}'
      )
    })

    it('should show the Withdrawing and Claiming card if withdrawalIncludesClaim is true', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator
            component={EarnEnterAmount}
            params={{
              pool: {
                ...mockEarnPositions[0],
                dataProps: { ...mockEarnPositions[0].dataProps, withdrawalIncludesClaim: true },
              },
              mode: 'withdraw',
            }}
          />
        </Provider>
      )

      expect(getByTestId('EarnEnterAmount/WithdrawingAndClaimingCard')).toBeTruthy()
    })
  })

  // tests independent of deposit / swap-deposit
  it('should show a warning and not allow the user to continue if they input an amount greater than balance', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransaction,
        swapTransaction: undefined,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '12')

    expect(getByTestId('EarnEnterAmount/NotEnoughBalanceWarning')).toBeTruthy()
    expect(getByTestId('EarnEnterAmount/Continue')).toBeDisabled()
  })

  it('should show loading spinner when transaction submitted', async () => {
    const mockStore = createStore('loading')
    const { getByTestId } = render(
      <Provider store={mockStore}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    await waitFor(() =>
      expect(getByTestId('EarnEnterAmount/Continue')).toContainElement(
        getByTestId('Button/Loading')
      )
    )
    expect(getByTestId('EarnEnterAmount/Continue')).toBeDisabled()
  })

  it('should show loading spinner when preparing transaction', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: undefined,
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: true,
    })
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '8')

    await waitFor(() =>
      expect(getByTestId('EarnEnterAmount/Continue')).toContainElement(
        getByTestId('Button/Loading')
      )
    )
    expect(getByTestId('EarnEnterAmount/Continue')).toBeDisabled()
  })

  describe.each([
    { decimal: '.', group: ',' },
    { decimal: ',', group: '.' },
  ])('with decimal separator "$decimal" and group separator "$group"', ({ decimal, group }) => {
    const replaceSeparators = (value: string) =>
      value.replace(/\./g, '|').replace(/,/g, group).replace(/\|/g, decimal)

    const defaultFormat = BigNumber.config().FORMAT

    beforeEach(() => {
      jest
        .mocked(getNumberFormatSettings)
        .mockReturnValue({ decimalSeparator: decimal, groupingSeparator: group })
      BigNumber.config({
        FORMAT: {
          decimalSeparator: decimal,
          groupSeparator: group,
          groupSize: 3,
        },
      })
    })

    afterEach(() => {
      BigNumber.config({ FORMAT: defaultFormat })
    })

    const mockStore = createMockStore({
      tokens: {
        tokenBalances: {
          ...mockTokenBalances,
          [mockArbUsdcTokenId]: {
            ...mockTokenBalances[mockArbUsdcTokenId],
            balance: '100000.42',
          },
        },
      },
    })

    it('selecting max token amount applies correct decimal separator', async () => {
      const { getByTestId } = render(
        <Provider store={mockStore}>
          <MockedNavigator component={EarnEnterAmount} params={params} />
        </Provider>
      )

      await act(() => {
        DeviceEventEmitter.emit('keyboardDidShow', { endCoordinates: { height: 100 } })
      })

      fireEvent.press(within(getByTestId('EarnEnterAmount/AmountOptions')).getByText('maxSymbol'))
      expect(getByTestId('EarnEnterAmount/TokenAmountInput').props.value).toBe(
        replaceSeparators('100,000.42')
      )
      expect(getByTestId('EarnEnterAmount/ExchangeAmount')).toHaveTextContent(
        replaceSeparators('₱133,000.56')
      )
    })
  })

  it('should show gas warning error when prepareTransactionsResult is type not-enough-balance-for-gas, and tapping cta behaves as expected', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransactionNotEnough,
        swapTransaction: undefined,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    await waitFor(() => expect(getByTestId('GasFeeWarning')).toBeTruthy())
    fireEvent.press(getByText('gasFeeWarning.ctaBuy, {"tokenSymbol":"ETH"}'))
    expect(AppAnalytics.track).toHaveBeenCalledTimes(2)
    expect(AppAnalytics.track).toHaveBeenCalledWith(FeeEvents.gas_fee_warning_impression, {
      errorType: 'not-enough-balance-for-gas',
      flow: 'Deposit',
      tokenId: mockArbEthTokenId,
      networkId: NetworkId['arbitrum-sepolia'],
    })
    expect(AppAnalytics.track).toHaveBeenCalledWith(FeeEvents.gas_fee_warning_cta_press, {
      errorType: 'not-enough-balance-for-gas',
      flow: 'Deposit',
      tokenId: mockArbEthTokenId,
      networkId: NetworkId['arbitrum-sepolia'],
    })
    expect(navigate).toHaveBeenCalledWith(Screens.FiatExchangeAmount, {
      tokenId: mockArbEthTokenId,
      flow: CICOFlow.CashIn,
      tokenSymbol: 'ETH',
    })
  })

  it('should show gas warning error when prepareTransactionsResult is type need-decrease-spend-amount-for-gas, and tapping cta behaves as expected', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransactionDecreaseSpend,
        swapTransaction: undefined,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    await waitFor(() => expect(getByTestId('GasFeeWarning')).toBeTruthy())
    fireEvent.press(getByText('gasFeeWarning.ctaAction, {"context":"Deposit"}'))
    expect(AppAnalytics.track).toHaveBeenCalledTimes(2)
    expect(AppAnalytics.track).toHaveBeenCalledWith(FeeEvents.gas_fee_warning_impression, {
      errorType: 'need-decrease-spend-amount-for-gas',
      flow: 'Deposit',
      tokenId: mockArbEthTokenId,
      networkId: NetworkId['arbitrum-sepolia'],
    })
    expect(AppAnalytics.track).toHaveBeenCalledWith(FeeEvents.gas_fee_warning_cta_press, {
      errorType: 'need-decrease-spend-amount-for-gas',
      flow: 'Deposit',
      tokenId: mockArbEthTokenId,
      networkId: NetworkId['arbitrum-sepolia'],
    })
    // Deposit value should now be decreasedSpendAmount from mockPreparedTransactionDecreaseSpend, which is 1
    expect(getByTestId('EnterAmountDepositDetails/Deposit/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"1.00","localAmount":"1.33","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )
  })

  it('should show the FeeInfoBottomSheet when the user taps the fee details icon', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransaction,
        swapTransaction: undefined,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })

    const { getByTestId, getByText, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '1')
    fireEvent.press(getByTestId('EnterAmountDepositDetails/Fee'))
    expect(getByTestId('FeeInfoBottomSheet')).toHaveTextContent('networkFee')
    expect(getByTestId('FeeInfoBottomSheet/EstimatedNetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/MaxNetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(queryByTestId('FeeInfoBottomSheet/AppFee')).toBeFalsy()
    expect(queryByTestId('FeeInfoBottomSheet/EstimatedCrossChainFee')).toBeFalsy()
    expect(queryByTestId('FeeInfoBottomSheet/MaxCrossChainFee')).toBeFalsy()
    expect(getByText('feeInfoBottomSheet.feesInfo, {"context":"sameChain"}')).toBeVisible()
  })

  it('should show swap fees on the FeeInfoBottomSheet when swap transaction is present', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransaction,
        swapTransaction: mockSwapTransaction,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })

    const { getByTestId, getByText, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '1')
    fireEvent.press(getByTestId('EnterAmountDepositDetails/Fee'))
    expect(getByTestId('FeeInfoBottomSheet')).toHaveTextContent('fees')
    expect(getByTestId('FeeInfoBottomSheet/EstimatedNetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/MaxNetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/AppFee/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.006","localAmount":"0.008","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )
    expect(queryByTestId('FeeInfoBottomSheet/EstimatedCrossChainFee')).toBeFalsy()
    expect(queryByTestId('FeeInfoBottomSheet/MaxCrossChainFee')).toBeFalsy()
    expect(
      getByText(
        'feeInfoBottomSheet.feesInfo, {"context":"sameChainWithAppFee","appFeePercentage":"0.6"}'
      )
    ).toBeVisible()
  })

  it('should show swap and cross chain fees on the FeeInfoBottomSheet when cross chain swap transaction is present', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransaction,
        swapTransaction: mockCrossChainSwapTransaction,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })

    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '1')
    fireEvent.press(getByTestId('EnterAmountDepositDetails/Fee'))
    expect(getByTestId('FeeInfoBottomSheet')).toHaveTextContent('fees')
    expect(getByTestId('FeeInfoBottomSheet/EstimatedNetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/MaxNetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/AppFee/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.006","localAmount":"0.008","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/EstimatedCrossChainFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.0005","localAmount":"1.00","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/MaxCrossChainFee/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.001","localAmount":"2.00","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(
      getByText(
        'feeInfoBottomSheet.feesInfo, {"context":"crossChainWithAppFee","appFeePercentage":"0.6"}'
      )
    ).toBeVisible()
  })

  it('should display swap bottom sheet when the user taps the swap details icon', async () => {
    jest.mocked(usePrepareEnterAmountTransactionsCallback).mockReturnValue({
      prepareTransactionsResult: {
        prepareTransactionsResult: mockPreparedTransaction,
        swapTransaction: mockSwapTransaction,
      },
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
      isPreparingTransactions: false,
    })

    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={EarnEnterAmount} params={params} />
      </Provider>
    )

    fireEvent.changeText(getByTestId('EarnEnterAmount/TokenAmountInput'), '1')
    fireEvent.press(getByTestId('EnterAmountDepositDetails/Swap'))
    expect(getByText('earnFlow.swapAndDepositInfoSheet.title')).toBeVisible()
    expect(getByTestId('SwapAndDepositInfoSheet/SwapFrom')).toBeTruthy()
    expect(getByTestId('SwapAndDepositInfoSheet/SwapTo')).toBeTruthy()
    expect(getByText('earnFlow.swapAndDepositInfoSheet.whySwap')).toBeVisible()
    expect(getByText('earnFlow.swapAndDepositInfoSheet.swapDescription')).toBeVisible()
    expect(getByTestId('SwapAndDepositInfoSheet/DismissButton')).toBeVisible()
  })
})
