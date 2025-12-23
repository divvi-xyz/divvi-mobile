import { FiatAccountType } from '@fiatconnect/fiatconnect-types'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { FiatExchangeEvents } from 'src/analytics/Events'
import FiatConnectQuote from 'src/fiatExchanges/quotes/FiatConnectQuote'
import { CICOFlow } from 'src/fiatExchanges/types'
import { FiatConnectQuoteSuccess } from 'src/fiatconnect'
import KycInactive from 'src/fiatconnect/kyc/KycInactive'
import { navigateBack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import { mockCusdTokenId, mockFiatConnectQuotes } from 'test/values'

jest.mock('src/analytics/AppAnalytics')
jest.mock('src/navigator/NavigationService')

describe('KycInactive', () => {
  const mockStore = (overrides: any = {}) => {
    const store = createMockStore({
      fiatConnect: {
        ...overrides,
      },
    })
    store.dispatch = jest.fn()
    return store
  }

  const mockQuote = new FiatConnectQuote({
    flow: CICOFlow.CashOut,
    fiatAccountType: FiatAccountType.BankAccount,
    quote: mockFiatConnectQuotes[1] as FiatConnectQuoteSuccess,
    tokenId: mockCusdTokenId,
  })

  const mockScreenProps = () =>
    getMockStackScreenProps(Screens.KycInactive, {
      flow: CICOFlow.CashOut,
      quote: mockQuote,
    })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with title, description and provider name', () => {
    const store = mockStore()
    const mockProps = mockScreenProps()
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <KycInactive {...mockProps} />
      </Provider>
    )

    expect(getByText('fiatConnectKycStatusScreen.inactive.title')).toBeTruthy()
    expect(getByTestId('descriptionText')).toBeTruthy()
    expect(
      getByText('fiatConnectKycStatusScreen.inactive.provider, {"provider":"Provider Two"}')
    ).toBeTruthy()
    expect(getByText('fiatConnectKycStatusScreen.inactive.goBack')).toBeTruthy()
  })

  it('sets navigation options with header left back button', () => {
    const mockProps = mockScreenProps()

    const navigationOptions = KycInactive.navigationOptions({
      route: mockProps.route,
    })

    expect(navigationOptions).toHaveProperty('headerLeft')
    expect(navigationOptions).toHaveProperty('headerTitle')
    expect(typeof navigationOptions.headerLeft).toBe('function')
  })

  it('pressing go back button tracks analytics and navigates back', () => {
    const store = mockStore()
    const mockProps = mockScreenProps()
    const { getByText } = render(
      <Provider store={store}>
        <KycInactive {...mockProps} />
      </Provider>
    )

    const goBackButton = getByText('fiatConnectKycStatusScreen.inactive.goBack')
    fireEvent.press(goBackButton)

    expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
    expect(AppAnalytics.track).toHaveBeenCalledWith(
      FiatExchangeEvents.cico_fc_link_kyc_account_back,
      {
        provider: mockQuote.getProviderId(),
        flow: CICOFlow.CashOut,
        fiatAccountSchema: mockQuote.getFiatAccountSchema(),
      }
    )
    expect(navigateBack).toHaveBeenCalledTimes(1)
  })

  it('displays provider name in the provider text', () => {
    const store = mockStore()
    const mockProps = mockScreenProps()
    const { getByText } = render(
      <Provider store={store}>
        <KycInactive {...mockProps} />
      </Provider>
    )

    expect(
      getByText('fiatConnectKycStatusScreen.inactive.provider, {"provider":"Provider Two"}')
    ).toBeTruthy()
  })

  it('handles different flow types correctly', () => {
    const store = mockStore()
    const cashInProps = getMockStackScreenProps(Screens.KycInactive, {
      flow: CICOFlow.CashIn,
      quote: mockQuote,
    })

    const { getByText } = render(
      <Provider store={store}>
        <KycInactive {...cashInProps} />
      </Provider>
    )

    const goBackButton = getByText('fiatConnectKycStatusScreen.inactive.goBack')
    fireEvent.press(goBackButton)

    expect(AppAnalytics.track).toHaveBeenCalledWith(
      FiatExchangeEvents.cico_fc_link_kyc_account_back,
      {
        provider: mockQuote.getProviderId(),
        flow: CICOFlow.CashIn,
        fiatAccountSchema: mockQuote.getFiatAccountSchema(),
      }
    )
  })
})
