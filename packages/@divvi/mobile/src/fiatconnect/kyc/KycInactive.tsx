import { RouteProp } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { FiatExchangeEvents } from 'src/analytics/Events'
import BackButton from 'src/components/BackButton'
import Button, { BtnTypes } from 'src/components/Button'
import { getTranslationStrings } from 'src/fiatconnect/LinkAccountScreen'
import i18n from 'src/i18n'
import { emptyHeader } from 'src/navigator/Headers'
import { navigateBack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

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
      <View style={styles.content}>
        <Text style={styles.title}>{t('KycInactive.title')}</Text>
        <Text style={styles.description}>{t('KycInactive.description')}</Text>
        <Text style={styles.providerName}>
          {t('KycInactive.provider', { provider: quote.getProviderName() })}
        </Text>
        <Text style={styles.nextSteps}>{t('KycInactive.nextSteps')}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          onPress={handleGoBack}
          text={t('KycInactive.goBack')}
          type={BtnTypes.SECONDARY}
          style={styles.button}
        />
      </View>
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
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.Thick24,
    paddingTop: Spacing.Thick24,
    justifyContent: 'center',
  },
  title: {
    ...typeScale.titleMedium,
    textAlign: 'center',
    marginBottom: Spacing.Regular16,
    color: colors.contentPrimary,
  },
  description: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
    marginBottom: Spacing.Regular16,
    color: colors.contentSecondary,
  },
  providerName: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
    marginBottom: Spacing.Regular16,
    color: colors.contentPrimary,
    fontWeight: 'bold',
  },
  nextSteps: {
    ...typeScale.bodySmall,
    textAlign: 'center',
    color: colors.contentSecondary,
    marginBottom: Spacing.Thick24,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.Thick24,
    paddingBottom: Spacing.Thick24,
  },
  button: {
    marginTop: Spacing.Regular16,
  },
})
