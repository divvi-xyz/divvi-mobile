import { renderHook } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import {
  getCommonAnalyticsProperties,
  getDepositTokenAmount,
} from 'src/earn/EarnDepositConfirmationScreen'
import type { EarnActiveMode } from 'src/earn/types'
import type { PreparedTransactionsPossible } from 'src/public'
import { NetworkId } from 'src/transactions/types'
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

const mockDepositProps = {
  forwardedRef: { current: null },
  inputAmount: new BigNumber(100),
  preparedTransaction: mockPreparedTransaction,
  pool: mockEarnPositions[0],
  mode: 'deposit' as EarnActiveMode,
  inputTokenId: mockArbUsdcTokenId,
}

const mockSwapDepositProps = {
  ...mockDepositProps,
  mode: 'swap-deposit' as EarnActiveMode,
  inputTokenId: mockArbEthTokenId,
  inputAmount: new BigNumber(0.041),
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

const mockCrossChainProps = {
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
  inputTokenId: mockCeloTokenId,
  swapTransaction: {
    ...mockSwapDepositProps.swapTransaction,
    swapType: 'cross-chain' as const,
    estimatedDuration: 300,
    maxCrossChainFee: '0.1',
    estimatedCrossChainFee: '0.05',
  },
}

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
      swapType: undefined,
    },
    {
      testName: 'same chain swap & deposit',
      mode: 'swap-deposit',
      props: mockSwapDepositProps,
      fromTokenAmount: '0.041',
      fromTokenId: mockArbEthTokenId,
      depositTokenAmount: '99.999',
      swapType: 'same-chain',
    },
    {
      testName: 'cross chain swap & deposit',
      mode: 'swap-deposit',
      props: mockCrossChainProps,
      fromTokenAmount: '0.041',
      fromTokenId: mockCeloTokenId,
      depositTokenAmount: '99.999',
      swapType: 'cross-chain',
    },
  ])('$testName', ({ mode, props, fromTokenAmount, fromTokenId, depositTokenAmount, swapType }) => {
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

    it(`getDepositTokenAmount properly calculates deposit amount for${swapType ? ` ${swapType}` : ''} ${mode}`, () => {
      expect(getDepositTokenAmount(props).toString()).toEqual(depositTokenAmount)
    })

    it('getCommonAnalyticsProperties properly formats common analytics properties', () => {
      const depositTokenAmount = getDepositTokenAmount(props)
      const { result } = renderHook(() => getCommonAnalyticsProperties(props, depositTokenAmount))
      expect(result.current).toEqual(expectedAnalyticsProperties)
    })
  })
})
