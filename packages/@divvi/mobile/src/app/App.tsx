import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import * as Sentry from '@sentry/react-native'
import BigNumber from 'bignumber.js'
import * as React from 'react'
import { LogBox, StatusBar } from 'react-native'
import { Auth0Provider } from 'react-native-auth0'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { getNumberFormatSettings } from 'react-native-localize'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableFreeze, enableScreens } from 'react-native-screens'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import AppInitGate from 'src/app/AppInitGate'
import ErrorBoundary from 'src/app/ErrorBoundary'
import { getAppConfig } from 'src/appConfig'
import { isE2EEnv } from 'src/config'
import i18n from 'src/i18n'
import NavigatorWrapper from 'src/navigator/NavigatorWrapper'
import { persistor, store } from 'src/redux/store'
import Logger from 'src/utils/Logger'

Logger.debug('App/init', 'Current Language: ' + i18n.language)

// Explicitly enable screens for react-native-screens
enableScreens(true)
// Prevent inactive screens from rerendering https://reactnavigation.org/docs/native-stack-navigator#freezeonblur
enableFreeze(true)

const ignoreWarnings = [
  'componentWillReceiveProps',
  'Remote debugger', // To avoid "Remote debugger in background tab" warning
  'cancelTouches', // rn-screens warning on iOS
  'Setting a timer', // warns about long setTimeouts which are actually saga timeouts
  'Require cycle', // TODO: fix require cycles and remove this ;)
]
if (isE2EEnv) {
  ignoreWarnings.push('Overriding previous layout')
}
LogBox.ignoreLogs(ignoreWarnings)

const { decimalSeparator, groupingSeparator } = getNumberFormatSettings()

BigNumber.config({
  EXPONENTIAL_AT: 1e9, // toString almost never return exponential notation
  FORMAT: {
    decimalSeparator,
    groupSeparator: groupingSeparator,
    groupSize: 3,
  },
})

interface Props extends Record<string, unknown> {
  appStartedMillis: number
}

// Enables LayoutAnimation on Android. It makes transitions between states smoother.
// https://reactnative.dev/docs/layoutanimation
// Disabling it for now as it seems to cause blank white screens on certain android devices
// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//   UIManager.setLayoutAnimationEnabledExperimental(true)
// }

export class App extends React.Component<Props> {
  reactLoadTime: number = Date.now()
  isConsumingInitialLink = false
  // TODO: add support for changing themes dynamically, here we are getting only the default theme colors.
  isDarkTheme = getAppConfig().themes?.default?.isDark
  cloudBackupConfig = getAppConfig().features?.cloudBackup

  async componentDidMount() {
    if (isE2EEnv) {
      LogBox.ignoreAllLogs(true)
    }
  }

  renderAppContent() {
    return (
      <AppInitGate
        appStartedMillis={this.props.appStartedMillis}
        reactLoadTime={this.reactLoadTime}
      >
        <StatusBar
          backgroundColor="transparent"
          barStyle={this.isDarkTheme ? 'light-content' : 'dark-content'}
          translucent
        />
        <ErrorBoundary>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <NavigatorWrapper />
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ErrorBoundary>
      </AppInitGate>
    )
  }

  render() {
    return (
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate persistor={persistor}>
            {!!this.cloudBackupConfig ? (
              <Auth0Provider
                domain={this.cloudBackupConfig.auth0Domain}
                clientId={this.cloudBackupConfig.auth0ClientId}
              >
                {this.renderAppContent()}
              </Auth0Provider>
            ) : (
              this.renderAppContent()
            )}
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    )
  }
}

export default Sentry.wrap(App)
