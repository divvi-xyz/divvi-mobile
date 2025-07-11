/**
 * This is a VIEW, which we use as an overlay, when we need
 * to lock the app with a PIN code.
 */
import React, { useEffect, useState } from 'react'
import { useAsync } from 'react-async-hook'
import { useTranslation } from 'react-i18next'
import { BackHandler, Image, StyleSheet } from 'react-native'
import AppControl from 'react-native-app-control'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PincodeType } from 'src/account/reducer'
import { pincodeTypeSelector } from 'src/account/selectors'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { appUnlock } from 'src/app/actions'
import { supportedBiometryTypeSelector } from 'src/app/selectors'
import { getAppConfig } from 'src/appConfig'
import Pincode from 'src/pincode/Pincode'
import { checkPin, getPincodeWithBiometry } from 'src/pincode/authentication'
import { useDispatch, useSelector } from 'src/redux/hooks'
import colors from 'src/styles/colors'
import { currentAccountSelector } from 'src/web3/selectors'

function PincodeLock() {
  const [pin, setPin] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const account = useSelector(currentAccountSelector)
  const pincodeType = useSelector(pincodeTypeSelector)
  const supportedBiometryType = useSelector(supportedBiometryTypeSelector)

  const shouldGetPinWithBiometry =
    supportedBiometryType !== null && pincodeType === PincodeType.PhoneAuth

  const onWrongPin = () => {
    setPin('')
    setErrorText(t(`${ErrorMessages.INCORRECT_PIN}`))
  }

  const onCorrectPin = () => {
    dispatch(appUnlock())
  }

  const onCompletePin = async (enteredPin: string) => {
    if (!account) {
      throw new Error('Attempting to unlock pin before account initialized')
    }

    if (await checkPin(enteredPin, account)) {
      onCorrectPin()
    } else {
      onWrongPin()
    }
  }

  useEffect(() => {
    function hardwareBackPress() {
      AppControl.Exit()
      return true
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', hardwareBackPress)
    return function cleanup() {
      backHandler.remove()
    }
  }, [])

  const assetsConfig = getAppConfig().themes?.default?.assets

  const { error: getPinWithBiometryError } = useAsync(async () => {
    if (shouldGetPinWithBiometry) {
      const pin = await getPincodeWithBiometry()
      void onCompletePin(pin)
    }
  }, [])

  if (shouldGetPinWithBiometry && !getPinWithBiometryError) {
    return (
      <SafeAreaView style={styles.biometryContainer} testID="BiometryContainer">
        {!!assetsConfig?.splashBackgroundImage && (
          <Image
            testID="BackgroundImage"
            source={assetsConfig.splashBackgroundImage}
            style={styles.backgroundImage}
          />
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.pinContainer}>
      <Pincode
        title={t('confirmPin.title')}
        errorText={errorText}
        pin={pin}
        onChangePin={setPin}
        onCompletePin={onCompletePin}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  pinContainer: {
    paddingTop: 20,
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  biometryContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSplash,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'stretch',
    width: undefined,
    height: undefined,
  },
})

export default PincodeLock
