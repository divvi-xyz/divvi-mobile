import { fireEvent, render, within } from '@testing-library/react-native'
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
import { createMockStore } from 'test/utils'
import {
  mockAaveArbUsdcAddress,
  mockAaveArbUsdcTokenId,
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
  },
}

const store = createMockStore({
  tokens: mockStoreTokens,
  positions: {
    positions: [...mockPositions, ...mockRewardsPositions],
  },
})

jest.mock('src/statsig')
jest.mock('src/earn/utils', () => ({
  ...(jest.requireActual('src/earn/utils') as any),
  isGasSubsidizedForNetwork: jest.fn(),
}))
jest.mock('src/earn/prepareTransactions')

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
    jest.mocked(isGasSubsidizedForNetwork).mockReturnValue(false)
    store.clearActions()
  })

  it('renders proper structure for exit', () => {
    const { getByTestId } = render(
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
  })

  it('renders proper structure for claim-rewards', () => {
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
  })

  it('renders proper structure for partial withdrawal when there are no rewards to claim', () => {
    const inputTokenAmount = (10.75 * +mockEarnPositions[0].pricePerShare) / 2
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={EarnWithdrawConfirmationScreen}
          params={{
            mode: 'withdraw',
            pool: { ...mockEarnPositions[0], balance: '10.75' },
            inputTokenAmount,
          }}
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
    expect(queryByTestId('EarnWithdrawConfirmation/RewardClaim-0')).toBeFalsy()

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
      providerId: mockEarnPositions[0].appId,
      poolId: mockEarnPositions[0].positionId,
      rewards: [],
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
      const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
      const { getByTestId } = render(
        <Provider store={mockStore}>
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
      expect(mockStore.getActions()).toEqual([openUrl(result, true)])
    })
  })
})
