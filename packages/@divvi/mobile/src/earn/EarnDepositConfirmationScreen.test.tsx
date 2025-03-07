import { renderHook } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import {
  useCommonAnalyticsProperties,
  useDepositAmount,
} from 'src/earn/EarnDepositConfirmationScreen'
import type { EarnActiveMode } from 'src/earn/types'
import type { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import type { PreparedTransactionsPossible } from 'src/public'
import { NetworkId } from 'src/transactions/types'
import { createMockStore } from 'test/utils'
import {
  mockAccount,
  mockArbEthTokenId,
  mockArbUsdcTokenId,
  mockCeloTokenId,
  mockCusdTokenId,
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
  mode: 'deposit' as EarnActiveMode,
  inputTokenInfo: {
    ...mockTokenBalances[mockArbUsdcTokenId],
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
}

const mockSwapDepositProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  ...mockDepositProps,
  mode: 'swap-deposit' as EarnActiveMode,
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
  <Provider
    store={createMockStore({
      tokens: {
        tokenBalances: {
          [mockArbUsdcTokenId]: { ...mockTokenBalances[mockArbUsdcTokenId], priceUsd: '1' },
          [mockCusdTokenId]: { ...mockTokenBalances[mockCusdTokenId], priceUsd: '1.001' },
          [mockCeloTokenId]: { ...mockTokenBalances[mockCeloTokenId], priceUsd: '0.5' },
        },
      },
    })}
  >
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
    }
  )
})
