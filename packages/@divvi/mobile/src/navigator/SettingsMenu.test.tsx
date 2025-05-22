import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import { clearStoredAccount } from 'src/account/actions'
import { getAppConfig } from 'src/appConfig'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import SettingsMenu from 'src/navigator/SettingsMenu'
import { getDynamicConfigParams, getFeatureGate } from 'src/statsig'
import StatsigClientSingleton from 'src/statsig/client'
import { StatsigFeatureGates } from 'src/statsig/types'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore } from 'test/utils'
import { mockAppConfig, mockE164Number } from 'test/values'

jest.mock('src/statsig')
jest.mocked(getDynamicConfigParams).mockReturnValue({})

jest.mock('src/statsig/client')

jest.mock('src/utils/Logger')
jest.mock('src/config', () => ({
  ...jest.requireActual('src/config'),
  STATSIG_ENABLED: jest.fn().mockReturnValue(true),
  STATSIG_API_KEY: 'test-api-key',
  STATSIG_ENV: 'test',
  APP_REGISTRY_NAME: 'test',
}))

jest.mock('src/statsig/selector', () => ({
  getDefaultStatsigUser: jest.fn().mockReturnValue({
    userID: 'test-user-id',
    custom: {},
  }),
}))

// Mock StatsigClientSingleton
const mockGetContext = jest.fn().mockReturnValue({ stableID: 'stableId' })
const mockGetInstance = jest.fn().mockReturnValue({ getContext: mockGetContext })
jest.spyOn(StatsigClientSingleton, 'getInstance').mockImplementation(mockGetInstance)

describe('SettingsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getAppConfig).mockReturnValue({
      ...mockAppConfig,
      features: {
        walletConnect: {
          projectId: 'some-project-id',
        },
      },
      experimental: {
        inviteFriends: true,
        zendeskConfig: {
          apiKey: 'some-key',
          projectName: 'test',
        },
      },
    })
    jest.mocked(getFeatureGate).mockImplementation((gate) => {
      if (gate === StatsigFeatureGates.DISABLE_WALLET_CONNECT_V2) {
        return false
      }
      throw new Error('Unexpected gate')
    })
  })

  it('shows the expected menu items', () => {
    const store = createMockStore()
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )
    expect(getByTestId('SettingsMenu/Profile/Username')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Address')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Invite')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Preferences')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Security')).toBeTruthy()
    expect(getByTestId('SettingsMenu/ConnectedDapps')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Help')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Legal')).toBeTruthy()
    expect(getByTestId('SettingsMenu/Version')).toBeTruthy()
  })
  it('does not show the wallet connect item if the disable feature gate is set', () => {
    jest.mocked(getFeatureGate).mockImplementation((gate) => {
      if (gate === StatsigFeatureGates.DISABLE_WALLET_CONNECT_V2) {
        return true
      }
      throw new Error('Unexpected gate')
    })
    const store = createMockStore()
    const { queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )
    expect(queryByTestId('SettingsMenu/ConnectedDapps')).toBeFalsy()
  })
  it('does not show the wallet connect item if the project id is not set', () => {
    jest.mocked(getAppConfig).mockReturnValue(mockAppConfig)
    const store = createMockStore()
    const { queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )
    expect(queryByTestId('SettingsMenu/ConnectedDapps')).toBeFalsy()
  })
  it('does not show the invite item if the feature is disabled', () => {
    jest.mocked(getAppConfig).mockReturnValue(mockAppConfig)
    const store = createMockStore()
    const { queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )
    expect(queryByTestId('SettingsMenu/Invite')).toBeFalsy()
  })
  it('does not show the help item if help links are not set and contact support is disabled', () => {
    jest.mocked(getAppConfig).mockReturnValue(mockAppConfig)
    const store = createMockStore()
    const { queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )
    expect(queryByTestId('SettingsMenu/Help')).toBeFalsy()
  })
  it('does not show username if not set', () => {
    const store = createMockStore({
      account: {
        name: '',
      },
    })
    const { queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )
    expect(queryByTestId('SettingsMenu/Username')).toBeFalsy()
  })
  describe('shows phone number correctly', () => {
    it('shows the phone number when the user is verified', () => {
      const store = createMockStore({
        app: {
          phoneNumberVerified: true,
        },
        account: {
          e164PhoneNumber: '+13023061234',
        },
      })
      const { getByText } = render(
        <Provider store={store}>
          <MockedNavigator component={SettingsMenu}></MockedNavigator>
        </Provider>
      )
      expect(getByText('+1 302-306-1234')).toBeTruthy()
    })
    it('shows no phone number when the user is not verified', () => {
      const store = createMockStore({
        app: {
          phoneNumberVerified: false,
        },
        account: {
          e164PhoneNumber: '+13023061234',
        },
      })
      const { queryByText } = render(
        <Provider store={store}>
          <MockedNavigator component={SettingsMenu}></MockedNavigator>
        </Provider>
      )
      expect(queryByText('+1 302-306-1234')).toBeFalsy()
    })
  })

  it('menu items navigate to appropriate screens', () => {
    const store = createMockStore()
    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )

    fireEvent.press(getByTestId('SettingsMenu/Profile'))
    fireEvent.press(getByTestId('SettingsMenu/Address'))
    fireEvent.press(getByTestId('SettingsMenu/Invite'))
    fireEvent.press(getByTestId('SettingsMenu/Help'))
    fireEvent.press(getByTestId('SettingsMenu/Legal'))
    fireEvent.press(getByTestId('SettingsMenu/ConnectedDapps'))
    fireEvent.press(getByTestId('SettingsMenu/Preferences'))
    fireEvent.press(getByTestId('SettingsMenu/Security'))

    expect(navigate).toHaveBeenCalledTimes(8)

    expect(navigate).toHaveBeenNthCalledWith(1, Screens.Profile)
    expect(navigate).toHaveBeenNthCalledWith(2, Screens.QRNavigator, {
      screen: Screens.QRCode,
      params: { showSecureSendStyling: true },
    })
    expect(navigate).toHaveBeenNthCalledWith(3, Screens.Invite)
    expect(navigate).toHaveBeenNthCalledWith(4, Screens.Support)
    expect(navigate).toHaveBeenNthCalledWith(5, Screens.LegalSubmenu)
    expect(navigate).toHaveBeenNthCalledWith(6, Screens.WalletConnectSessions)
    expect(navigate).toHaveBeenNthCalledWith(7, Screens.PreferencesSubmenu)
    expect(navigate).toHaveBeenNthCalledWith(8, Screens.SecuritySubmenu)
  })

  it('navigates to the profile submenu if phone number verification is enabled', () => {
    jest
      .mocked(getAppConfig)
      .mockReturnValue({ ...mockAppConfig, experimental: { phoneNumberVerification: true } })

    const { getByTestId } = render(
      <Provider store={createMockStore()}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )

    fireEvent.press(getByTestId('SettingsMenu/Profile'))

    expect(navigate).toHaveBeenCalledWith(Screens.ProfileSubmenu)
  })

  it('renders the dev mode menu', () => {
    const mockAddress = '0x0000000000000000000000000000000000007e57'
    const store = createMockStore({
      account: {
        devModeActive: true,
        e164PhoneNumber: mockE164Number,
      },
      web3: {
        account: mockAddress,
      },
      app: {
        sessionId: 'sessionId',
      },
    })
    const { getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={SettingsMenu}></MockedNavigator>
      </Provider>
    )

    expect(getByText('Session ID: sessionId')).toBeTruthy() // matches store mocks
    expect(getByText('Statsig Stable ID: stableId')).toBeTruthy() // matches Statsig mocks

    store.clearActions()
    fireEvent.press(getByText('App Quick Reset'))
    expect(store.getActions()).toEqual([clearStoredAccount(mockAddress)])

    fireEvent.press(getByText('See App Assets'))
    expect(navigate).toHaveBeenCalledWith(Screens.DebugImages)
  })
})
