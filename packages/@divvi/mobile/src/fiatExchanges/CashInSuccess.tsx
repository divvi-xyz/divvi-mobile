import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, Text, View } from 'react-native'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { FiatExchangeEvents } from 'src/analytics/Events'
import Button from 'src/components/Button'
import { fiatExchange } from 'src/images/Images'
import { noHeaderGestureDisabled } from 'src/navigator/Headers'
import { navigateInitialTab } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { typeScale } from 'src/styles/fonts'

type RouteProps = NativeStackScreenProps<StackParamList, Screens.CashInSuccess>
type Props = RouteProps

const capitalizeProvider = (provider?: string) => {
  if (provider) {
    const providerArr = provider.split('')
    providerArr[0].toUpperCase()
    return providerArr.join('')
  }
}

function CashInSuccessScreen({ route }: Props) {
  const { t } = useTranslation()

  const { provider } = route.params

  useEffect(() => {
    AppAnalytics.track(FiatExchangeEvents.cash_in_success, {
      provider,
    })
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={fiatExchange} resizeMode={'contain'} />
        <Text style={styles.title}>{t('cicoSuccess.title')}</Text>
        <Text style={styles.contentText}>
          {provider
            ? t('cicoSuccess.bodyWithProvider', { provider: capitalizeProvider(provider) })
            : t('cicoSuccess.bodyWithoutProvider')}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          style={styles.button}
          text={t('continue')}
          accessibilityLabel={t('continue') ?? undefined}
          onPress={navigateInitialTab}
          testID={'SuccessContinue'}
        />
      </View>
    </View>
  )
}

CashInSuccessScreen.navigationOptions = () => ({
  ...noHeaderGestureDisabled,
})

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    ...typeScale.labelLarge,
    paddingTop: 8,
    paddingBottom: 16,
  },
  content: {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentText: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    minWidth: 200,
    width: '100%',
    alignSelf: 'stretch',
    flex: 1,
    flexDirection: 'column',
  },
})

export default CashInSuccessScreen
