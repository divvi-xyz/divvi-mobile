import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { RegulatoryTerms as RegulatoryTermsClass } from 'src/onboarding/registration/RegulatoryTerms'
import { firstOnboardingScreen } from 'src/onboarding/steps'
import { getDynamicConfigParams } from 'src/statsig'
import { createMockStore, getMockI18nProps } from 'test/utils'

jest.mock('src/onboarding/steps')
jest.mock('src/statsig')

describe('RegulatoryTermsScreen', () => {
  const acceptTerms = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getDynamicConfigParams).mockReturnValue({
      links: {
        privacy: 'https://www.example.com/privacy',
        tos: 'https://www.example.com/tos',
      },
    })
  })
  it('renders correct components', () => {
    const store = createMockStore({})
    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <RegulatoryTermsClass
          {...getMockI18nProps()}
          acceptTerms={acceptTerms}
          recoveringFromStoreWipe={false}
        />
      </Provider>
    )

    expect(getByTestId('scrollView')).toBeTruthy()
    expect(queryByTestId('colloquialTermsSectionList')).toBeFalsy()
  })

  describe('when accept button is pressed', () => {
    it('stores that info', async () => {
      const store = createMockStore({})
      const wrapper = render(
        <Provider store={store}>
          <RegulatoryTermsClass
            {...getMockI18nProps()}
            acceptTerms={acceptTerms}
            recoveringFromStoreWipe={false}
          />
        </Provider>
      )
      fireEvent.press(wrapper.getByTestId('AcceptTermsButton'))
      expect(acceptTerms).toHaveBeenCalled()
    })
    it('navigates to PincodeSet', () => {
      const store = createMockStore({})
      jest.mocked(firstOnboardingScreen).mockReturnValue(Screens.PincodeSet)

      const wrapper = render(
        <Provider store={store}>
          <RegulatoryTermsClass
            {...getMockI18nProps()}
            acceptTerms={acceptTerms}
            recoveringFromStoreWipe={false}
          />
        </Provider>
      )
      fireEvent.press(wrapper.getByTestId('AcceptTermsButton'))
      expect(firstOnboardingScreen).toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith(Screens.PincodeSet)
    })
  })
})
