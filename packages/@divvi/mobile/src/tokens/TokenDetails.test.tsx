import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { CICOFlow } from 'src/fiatExchanges/types'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { Price } from 'src/priceHistory/slice'
import { getDynamicConfigParams, getFeatureGate } from 'src/statsig'
import TokenDetailsScreen from 'src/tokens/TokenDetails'
import { NetworkId } from 'src/transactions/types'
import { ONE_DAY_IN_MILLIS } from 'src/utils/time'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore } from 'test/utils'
import {
  mockCeloTokenId,
  mockPoofTokenId,
  mockTestTokenTokenId,
  mockTokenBalances,
} from 'test/values'

jest.mock('src/statsig')

describe('TokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getDynamicConfigParams).mockReturnValue({ enabled: true }) // Ennable swap feature by default
  })
  it('renders title, balance and token balance item', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
        },
      },
    })

    const { getByTestId, getByText, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/TitleImage')).toBeTruthy()
    expect(getByTestId('TokenDetails/Title')).toHaveTextContent('Poof Governance Token')
    expect(getByTestId('TokenDetails/AssetValue')).toHaveTextContent('₱0.13')
    expect(getByText('tokenDetails.yourBalance')).toBeTruthy()
    expect(getByTestId('TokenBalanceItem')).toBeTruthy()
    expect(queryByTestId('TokenDetails/LearnMore')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Chart')).toBeFalsy()
  })

  it('renders learn more if token has infoUrl', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            infoUrl: 'https://poofToken',
          },
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/LearnMore')).toBeTruthy()
    fireEvent.press(getByTestId('TokenDetails/LearnMore'))
    expect(navigate).toHaveBeenCalledWith(Screens.WebViewScreen, { uri: 'https://poofToken' })
  })

  it('renders price unavailable if token price is not present', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            priceUsd: undefined,
          },
        },
      },
    })

    const { queryByTestId, getByText, getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/PriceDelta')).toBeFalsy()
    expect(getByText('tokenDetails.priceUnavailable')).toBeTruthy()
    expect(getByTestId('TokenDetails/AssetValue')).toHaveTextContent('₱ --')
  })

  it('renders no price info if historical price info is not available', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
        },
      },
    })

    const { queryByTestId, queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/PriceDelta')).toBeFalsy()
    expect(queryByText('tokenDetails.priceUnavailable')).toBeFalsy()
  })

  it('renders no price info if historical price info is out of date', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            historicalPricesUsd: {
              lastDay: {
                at: Date.now() - 2 * ONE_DAY_IN_MILLIS,
                price: '1',
              },
            },
          },
        },
      },
    })

    const { queryByTestId, queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/PriceDelta')).toBeFalsy()
    expect(queryByText('tokenDetails.priceUnavailable')).toBeFalsy()
  })

  it('renders price delta if historical price is available and one day old', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            historicalPricesUsd: {
              lastDay: {
                at: Date.now() - ONE_DAY_IN_MILLIS,
                price: '1',
              },
            },
          },
        },
      },
    })

    const { getByTestId, queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/PriceDelta')).toBeTruthy()
    expect(queryByText('tokenDetails.priceUnavailable')).toBeFalsy()
  })

  it('renders chart loader using blockchain API', () => {
    const store = createMockStore({
      priceHistory: {
        [mockCeloTokenId]: {
          status: 'loading',
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId(`PriceHistoryChart/Loader`)).toBeTruthy()
  })

  it('renders chart and celo news using blockchain API', () => {
    jest.mocked(getFeatureGate).mockReturnValue(true) // Use new prices from blockchain API
    const store = createMockStore({
      priceHistory: {
        [mockCeloTokenId]: {
          status: 'success',
          prices: [
            {
              priceFetchedAt: 1700378258000,
              priceUsd: '0.97',
            },
            {
              priceFetchedAt: 1701659858000,
              priceUsd: '1.2',
            },
            {
              priceFetchedAt: 1702941458000,
              priceUsd: '1.4',
            },
          ] as Price[],
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId(`TokenDetails/Chart/${mockCeloTokenId}`)).toBeTruthy()
  })

  it('renders celo news when using blockchain API', () => {
    jest.mocked(getFeatureGate).mockReturnValue(true) // Use new prices from blockchain API
    const store = createMockStore({
      priceHistory: {
        [mockCeloTokenId]: {
          status: 'success',
          prices: [
            {
              priceFetchedAt: 1700378258000,
              priceUsd: '0.97',
            },
            {
              priceFetchedAt: 1701659858000,
              priceUsd: '1.2',
            },
            {
              priceFetchedAt: 1702941458000,
              priceUsd: '1.4',
            },
          ] as Price[],
        },
      },
    })

    const { queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(queryByText('celoNews.headerTitle')).toBeTruthy()
  })

  it('does not render chart if no prices are found and error status', () => {
    jest.mocked(getFeatureGate).mockReturnValue(true) // Use new prices from blockchain API
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: mockTokenBalances[mockCeloTokenId],
        },
      },
      priceHistory: {
        [mockCeloTokenId]: {
          status: 'error',
          prices: [],
        },
      },
    })

    const { queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )
    expect(queryByTestId(`TokenDetails/Chart/${mockCeloTokenId}`)).toBeFalsy()
    expect(queryByTestId(`PriceHistoryChart/Loader`)).toBeFalsy()
  })

  it('renders send and swap action only if token has balance, and not a CICO token', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
        },
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })

  it('renders send and swap action only if token has balance, is swappable and not a CICO token', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: { ...mockTokenBalances[mockPoofTokenId], isSwappable: true },
        },
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })

  it('renders send, swap and more if token has balance, is swappable and a CICO token', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            balance: '10',
            isSwappable: true,
          },
        },
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(getByTestId('TokenDetails/Action/More')).toBeTruthy()
  })

  it('renders the default actions for the CICO token with 0 balance', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            isSwappable: true,
          },
        },
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/Action/Send')).toBeFalsy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Add')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })

  it('hides swap action and shows more action if token is swappable, has balance and CICO token but swapfeature gate is false', () => {
    jest.mocked(getDynamicConfigParams).mockReturnValue({ enabled: false }) // disable swap feature
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            balance: '10',
            isSwappable: true,
          },
        },
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Swap')).toBeFalsy()
    expect(getByTestId('TokenDetails/Action/Add')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/More')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
  })

  it('actions navigate to appropriate screens', async () => {
    jest.mocked(getFeatureGate).mockReturnValue(false) // Use old send flow
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            balance: '10',
            isSwappable: true,
          },
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    fireEvent.press(getByTestId('TokenDetails/Action/Send'))
    expect(navigate).toHaveBeenCalledWith(Screens.SendSelectRecipient, {
      defaultTokenIdOverride: mockCeloTokenId,
    })
    fireEvent.press(getByTestId('TokenDetails/Action/Swap'))
    expect(navigate).toHaveBeenCalledWith(Screens.SwapScreenWithBack, {
      fromTokenId: mockCeloTokenId,
    })
    fireEvent.press(getByTestId('TokenDetails/Action/More'))
    await waitFor(() => expect(getByTestId('TokenDetailsMoreActions')).toBeTruthy())
    fireEvent.press(getByTestId('TokenDetailsMoreActions/Add'))
    expect(navigate).toHaveBeenCalledWith(Screens.FiatExchangeAmount, {
      tokenId: mockCeloTokenId,
      flow: CICOFlow.CashIn,
      tokenSymbol: 'CELO',
    })
    fireEvent.press(getByTestId('TokenDetailsMoreActions/Withdraw'))
    expect(navigate).toHaveBeenCalledWith(Screens.WithdrawSpend)
    expect(AppAnalytics.track).toHaveBeenCalledTimes(6) // 4 actions + 1 more action + 1 celo news
  })

  it('renders the send and swap actions for the imported tokens with balance', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockTestTokenTokenId]: {
            tokenId: mockTestTokenTokenId,
            balance: '10',
            isManuallyImported: true,
            networkId: NetworkId['celo-alfajores'],
            symbol: 'TT',
          },
        },
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator
          component={TokenDetailsScreen}
          params={{ tokenId: mockTestTokenTokenId }}
        />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })
})
