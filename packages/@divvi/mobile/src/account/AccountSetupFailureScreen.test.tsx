import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import AppControl from 'react-native-app-control'
import { Provider } from 'react-redux'
import AccounSetupFailureScreen from 'src/account/AccountSetupFailureScreen'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { updateLastOnboardingScreen } from 'src/onboarding/actions'
import { createMockStore } from 'test/utils'

function renderScreen() {
  const store = createMockStore()
  const renderResult = render(
    <Provider store={store}>
      <AccounSetupFailureScreen />
    </Provider>
  )
  return {
    ...renderResult,
    store,
  }
}

describe('AccountSetupFailureScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the correct elements', () => {
    const { getByText } = renderScreen()

    expect(getByText('accountSetupFailed')).toBeTruthy()
    expect(getByText('accountSetupFailedDescription')).toBeTruthy()
    expect(getByText('closeApp')).toBeTruthy()
    expect(getByText('contactSupport')).toBeTruthy()
  })

  it('should handle closing the app', () => {
    const { getByText } = renderScreen()

    fireEvent.press(getByText('closeApp'))

    expect(AppControl.Exit).toHaveBeenCalledTimes(1)
  })

  it('should handle contact support', () => {
    const { getByText } = renderScreen()

    fireEvent.press(getByText('contactSupport'))

    expect(navigate).toHaveBeenCalledWith(Screens.SupportContact)
  })

  it('should dispatch updateLastOnboardingScreen on mount', () => {
    const { store } = renderScreen()

    expect(store.getActions()).toEqual([updateLastOnboardingScreen(Screens.Welcome)])
  })
})
