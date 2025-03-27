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
import { isGasSubsidizedForNetwork } from 'src/earn/utils'
import type { PreparedTransactionsPossible } from 'src/public'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import { NetworkId } from 'src/transactions/types'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore, mockStoreBalancesToTokenBalances } from 'test/utils'
import {
  mockAaveArbUsdcAddress,
  mockAaveArbUsdcTokenId,
  mockAccount,
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

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"15.66","localCurrencySymbol":"₱"}'
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

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"0.064","localCurrencySymbol":"- ₱"}'
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

    expect(getByTestId('EarnWithdrawConfirmation/Details/NetworkFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.06","localAmount":"0.08","tokenSymbol":"ETH","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Details/Total/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"7.80","localCurrencySymbol":"₱"}'
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
})
