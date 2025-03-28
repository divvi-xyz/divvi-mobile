import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import EarnWithdrawConfirmationScreen from 'src/earn/EarnWithdrawConfirmationScreen'
import {
  prepareClaimTransactions,
  prepareWithdrawAndClaimTransactions,
  prepareWithdrawTransactions,
} from 'src/earn/prepareTransactions'
import { withdrawStart } from 'src/earn/slice'
import { isGasSubsidizedForNetwork } from 'src/earn/utils'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import type { PreparedTransactionsPossible } from 'src/public'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import { NetworkId } from 'src/transactions/types'
import { getSerializablePreparedTransactions } from 'src/viem/preparedTransactionSerialization'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore, mockStoreBalancesToTokenBalances } from 'test/utils'
import {
  mockAaveArbUsdcAddress,
  mockAaveArbUsdcTokenId,
  mockAccount,
  mockArbArbTokenId,
  mockArbEthTokenId,
  mockArbUsdcTokenId,
  mockEarnPositions,
  mockPositions,
  mockRewardsPositions,
  mockTokenBalances,
} from 'test/values'

const mockStoreTokens = {
  tokenBalances: {
    ...mockTokenBalances,
    [mockAaveArbUsdcTokenId]: {
      networkId: NetworkId['arbitrum-sepolia'],
      address: mockAaveArbUsdcAddress,
      tokenId: mockAaveArbUsdcTokenId,
      symbol: 'aArbSepUSDC',
      priceUsd: '1',
      balance: '10.75',
      priceFetchedAt: Date.now(),
    },
    [mockArbEthTokenId]: {
      ...mockTokenBalances[mockArbEthTokenId],
      balance: '10',
      priceUsd: '1',
      lastKnownPriceUsd: '1',
    },
  },
}

const mockPreparedTransaction: PreparedTransactionsPossible = {
  type: 'possible' as const,
  transactions: [
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(5e16),
      _baseFeePerGas: BigInt(1),
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
    },
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(1e16),
      _baseFeePerGas: BigInt(1),
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
    },
  ],
  feeCurrency: {
    ...mockTokenBalances[mockArbEthTokenId],
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
}

jest.mock('src/statsig')
jest.mock('src/earn/utils', () => ({
  ...(jest.requireActual('src/earn/utils') as any),
  isGasSubsidizedForNetwork: jest.fn(),
}))
jest.mock('src/earn/prepareTransactions')

describe('EarnWithdrawConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(prepareWithdrawAndClaimTransactions).mockResolvedValue(mockPreparedTransaction)
    jest.mocked(prepareClaimTransactions).mockResolvedValue(mockPreparedTransaction)
    jest.mocked(prepareWithdrawTransactions).mockResolvedValue(mockPreparedTransaction)
    jest.mocked(isGasSubsidizedForNetwork).mockReturnValue(false)
    jest
      .mocked(getFeatureGate)
      .mockImplementation(
        (gateName: StatsigFeatureGates) => gateName === StatsigFeatureGates.SHOW_POSITIONS
      )
  })

  it('renders proper structure for exit and prepares tx', async () => {
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ mode: 'exit', pool: { ...mockEarnPositions[0], balance: '10.75' } }}
        />
      </Provider>
    )

    // screen header
    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )

    // summary item for withdrawal
    expect(
      within(getByTestId('EarnWithdrawConfirmation/Withdraw')).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/Label')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.withdrawing'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/PrimaryValue')).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"11.83","tokenSymbol":"USDC"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/SecondaryValue')).toHaveTextContent(
      'localAmount, {"localAmount":"15.73","localCurrencySymbol":"₱"}'
    )

    // summary item for rewards
    expect(
      within(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0`)).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/Label`)).toHaveTextContent(
      'earnFlow.withdrawConfirmation.rewardClaiming'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/PrimaryValue`)).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"0.01","tokenSymbol":"ARB"}'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/SecondaryValue`)).toHaveTextContent(
      'localAmount, {"localAmount":"0.016","localCurrencySymbol":"₱"}'
    )

    // summary item for pool
    expect(
      within(getByTestId('EarnWithdrawConfirmation/Pool')).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Pool/Label')).toHaveTextContent('from')
    expect(getByTestId('EarnWithdrawConfirmation/Pool/PrimaryValue')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.pool, {"providerName":"Aave"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Pool/SecondaryValue')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.yieldRate, {"apy":"1.92"}'
    )

    // details items
    expect(getByTestId('EarnWithdrawConfirmation/Details/Network/Label')).toHaveTextContent(
      'network'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Network/Value')).toHaveTextContent(
      'Arbitrum Sepolia'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Label')).toHaveTextContent(
      'networkFee'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeTruthy()

    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
      expect(queryByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeFalsy()
    })

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/InfoIcon')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/InfoIcon')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"15.66","localCurrencySymbol":"₱"}'
    )

    // fees info bottom sheet
    expect(getByTestId('FeeInfoBottomSheet')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/FooterDisclaimer')).toHaveTextContent(
      'feeInfoBottomSheet.feesInfo, {"context":"sameChain"}'
    )

    // total plus fees info bottom sheet
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Label')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.withdrawing'
    )
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"11.83","localAmount":"15.73","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Fees/Label')).toHaveTextContent('fees')
    expect(getByTestId('TotalInfoBottomSheet/Fees/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Label')).toHaveTextContent(
      'reviewTransaction.totalLessFees'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"15.66","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toHaveTextContent(
      'earnFlow.collect.ctaExit'
    )

    expect(prepareWithdrawAndClaimTransactions).toHaveBeenCalledWith({
      feeCurrencies: mockStoreBalancesToTokenBalances([
        mockStoreTokens.tokenBalances[mockArbEthTokenId],
      ]),
      pool: { ...mockEarnPositions[0], balance: '10.75' },
      rewardsPositions: [mockRewardsPositions[1]],
      walletAddress: mockAccount.toLowerCase(),
      hooksApiUrl: 'https://api.alfajores.valora.xyz/hooks-api',
      amount: '10.75',
      useMax: true,
    })
    expect(store.getActions()).toEqual([])
  })

  it('renders proper structure for claim-rewards and prepares tx', async () => {
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ mode: 'claim-rewards', pool: { ...mockEarnPositions[0], balance: '10.75' } }}
        />
      </Provider>
    )

    // screen header
    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )

    // summary item for withdrawal
    expect(queryByTestId('EarnWithdrawConfirmation/Withdraw')).toBeFalsy()

    // summary item for rewards
    expect(
      within(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0`)).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/Label`)).toHaveTextContent(
      'earnFlow.withdrawConfirmation.rewardClaiming'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/PrimaryValue`)).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"0.01","tokenSymbol":"ARB"}'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/SecondaryValue`)).toHaveTextContent(
      'localAmount, {"localAmount":"0.016","localCurrencySymbol":"₱"}'
    )

    // summary item for pool
    expect(
      within(getByTestId('EarnWithdrawConfirmation/Pool')).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Pool/Label')).toHaveTextContent('from')
    expect(getByTestId('EarnWithdrawConfirmation/Pool/PrimaryValue')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.pool, {"providerName":"Aave"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Pool/SecondaryValue')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.yieldRate, {"apy":"1.92"}'
    )

    // details items
    expect(getByTestId('EarnWithdrawConfirmation/Details/Network/Label')).toHaveTextContent(
      'network'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Network/Value')).toHaveTextContent(
      'Arbitrum Sepolia'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Label')).toHaveTextContent(
      'networkFee'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeTruthy()

    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
      expect(queryByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeFalsy()
    })

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/InfoIcon')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/InfoIcon')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"0.064","localCurrencySymbol":"- ₱"}'
    )

    // fees info bottom sheet
    expect(getByTestId('FeeInfoBottomSheet')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/FooterDisclaimer')).toHaveTextContent(
      'feeInfoBottomSheet.feesInfo, {"context":"sameChain"}'
    )

    // total plus fees info bottom sheet
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Label')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.withdrawing'
    )
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"11.83","localAmount":"15.73","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Fees/Label')).toHaveTextContent('fees')
    expect(getByTestId('TotalInfoBottomSheet/Fees/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Label')).toHaveTextContent(
      'reviewTransaction.totalLessFees'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"0.064","localCurrencySymbol":"- ₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toHaveTextContent(
      'earnFlow.collect.ctaReward'
    )

    expect(prepareClaimTransactions).toHaveBeenCalledWith({
      feeCurrencies: mockStoreBalancesToTokenBalances([
        mockStoreTokens.tokenBalances[mockArbEthTokenId],
      ]),
      pool: { ...mockEarnPositions[0], balance: '10.75' },
      walletAddress: mockAccount.toLowerCase(),
      hooksApiUrl: 'https://api.alfajores.valora.xyz/hooks-api',
      amount: '10.75',
      useMax: true,
      rewardsPositions: [mockRewardsPositions[1]],
    })
  })

  it('renders proper structure for partial withdrawal with claimed reward', async () => {
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const txAmount = '5.37500000000000045455' // inputAmount divided by pricePerShare but with more precision
    const pool = {
      ...mockEarnPositions[0],
      balance: '10.75',
      dataProps: { ...mockEarnPositions[0].dataProps, withdrawalIncludesClaim: true },
    }
    const inputTokenAmount = (10.75 * +mockEarnPositions[0].pricePerShare) / 2
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ mode: 'withdraw', pool, inputTokenAmount }}
        />
      </Provider>
    )

    // screen header
    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )

    // summary item for withdrawal
    expect(
      within(getByTestId('EarnWithdrawConfirmation/Withdraw')).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/Label')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.withdrawing'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/PrimaryValue')).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"5.91","tokenSymbol":"USDC"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/SecondaryValue')).toHaveTextContent(
      'localAmount, {"localAmount":"7.86","localCurrencySymbol":"₱"}'
    )

    // summary item for rewards
    expect(
      within(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0`)).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/Label`)).toHaveTextContent(
      'earnFlow.withdrawConfirmation.rewardClaiming'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/PrimaryValue`)).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"0.01","tokenSymbol":"ARB"}'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/SecondaryValue`)).toHaveTextContent(
      'localAmount, {"localAmount":"0.016","localCurrencySymbol":"₱"}'
    )

    // summary item for pool
    expect(
      within(getByTestId('EarnWithdrawConfirmation/Pool')).getByTestId('TokenIcon')
    ).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Pool/Label')).toHaveTextContent('from')
    expect(getByTestId('EarnWithdrawConfirmation/Pool/PrimaryValue')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.pool, {"providerName":"Aave"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Pool/SecondaryValue')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.yieldRate, {"apy":"1.92"}'
    )

    // details items
    expect(getByTestId('EarnWithdrawConfirmation/Details/Network/Label')).toHaveTextContent(
      'network'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Network/Value')).toHaveTextContent(
      'Arbitrum Sepolia'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Label')).toHaveTextContent(
      'networkFee'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeTruthy()

    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
      expect(queryByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeFalsy()
    })

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/InfoIcon')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/InfoIcon')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"7.80","localCurrencySymbol":"₱"}'
    )

    // fees info bottom sheet
    expect(getByTestId('FeeInfoBottomSheet')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/FooterDisclaimer')).toHaveTextContent(
      'feeInfoBottomSheet.feesInfo, {"context":"sameChain"}'
    )

    // total plus fees info bottom sheet
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Label')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.withdrawing'
    )
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"5.91","localAmount":"7.86","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Fees/Label')).toHaveTextContent('fees')
    expect(getByTestId('TotalInfoBottomSheet/Fees/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Label')).toHaveTextContent(
      'reviewTransaction.totalLessFees'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"7.80","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toHaveTextContent(
      'earnFlow.collect.ctaWithdraw'
    )

    expect(prepareWithdrawTransactions).toHaveBeenCalledWith({
      feeCurrencies: mockStoreBalancesToTokenBalances([
        mockStoreTokens.tokenBalances[mockArbEthTokenId],
      ]),
      pool,
      rewardsPositions: [mockRewardsPositions[1]],
      walletAddress: mockAccount.toLowerCase(),
      hooksApiUrl: 'https://api.alfajores.valora.xyz/hooks-api',
      amount: txAmount,
    })
  })

  it('skips rewards section when no rewards', async () => {
    const { getByTestId, queryByTestId } = render(
      <Provider
        store={createMockStore({
          tokens: mockStoreTokens,
          positions: {
            positions: [...mockPositions, ...mockRewardsPositions].filter(
              (position) =>
                position.positionId !==
                'arbitrum-sepolia:0x460b97bd498e1157530aeb3086301d5225b91216:supply-incentives'
            ),
          },
        })}
      >
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{
            pool: { ...mockEarnPositions[0], balance: '10.75' },
            mode: 'withdraw',
            useMax: true,
          }}
        />
      </Provider>
    )

    expect(getByTestId('EarnWithdrawConfirmation/Withdraw')).toBeTruthy()
    expect(queryByTestId('EarnWithdrawConfirmation/RewardClaim-0')).toBeFalsy()
    expect(getByTestId('EarnWithdrawConfirmation/Pool')).toBeTruthy()
  })

  it('properly sums up withdrawal amount and multiple claimed rewards of different tokens and shows proper total amounts breakdown', async () => {
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: {
        positions: [
          ...mockPositions,
          mockRewardsPositions[1],
          {
            ...mockRewardsPositions[0],
            positionId:
              'arbitrum-sepolia:0x460b97bd498e1157530aeb3086301d5225b91216:supply-incentives',
          },
        ],
      },
    })
    const pool = {
      ...mockEarnPositions[0],
      balance: '10.75',
      dataProps: { ...mockEarnPositions[0].dataProps, withdrawalIncludesClaim: true },
    }
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ mode: 'withdraw', pool, inputTokenAmount: '5' }}
        />
      </Provider>
    )

    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
      expect(queryByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeFalsy()
    })

    // withdraw amount in USDC
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/PrimaryValue')).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"5.00","tokenSymbol":"USDC"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/SecondaryValue')).toHaveTextContent(
      'localAmount, {"localAmount":"6.65","localCurrencySymbol":"₱"}'
    )

    // Claimed Reward in ARB
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/PrimaryValue`)).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"0.01","tokenSymbol":"ARB"}'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-0/SecondaryValue`)).toHaveTextContent(
      'localAmount, {"localAmount":"0.016","localCurrencySymbol":"₱"}'
    )

    // Claimed Reward in USDC
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-1/PrimaryValue`)).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"10.75","tokenSymbol":"USDC"}'
    )
    expect(getByTestId(`EarnWithdrawConfirmation/RewardClaim-1/SecondaryValue`)).toHaveTextContent(
      'localAmount, {"localAmount":"14.30","localCurrencySymbol":"₱"}'
    )

    // Network Fee
    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )

    // Total
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"20.88","localCurrencySymbol":"₱"}'
    )

    // Total bottom sheet withdrawing details

    // First label is withdrawing
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Label')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.withdrawing'
    )
    // Withdraw amount in USDC + Claimed Reward in USDC
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-0/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"15.75","localAmount":"20.95","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
    )

    // Second label is empty
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-1/Label')).toBeEmptyElement()
    // Claimed Reward in ARB
    expect(getByTestId('TotalInfoBottomSheet/Withdrawing-1/Value')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.01","localAmount":"0.016","tokenSymbol":"ARB","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Fees/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('TotalInfoBottomSheet/Total/Label')).toHaveTextContent(
      'reviewTransaction.totalLessFees'
    )
    // Total is the same as in details
    expect(getByTestId('TotalInfoBottomSheet/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"20.88","localCurrencySymbol":"₱"}'
    )
  })

  describe.each([
    {
      mode: 'exit',
      tokenAmount: '11.825',
      params: { mode: 'exit', pool: { ...mockEarnPositions[0], balance: '10.75' } },
    },
    {
      mode: 'claim-rewards',
      tokenAmount: '11.825',
      params: { mode: 'claim-rewards', pool: { ...mockEarnPositions[0], balance: '10.75' } },
    },
    {
      mode: 'withdraw',
      tokenAmount: '5.91',
      params: {
        mode: 'withdraw',
        pool: { ...mockEarnPositions[0], balance: '10.75' },
        inputTokenAmount: '5.91',
      },
    },
  ])('$mode', ({ mode, tokenAmount, params }) => {
    const pool = mockEarnPositions[0]
    const expectedAnalyticsProperties = {
      mode,
      tokenAmount,
      depositTokenId: mockArbUsdcTokenId,
      networkId: NetworkId['arbitrum-sepolia'],
      providerId: pool.appId,
      poolId: pool.positionId,
      rewards: [
        {
          tokenId: mockRewardsPositions[1].tokens[0].tokenId,
          amount: mockRewardsPositions[1].tokens[0].balance,
        },
      ],
    }

    it.each([
      {
        title: 'pressing provider pool name opens manageUrl if available',
        manageUrl: pool.dataProps.manageUrl!,
        termsUrl: pool.dataProps.termsUrl!,
        result: pool.dataProps.manageUrl!,
      },
      {
        title: 'pressing provider pool name opens termsUrl if manageUrl is not available',
        manageUrl: undefined,
        termsUrl: pool.dataProps.termsUrl!,
        result: pool.dataProps.termsUrl!,
      },
    ])('$title', ({ manageUrl, termsUrl, result }) => {
      const store = createMockStore({
        tokens: { tokenBalances: mockTokenBalances },
        positions: { positions: [...mockPositions, ...mockRewardsPositions] },
      })
      const { getByTestId } = render(
        <Provider store={store}>
          <MockedNavigator
            component={EarnWithdrawConfirmationScreen}
            params={{
              ...params,
              pool: {
                ...params.pool,
                dataProps: { ...params.pool.dataProps, manageUrl, termsUrl },
              },
            }}
          />
        </Provider>
      )

      fireEvent.press(getByTestId('EarnWithdrawConfirmation/Pool'))
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        EarnEvents.earn_withdraw_provider_info_press,
        expectedAnalyticsProperties
      )
      expect(store.getActions()).toEqual([openUrl(result, true)])
    })
  })

  it('shows gas subsidized copy when feature gate is true', async () => {
    jest.mocked(isGasSubsidizedForNetwork).mockReturnValue(true)
    const store = createMockStore({
      tokens: { tokenBalances: mockTokenBalances },
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ pool: mockEarnPositions[0], mode: 'withdraw', useMax: true }}
        />
      </Provider>
    )

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeTruthy()
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeTruthy()

    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
      expect(queryByTestId('EarnWithdrawConfirmation/Details/Total/Loader')).toBeFalsy()
    })

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Caption')).toHaveTextContent(
      'gasSubsidized'
    )
  })

  it('shows error and keeps cta disabled if prepare tx fails', async () => {
    jest.mocked(prepareWithdrawTransactions).mockRejectedValue(new Error('Failed to prepare'))
    const store = createMockStore({
      tokens: { tokenBalances: mockTokenBalances },
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ pool: mockEarnPositions[0], mode: 'withdraw', useMax: true }}
        />
      </Provider>
    )

    // screen header
    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
    })
    expect(getByTestId('EarnWithdrawConfirmation/PrepareError')).toHaveTextContent(
      'earnFlow.collect.errorTitle'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
  })

  it('disables cta if not enough balance for gas', async () => {
    jest.mocked(prepareWithdrawTransactions).mockResolvedValue({
      type: 'not-enough-balance-for-gas',
      feeCurrencies: [mockPreparedTransaction.feeCurrency],
    })
    const store = createMockStore({
      tokens: { tokenBalances: mockTokenBalances },
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ pool: mockEarnPositions[0], mode: 'withdraw', useMax: true }}
        />
      </Provider>
    )

    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
    })
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
    expect(getByTestId('EarnWithdrawConfirmation/NoGasWarning')).toBeTruthy()
  })

  it('pressing cta dispatches withdraw action and fires analytics event', async () => {
    const store = createMockStore({
      tokens: { tokenBalances: mockTokenBalances },
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{
            pool: { ...mockEarnPositions[0], balance: '10.75' },
            mode: 'withdraw',
            inputTokenAmount: '11.825',
            useMax: true,
          }}
        />
      </Provider>
    )

    await waitFor(() => {
      expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeEnabled()
    })

    fireEvent.press(getByTestId('EarnWithdrawConfirmation/ConfirmButton'))

    expect(store.getActions()).toEqual([
      {
        type: withdrawStart.type,
        payload: {
          amount: '11.825',
          pool: { ...mockEarnPositions[0], balance: '10.75' },
          preparedTransactions: getSerializablePreparedTransactions(
            mockPreparedTransaction.transactions
          ),
          rewardsTokens: mockRewardsPositions[1].tokens,
          mode: 'withdraw',
        },
      },
    ])

    expect(AppAnalytics.track).toHaveBeenCalledWith(EarnEvents.earn_collect_earnings_press, {
      depositTokenId: mockArbUsdcTokenId,
      tokenAmount: '11.825',
      networkId: NetworkId['arbitrum-sepolia'],
      providerId: mockEarnPositions[0].appId,
      rewards: [{ amount: '0.01', tokenId: mockArbArbTokenId }],
      poolId: mockEarnPositions[0].positionId,
      mode: 'withdraw',
    })
  })

  it('disables cta and shows loading spinner when withdraw is submitted', async () => {
    const store = createMockStore({
      earn: { withdrawStatus: 'loading' },
      tokens: mockStoreTokens,
      positions: {
        positions: [...mockPositions, ...mockRewardsPositions],
      },
    })
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ pool: mockEarnPositions[0], mode: 'withdraw', useMax: true }}
        />
      </Provider>
    )

    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
    })
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toContainElement(
      getByTestId('Button/Loading')
    )
  })

  it('navigate and fire analytics on no gas CTA press', async () => {
    jest.mocked(prepareWithdrawTransactions).mockResolvedValue({
      type: 'not-enough-balance-for-gas',
      feeCurrencies: [mockPreparedTransaction.feeCurrency],
    })
    const store = createMockStore({
      tokens: { tokenBalances: mockTokenBalances },
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByTestId, queryByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ pool: mockEarnPositions[0], mode: 'withdraw', useMax: true }}
        />
      </Provider>
    )

    expect(getByTestId('BackChevron')).toBeTruthy()
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
      'earnFlow.withdrawConfirmation.title'
    )
    expect(getByTestId('EarnWithdrawConfirmation/ConfirmButton')).toBeDisabled()
    await waitFor(() => {
      expect(queryByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Loader')).toBeFalsy()
    })

    expect(getByTestId('EarnWithdrawConfirmation/NoGasWarning')).toHaveTextContent(
      'earnFlow.collect.noGasCta, {"symbol":"ETH","network":"Arbitrum Sepolia"}'
    )
    fireEvent.press(
      getByText('earnFlow.collect.noGasCta, {"symbol":"ETH","network":"Arbitrum Sepolia"}')
    )

    expect(navigate).toHaveBeenCalledWith(Screens.FiatExchangeAmount, {
      flow: 'CashIn',
      tokenId: mockArbEthTokenId,
      tokenSymbol: 'ETH',
    })
    expect(AppAnalytics.track).toHaveBeenCalledWith(EarnEvents.earn_withdraw_add_gas_press, {
      gasTokenId: mockArbEthTokenId,
      networkId: NetworkId['arbitrum-sepolia'],
      poolId: mockEarnPositions[0].positionId,
      providerId: mockEarnPositions[0].appId,
      depositTokenId: mockArbUsdcTokenId,
    })
  })

  it.each([
    ['claim-rewards', 'earnFlow.collect.ctaReward'],
    ['withdraw', 'earnFlow.collect.ctaWithdraw'],
    ['exit', 'earnFlow.collect.ctaExit'],
  ])('shows correct button text for %s', async (mode, expectedHeader) => {
    const store = createMockStore({
      tokens: { tokenBalances: mockTokenBalances },
      positions: { positions: [...mockPositions, ...mockRewardsPositions] },
    })
    const { getByText } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{ pool: mockEarnPositions[0], mode }}
        />
      </Provider>
    )

    expect(getByText(expectedHeader)).toBeTruthy()
  })
})
