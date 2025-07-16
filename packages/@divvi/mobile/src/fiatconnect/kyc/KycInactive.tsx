import { RouteProp } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { FiatExchangeEvents } from 'src/analytics/Events'
import BackButton from 'src/components/BackButton'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { getTranslationStrings } from 'src/fiatconnect/LinkAccountScreen'
import i18n from 'src/i18n'
import { emptyHeader } from 'src/navigator/Headers'
import { navigateBack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { typeScale } from 'src/styles/fonts'

type Props = NativeStackScreenProps<StackParamList, Screens.KycInactive>

export default function KycInactive({ route }: Props) {
  const { t } = useTranslation()
  const { flow, quote } = route.params

  const handleGoBack = () => {
    AppAnalytics.track(FiatExchangeEvents.cico_fc_link_kyc_account_back, {
      provider: quote.getProviderId(),
      flow,
      fiatAccountSchema: quote.getFiatAccountSchema(),
    })
    navigateBack()
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('fiatConnectKycStatusScreen.inactive.title')}</Text>
      <Text testID="descriptionText" style={styles.description}>
        {t('fiatConnectKycStatusScreen.inactive.description')}
      </Text>
      <Text style={styles.providerName}>
        {t('fiatConnectKycStatusScreen.inactive.provider', { provider: quote.getProviderName() })}
      </Text>
      <Button
        style={styles.button}
        onPress={handleGoBack}
        text={t('fiatConnectKycStatusScreen.inactive.goBack')}
        type={BtnTypes.PRIMARY}
        size={BtnSizes.MEDIUM}
      />
    </SafeAreaView>
  )
}

KycInactive.navigationOptions = ({
  route,
}: {
  route: RouteProp<StackParamList, Screens.KycInactive>
}) => ({
  ...emptyHeader,
  headerLeft: () => (
    <BackButton
      eventName={FiatExchangeEvents.cico_fc_link_kyc_account_back}
      eventProperties={{
        flow: route.params.flow,
        provider: route.params.quote.getProviderId(),
        fiatAccountSchema: route.params.quote.getFiatAccountSchema(),
      }}
    />
  ),
  headerTitle: i18n.t(getTranslationStrings(route.params.quote.getFiatAccountType()).header),
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typeScale.titleSmall,
    marginHorizontal: 16,
  },
  description: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
    marginVertical: 12,
    marginHorizontal: 24,
  },
  providerName: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
    marginVertical: 12,
    marginHorizontal: 24,
  },
  button: {
    marginTop: 12,
    marginBottom: 100,
  },
})
