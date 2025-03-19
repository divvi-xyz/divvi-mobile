/* eslint-disable jest/no-conditional-expect */
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

  describe.each([
    {
      testName: 'exit',
      props: {
        pool: { ...mockEarnPositions[0], balance: '10.75' },
        mode: 'exit',
      },
      withdraw: {
        analytics: { amount: '11.825' },
        tokenAmount: 'tokenAmount, {"tokenAmount":"11.83","tokenSymbol":"USDC"}',
        localAmount: 'localAmount, {"localAmount":"15.73","localCurrencySymbol":"₱"}',
      },
      rewards: [
        {
          analytics: { amount: '0.01', tokenId: mockEarnPositions[0].tokenId },
          tokenAmount: 'tokenAmount, {"tokenAmount":"0.01","tokenSymbol":"ARB"}',
          localAmount: 'localAmount, {"localAmount":"0.016","localCurrencySymbol":"₱"}',
        },
      ],
    },
    {
      testName: 'claim rewards',
      props: {
        pool: { ...mockEarnPositions[0], balance: '10.75' },
        mode: 'claim-rewards',
      },
      withdraw: {
        analytics: { amount: '11.825' },
        tokenAmount: undefined,
        localAmount: undefined,
      },
      rewards: [
        {
          analytics: { amount: '0.01', tokenId: mockEarnPositions[0].tokenId },
          tokenAmount: 'tokenAmount, {"tokenAmount":"0.01","tokenSymbol":"ARB"}',
          localAmount: 'localAmount, {"localAmount":"0.016","localCurrencySymbol":"₱"}',
        },
      ],
    },
    {
      testName: 'partial withdrawal',
      props: {
        pool: { ...mockEarnPositions[0], balance: '10.75' },
        mode: 'withdraw',
        inputTokenAmount: (10.75 * +mockEarnPositions[0].pricePerShare) / 2,
      },
      withdraw: {
        analytics: { amount: `${(10.75 * +mockEarnPositions[0].pricePerShare) / 2}` },
        tokenAmount: 'tokenAmount, {"tokenAmount":"5.91","tokenSymbol":"USDC"}',
        localAmount: 'localAmount, {"localAmount":"7.86","localCurrencySymbol":"₱"}',
      },
      rewards: [],
    },
  ])('$testName', ({ props, withdraw, rewards }) => {
    const expectedAnalyticsProperties = {
      depositTokenId: mockArbUsdcTokenId,
      tokenAmount: withdraw.analytics?.amount,
      networkId: NetworkId['arbitrum-sepolia'],
      providerId: mockEarnPositions[0].appId,
      rewards: [],
      poolId: mockEarnPositions[0].positionId,
      mode: props.mode,
    }
    it('renders proper structure', () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <MockedNavigator component={EarnWithdrawConfirmationScreen} params={props} />
        </Provider>
      )

      // screen.debug()

      // screen header
      expect(getByTestId('BackChevron')).toBeTruthy()
      expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
        'earnFlow.withdrawConfirmation.title'
      )

      // summary item for withdraw
      if (withdraw.tokenAmount && withdraw.localAmount) {
        expect(
          within(getByTestId('EarnWithdrawConfirmation/Withdraw')).getByTestId('TokenIcon')
        ).toBeTruthy()
        expect(getByTestId('EarnWithdrawConfirmation/Withdraw/Label')).toHaveTextContent(
          'earnFlow.withdrawConfirmation.withdrawing'
        )
        expect(getByTestId('EarnWithdrawConfirmation/Withdraw/PrimaryValue')).toHaveTextContent(
          withdraw.tokenAmount
        )
        expect(getByTestId('EarnWithdrawConfirmation/Withdraw/SecondaryValue')).toHaveTextContent(
          withdraw.localAmount
        )
      } else {
        expect(queryByTestId('EarnWithdrawConfirmation/Withdraw')).toBeFalsy()
      }

      // symmary item for rewards
      if (rewards.length) {
        rewards.forEach((reward, idx) => {
          expect(
            within(getByTestId(`EarnWithdrawConfirmation/RewardClaim-${idx}`)).getByTestId(
              'TokenIcon'
            )
          ).toBeTruthy()
          expect(
            getByTestId(`EarnWithdrawConfirmation/RewardClaim-${idx}/Label`)
          ).toHaveTextContent('earnFlow.withdrawConfirmation.rewardClaiming')
          expect(
            getByTestId(`EarnWithdrawConfirmation/RewardClaim-${idx}/PrimaryValue`)
          ).toHaveTextContent(reward.tokenAmount)
          expect(
            getByTestId(`EarnWithdrawConfirmation/RewardClaim-${idx}/SecondaryValue`)
          ).toHaveTextContent(reward.localAmount)
        })
      } else {
        expect(queryByTestId('EarnWithdrawConfirmation/RewardClaim-0')).toBeFalsy()
      }

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
          <MockedNavigator
            component={EarnWithdrawConfirmationScreen}
            params={{
              ...props,
              pool: { ...props.pool, dataProps: { ...props.pool.dataProps, manageUrl, termsUrl } },
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
