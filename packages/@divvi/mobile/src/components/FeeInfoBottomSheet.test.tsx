import { render } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import FeeInfoBottomSheet from 'src/components/FeeInfoBottomSheet'
import { createMockStore } from 'test/utils'
import {
  mockCeloTokenBalance,
  mockCeloTokenId,
  mockCusdTokenBalance,
  mockCusdTokenId,
  mockTokenBalances,
} from 'test/values'

jest.mock('src/utils/Logger')

const mockNetworkFee = {
  amount: new BigNumber(0.01),
  token: mockCusdTokenBalance,
  maxAmount: new BigNumber(0.02),
}
const mockCrossChainFee = {
  amount: new BigNumber(1.3),
  token: mockCeloTokenBalance,
  maxAmount: new BigNumber(1.7),
}
const mockAppFee = {
  amount: new BigNumber(0.07),
  token: mockCeloTokenBalance,
  percentage: new BigNumber(0.6),
}

// the fee components are calculated from the mock fee objects. the
// calculation is amount * token price usd * local currency exchange rate
// (1.33).
// expectedNetworkFeeInLocalCurrency = 0.01 * 1.001 * 1.33 = 0.0133133
// expectedCrossChainFeeInLocalCurrency = 1.3 * 0.5 * 1.33 = 0.8645
// expectedAppFeeInLocalCurrency = 0.07 * 0.5 * 1.33 = 0.04655

describe('FeeInfoBottomSheet', () => {
  it('should not render anything if there are no fees passed to component', () => {
    const tree = render(
      <Provider store={createMockStore()}>
        <FeeInfoBottomSheet
          forwardedRef={{ current: null }}
          appFee={undefined}
          crossChainFee={undefined}
          networkFee={undefined}
        />
      </Provider>
    )

    expect(tree.toJSON()).toBeNull()
  })

  it('should display the expected fees information in both fiat and token units', () => {
    const { getByText, getByTestId } = render(
      <Provider
        store={createMockStore({
          tokens: {
            tokenBalances: {
              [mockCusdTokenId]: {
                ...mockTokenBalances[mockCusdTokenId],
                priceUsd: '1.001',
              },
              [mockCeloTokenId]: {
                ...mockTokenBalances[mockCeloTokenId],
                priceUsd: '0.5',
              },
            },
          },
        })}
      >
        <FeeInfoBottomSheet
          forwardedRef={{ current: null }}
          appFee={mockAppFee}
          crossChainFee={mockCrossChainFee}
          networkFee={mockNetworkFee}
        />
      </Provider>
    )

    expect(getByText('fees')).toBeTruthy()
    expect(getByText('breakdown')).toBeTruthy()
    expect(getByText('moreInformation')).toBeTruthy()
    expect(
      getByText(
        'feeInfoBottomSheet.feesInfo, {"context":"crossChainWithAppFee","appFeePercentage":"0.6"}'
      )
    ).toBeTruthy()

    expect(getByText('estimatedNetworkFee')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/EstimatedNetworkFee')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.01","localAmount":"0.013","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )

    expect(getByText('maxNetworkFee')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/MaxNetworkFee')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.02","localAmount":"0.027","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )

    expect(getByText('appFee, {"appName":"Test App"}')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/AppFee')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"0.07","localAmount":"0.047","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )

    expect(getByText('estimatedCrossChainFee')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/EstimatedCrossChainFee')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"1.30","localAmount":"0.86","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )

    expect(getByText('maxCrossChainFee')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/MaxCrossChainFee')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"1.70","localAmount":"1.13","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )
  })

  it('should display the expected fees information in token units if priceUsd is unavailable', () => {
    const { getByTestId } = render(
      <Provider
        store={createMockStore({
          tokens: {
            tokenBalances: {
              [mockCusdTokenId]: {
                ...mockTokenBalances[mockCusdTokenId],
                priceUsd: undefined,
              },
            },
          },
        })}
      >
        <FeeInfoBottomSheet
          forwardedRef={{ current: null }}
          appFee={mockAppFee}
          crossChainFee={mockCrossChainFee}
          networkFee={{
            ...mockNetworkFee,
            token: {
              ...mockNetworkFee.token,
              priceUsd: null,
            },
          }}
        />
      </Provider>
    )

    expect(getByTestId('FeeInfoBottomSheet/EstimatedNetworkFee')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"context":"noFiatPrice","tokenAmount":"0.01","localAmount":"","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('FeeInfoBottomSheet/MaxNetworkFee')).toHaveTextContent(
      'tokenAndLocalAmount, {"context":"noFiatPrice","tokenAmount":"0.02","localAmount":"","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )
  })

  it('should display a message if the app fee is 0', () => {
    const { getByText, getByTestId } = render(
      <Provider
        store={createMockStore({
          tokens: {
            tokenBalances: {
              [mockCusdTokenId]: {
                ...mockTokenBalances[mockCusdTokenId],
                priceUsd: undefined,
              },
            },
          },
        })}
      >
        <FeeInfoBottomSheet
          forwardedRef={{ current: null }}
          appFee={{ ...mockAppFee, amount: new BigNumber(0) }}
          crossChainFee={mockCrossChainFee}
          networkFee={mockNetworkFee}
        />
      </Provider>
    )
    expect(getByText('appFee, {"appName":"Test App"}')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/AppFee')).toHaveTextContent('free')
  })

  it.each([
    {
      title: 'networkFee',
      networkFee: mockNetworkFee,
      appFee: undefined,
      crossChainFee: undefined,
    },
    {
      title: 'fees',
      networkFee: mockNetworkFee,
      appFee: mockAppFee,
      crossChainFee: undefined,
    },
    {
      title: 'fees',
      networkFee: mockNetworkFee,
      appFee: undefined,
      crossChainFee: mockCrossChainFee,
    },
    {
      title: 'fees',
      networkFee: mockNetworkFee,
      appFee: mockAppFee,
      crossChainFee: mockCrossChainFee,
    },
  ])('renders proper structure based on the present fees', (item) => {
    const { getByText, getByTestId } = render(
      <Provider
        store={createMockStore({
          tokens: {
            tokenBalances: {
              [mockCusdTokenId]: { ...mockTokenBalances[mockCusdTokenId], priceUsd: '1.001' },
              [mockCeloTokenId]: { ...mockTokenBalances[mockCeloTokenId], priceUsd: '0.5' },
            },
          },
        })}
      >
        <FeeInfoBottomSheet
          forwardedRef={{ current: null }}
          networkFee={item.networkFee}
          appFee={item.appFee}
          crossChainFee={item.crossChainFee}
        />
      </Provider>
    )

    expect(getByText(item.title)).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/EstimatedNetworkFee')).toBeTruthy()
    expect(getByTestId('FeeInfoBottomSheet/MaxNetworkFee')).toBeTruthy()

    if (item.appFee) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(getByTestId('FeeInfoBottomSheet/Divider/AppFee')).toBeTruthy()
      // eslint-disable-next-line jest/no-conditional-expect
      expect(getByTestId('FeeInfoBottomSheet/AppFee')).toBeTruthy()
    }

    if (item.crossChainFee) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(getByTestId('FeeInfoBottomSheet/Divider/CrossChainFee')).toBeTruthy()
      // eslint-disable-next-line jest/no-conditional-expect
      expect(getByTestId('FeeInfoBottomSheet/EstimatedCrossChainFee')).toBeTruthy()
      // eslint-disable-next-line jest/no-conditional-expect
      expect(getByTestId('FeeInfoBottomSheet/MaxCrossChainFee')).toBeTruthy()
    }
  })
})
