/* eslint-disable jest/no-conditional-expect */
import { fireEvent, render, renderHook, within } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import EarnDepositConfirmationScreen, {
  useCommonAnalyticsProperties,
  useDepositAmount,
} from 'src/earn/EarnDepositConfirmationScreen'
import { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import type { PreparedTransactionsPossible } from 'src/public'
import { NetworkId } from 'src/transactions/types'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import {
  mockAccount,
  mockArbEthTokenId,
  mockArbUsdcTokenId,
  mockCeloTokenId,
  mockEarnPositions,
  mockTokenBalances,
  mockUSDCAddress,
} from 'test/values'

const commonAnalyticsProperties = {
  depositTokenId: mockArbUsdcTokenId,
  depositTokenAmount: '100',
  networkId: NetworkId['arbitrum-sepolia'],
  providerId: mockEarnPositions[0].appId,
  poolId: mockEarnPositions[0].positionId,
  fromNetworkId: NetworkId['arbitrum-sepolia'],
}

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

const mockDepositProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  inputTokenAmount: new BigNumber(100),
  preparedTransaction: mockPreparedTransaction,
  pool: mockEarnPositions[0],
  mode: 'deposit',
  inputTokenInfo: {
    ...mockTokenBalances[mockArbUsdcTokenId],
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
}

const mockSwapDepositProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  ...mockDepositProps,
  mode: 'swap-deposit',
  inputTokenInfo: {
    ...mockTokenBalances[mockArbEthTokenId],
    isNative: true,
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
  inputTokenAmount: new BigNumber(0.041),
  swapTransaction: {
    swapType: 'same-chain' as const,
    chainId: 42161,
    price: '2439',
    guaranteedPrice: '2377',
    appFeePercentageIncludedInPrice: '0.6',
    sellTokenAddress: '0xEeeeeeE',
    buyTokenAddress: mockUSDCAddress,
    sellAmount: '41000000000000000',
    buyAmount: '99999000',
    allowanceTarget: '0x0000000000000000000000000000000000000123',
    from: mockAccount,
    to: '0x0000000000000000000000000000000000000123',
    value: '0',
    data: '0x0',
    gas: '1800000',
    estimatedGasUse: undefined,
    estimatedPriceImpact: '0.1',
  },
}

const mockCrossChainProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  ...mockSwapDepositProps,
  preparedTransaction: {
    ...mockPreparedTransaction,
    feeCurrency: {
      ...mockTokenBalances[mockCeloTokenId],
      isNative: true,
      balance: new BigNumber(10),
      priceUsd: new BigNumber(1),
      lastKnownPriceUsd: new BigNumber(1),
    },
  },
  inputTokenInfo: {
    ...mockTokenBalances[mockCeloTokenId],
    isNative: true,
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
  swapTransaction: {
    ...mockSwapDepositProps.swapTransaction,
    swapType: 'cross-chain' as const,
    estimatedDuration: 300,
    maxCrossChainFee: '0.1',
    estimatedCrossChainFee: '0.05',
  } as any,
}

const HookWrapper = (component: any) => (
  <Provider store={createMockStore({ tokens: { tokenBalances: mockTokenBalances } })}>
    {component?.children ? component.children : component}
  </Provider>
)

describe('EarnDepositConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe.each([
    {
      testName: 'deposit',
      mode: 'deposit',
      props: mockDepositProps,
      fromTokenAmount: '100',
      fromTokenId: mockArbUsdcTokenId,
      depositTokenAmount: '100',
      depositLocalAmount: '133',
      swapType: undefined,
    },
    {
      testName: 'same chain swap & deposit',
      mode: 'swap-deposit',
      props: mockSwapDepositProps,
      fromTokenAmount: '0.041',
      fromTokenId: mockArbEthTokenId,
      depositTokenAmount: '99.999',
      depositLocalAmount: '132.99867',
      swapType: 'same-chain',
    },
    {
      testName: 'cross chain swap & deposit',
      mode: 'swap-deposit',
      props: mockCrossChainProps,
      fromTokenAmount: '0.041',
      fromTokenId: mockCeloTokenId,
      depositTokenAmount: '99.999',
      depositLocalAmount: '132.99867',
      swapType: 'cross-chain',
    },
  ])(
    '$testName',
    ({
      mode,
      props,
      fromTokenAmount,
      fromTokenId,
      depositTokenAmount,
      depositLocalAmount,
      swapType,
    }) => {
      const fromNetworkId =
        swapType === 'cross-chain' ? NetworkId['celo-alfajores'] : NetworkId['arbitrum-sepolia']
      const expectedAnalyticsProperties = {
        ...commonAnalyticsProperties,
        mode,
        fromTokenAmount,
        fromTokenId,
        depositTokenAmount,
        swapType,
        fromNetworkId,
      }

      it(`useDepositAmount properly calculates deposit amount in token and fiat`, () => {
        const { result } = renderHook(() => useDepositAmount(props), { wrapper: HookWrapper })
        expect(result.current.tokenAmount.toString()).toEqual(depositTokenAmount)
        expect(result.current.localAmount?.toString()).toEqual(depositLocalAmount)
      })

      it('useCommonAnalyticsProperties properly formats common analytics properties', () => {
        const { result: depositTokenAmount } = renderHook(() => useDepositAmount(props), {
          wrapper: HookWrapper,
        })
        const { result } = renderHook(
          () => useCommonAnalyticsProperties(props, depositTokenAmount.current.tokenAmount),
          { wrapper: HookWrapper }
        )
        expect(result.current).toEqual(expectedAnalyticsProperties)
      })

      it('renders proper structure', () => {
        const { getByTestId } = render(
          <Provider store={createMockStore({ tokens: { tokenBalances: mockTokenBalances } })}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        // screen header
        expect(getByTestId('BackChevron')).toBeTruthy()
        expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
          'earnFlow.depositConfirmation.title'
        )

        // summary item for depositing
        expect(
          within(getByTestId('EarnDepositConfirmationToken')).getByTestId('TokenIcon')
        ).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmationToken/Label')).toHaveTextContent(
          'earnFlow.depositConfirmation.depositing'
        )
        expect(getByTestId('EarnDepositConfirmationToken/PrimaryValue')).toHaveTextContent(
          'tokenAmount, {"tokenAmount":"100.00","tokenSymbol":"USDC"}'
        )
        expect(getByTestId('EarnDepositConfirmationToken/SecondaryValue')).toHaveTextContent(
          'localAmount, {"localAmount":"133.00","localCurrencySymbol":"₱"}'
        )

        // summary item for pool
        expect(
          within(getByTestId('EarnDepositConfirmationPool')).getByTestId('TokenIcon')
        ).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmationPool/Label')).toHaveTextContent(
          'earnFlow.depositConfirmation.into'
        )
        expect(getByTestId('EarnDepositConfirmationPool/PrimaryValue')).toHaveTextContent(
          'earnFlow.depositConfirmation.pool, {"providerName":"Aave"}'
        )
        expect(getByTestId('EarnDepositConfirmationPool/SecondaryValue')).toHaveTextContent(
          'earnFlow.depositConfirmation.yieldRate, {"apy":"1.92"}'
        )

        // summary item for swap and deposit
        if (mode === 'swap-deposit') {
          expect(getByTestId('SwapAndDeposit/Divider')).toBeTruthy()
          expect('SwapAndDeposit/Icon').toBeTruthy()
          expect(getByTestId('SwapAndDeposit/InfoIcon')).toBeTruthy()
          expect(getByTestId('SwapAndDeposit/PrimaryValue')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDeposit'
          )
          expect(getByTestId('SwapAndDeposit/SecondaryValue')).toHaveTextContent(
            'tokenIntoTokenAmount'
          )
          expect(getByTestId('SwapAndDepositInfoSheet')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDepositInfoSheet.title'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapFrom/Label')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDepositInfoSheet.swapFrom'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapFrom/Value')).toHaveTextContent(
            'tokenAndLocalAmount'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapTo/Label')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDepositInfoSheet.swapTo'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapTo/Value')).toHaveTextContent(
            'tokenAndLocalAmount'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/Disclaimer')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDepositInfoSheet.whySwap'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/Disclaimer')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDepositInfoSheet.swapDescription'
          )
        }
      })

      it('pressing cancel fires analytics event', () => {
        const { getByTestId } = render(
          <Provider store={createMockStore({ tokens: { tokenBalances: mockTokenBalances } })}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('BackChevron'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_cancel,
          expectedAnalyticsProperties
        )
      })

      it.each([
        {
          title: 'pressing provider pool name opens manageUrl if available',
          manageUrl: props.pool.dataProps.manageUrl!,
          termsUrl: props.pool.dataProps.termsUrl!,
          result: props.pool.dataProps.manageUrl!,
        },
        {
          title: 'pressing provider pool name opens termsUrl if manageUrl is not available',
          manageUrl: undefined,
          termsUrl: props.pool.dataProps.termsUrl!,
          result: props.pool.dataProps.termsUrl!,
        },
      ])('$title', ({ manageUrl, termsUrl, result }) => {
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, {
                ...props,
                pool: {
                  ...props.pool,
                  dataProps: { ...props.pool.dataProps, manageUrl, termsUrl },
                },
              })}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('EarnDepositConfirmationPool'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_provider_info_press,
          expectedAnalyticsProperties
        )
        expect(mockStore.getActions()).toEqual([openUrl(result, true)])
      })
    }
  )
})
