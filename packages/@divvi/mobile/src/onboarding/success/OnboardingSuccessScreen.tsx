import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, Text, View } from 'react-native'
import { getAppConfig } from 'src/appConfig'
import Logo from 'src/images/Logo'
import { nuxNavigationOptionsNoBackButton } from 'src/navigator/Headers'
import { navigateInitialTab } from 'src/navigator/NavigationService'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

function OnboardingSuccessScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigateInitialTab()
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  const { t } = useTranslation()

  const assetsConfig = getAppConfig().themes?.default?.assets

  const image = assetsConfig?.onboardingSuccessImage
  const backgroundImage = assetsConfig?.onboardingSuccessBackgroundImage

  return (
    <View style={styles.container}>
      {!!backgroundImage && <Image source={backgroundImage} style={styles.backgroundImage} />}
      {image ? (
        <Image source={image} />
      ) : (
        <Logo color={colors.contentOnboardingComplete} size={70} />
      )}
      <Text style={styles.text}>{t('success.message')}</Text>
    </View>
  )
}

OnboardingSuccessScreen.navigationOptions = nuxNavigationOptionsNoBackButton

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundOnboardingComplete,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'stretch',
    width: undefined,
    height: undefined,
  },
  text: {
    ...typeScale.titleLarge,
    color: colors.contentOnboardingComplete,
    marginTop: Spacing.Regular16,
    marginBottom: Spacing.Large32,
  },
})

export default OnboardingSuccessScreen
