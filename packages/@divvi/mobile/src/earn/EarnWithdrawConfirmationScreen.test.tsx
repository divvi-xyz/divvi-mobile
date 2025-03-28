import { fireEvent, render, within } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import EarnWithdrawConfirmationScreen from 'src/earn/EarnWithdrawConfirmationScreen'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import { NetworkId } from 'src/transactions/types'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore } from 'test/utils'
import {
  mockAaveArbUsdcAddress,
  mockAaveArbUsdcTokenId,
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

jest.mock('src/statsig')
jest.mock('src/earn/utils', () => ({
  ...(jest.requireActual('src/earn/utils') as any),
  isGasSubsidizedForNetwork: jest.fn(),
}))
jest.mock('src/earn/prepareTransactions')

describe('EarnWithdrawConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(getFeatureGate)
      .mockImplementation(
        (gateName: StatsigFeatureGates) => gateName === StatsigFeatureGates.SHOW_POSITIONS
      )
  })

  it('renders proper structure for exit', () => {
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: {
        positions: [...mockPositions, ...mockRewardsPositions],
      },
    })
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
      '11.83 USDC'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/SecondaryValue')).toHaveTextContent(
      '₱15.73'
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
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: {
        positions: [...mockPositions, ...mockRewardsPositions],
      },
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
  })

  it('renders proper structure for partial withdrawal when there are no rewards to claim', () => {
    const store = createMockStore({
      tokens: mockStoreTokens,
      positions: {
        positions: [...mockPositions, ...mockRewardsPositions],
      },
    })
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
      '5.91 USDC'
    )
    expect(getByTestId('EarnWithdrawConfirmation/Withdraw/SecondaryValue')).toHaveTextContent(
      '₱7.86'
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
      const mockStore = createMockStore({
        tokens: { tokenBalances: mockTokenBalances },
        positions: { positions: [...mockPositions, ...mockRewardsPositions] },
      })
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
