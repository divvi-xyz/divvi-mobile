import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import RNExitApp from 'react-native-exit-app'
import AccountErrorScreen from 'src/account/AccountErrorScreen'
import { noHeaderGestureDisabled } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { updateLastOnboardingScreen } from 'src/onboarding/actions'
import { useDispatch } from 'src/redux/hooks'

function AccounSetupFailureScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(updateLastOnboardingScreen(Screens.Welcome)) // reset onboarding flow
  }, [])

  const onPressCloseApp = () => {
    RNExitApp.exitApp()
  }

  const onPressContactSupport = () => {
    navigate(Screens.SupportContact)
  }

  return (
    <AccountErrorScreen
      title={t('accountSetupFailed')}
      testID="AccountSetupFailure"
      description={t('accountSetupFailedDescription')}
      onPress={onPressCloseApp}
      buttonLabel={t('closeApp')}
      onPressSecondary={onPressContactSupport}
      secondaryButtonLabel={t('contactSupport')}
    />
  )
}

AccounSetupFailureScreen.navOptions = noHeaderGestureDisabled

export default AccounSetupFailureScreen
