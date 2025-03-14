import { useHeaderHeight } from '@react-navigation/elements'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cancelCreateOrRestoreAccount } from 'src/account/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { OnboardingEvents } from 'src/analytics/Events'
import Card from 'src/components/Card'
import Touchable from 'src/components/Touchable'
import CloudCheck from 'src/icons/CloudCheck'
import Lock from 'src/icons/Lock'
import { KeylessBackupFlow, KeylessBackupOrigin } from 'src/keylessBackup/types'
import { nuxNavigationOptions } from 'src/navigator/Headers'
import { navigate, navigateClearingStack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import TopBarTextButtonOnboarding from 'src/onboarding/TopBarTextButtonOnboarding'
import { useDispatch } from 'src/redux/hooks'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

type Props = NativeStackScreenProps<StackParamList, Screens.ImportSelect>

function ActionCard({
  title,
  description,
  icon,
  onPress,
  testID,
}: {
  title: string
  description: string
  icon: React.ReactNode
  onPress?: () => void
  testID?: string
}) {
  return (
    <Card style={styles.card} rounded={true} shadow={null} testID={testID}>
      <Touchable borderRadius={8} style={styles.touchable} onPress={onPress}>
        <>
          <View style={styles.topLine}>
            {icon}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <Text style={styles.cardDescription}>{description}</Text>
        </>
      </Touchable>
    </Card>
  )
}

export default function ImportSelect({ navigation }: Props) {
  const dispatch = useDispatch()
  const headerHeight = useHeaderHeight()
  const { t } = useTranslation()

  const handleNavigateBack = () => {
    dispatch(cancelCreateOrRestoreAccount())
    AppAnalytics.track(OnboardingEvents.restore_account_cancel)
    navigateClearingStack(Screens.Welcome)
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TopBarTextButtonOnboarding
          title={t('cancel')}
          onPress={handleNavigateBack}
          titleStyle={{ color: colors.navigationTopSecondary }}
        />
      ),
      headerStyle: {
        backgroundColor: 'transparent',
      },
    })
  }, [navigation])

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={[headerHeight ? { marginTop: headerHeight } : undefined]}>
        <View style={styles.viewContainer}>
          <View style={styles.screenTextContainer}>
            <Text style={styles.screenTitle}>{t('importSelect.title')}</Text>
            <Text style={styles.screenDescription}>{t('importSelect.description')}</Text>
          </View>
          <ActionCard
            title={t('importSelect.emailAndPhone.title')}
            description={t('importSelect.emailAndPhone.description')}
            icon={<CloudCheck color={colors.contentPrimary} />}
            onPress={() =>
              navigate(Screens.SignInWithEmail, {
                keylessBackupFlow: KeylessBackupFlow.Restore,
                origin: KeylessBackupOrigin.Onboarding,
              })
            }
            testID="ImportSelect/CloudBackup"
          />
          <ActionCard
            title={t('importSelect.recoveryPhrase.title')}
            description={t('importSelect.recoveryPhrase.description')}
            icon={<Lock color={colors.contentPrimary} />}
            onPress={() => navigate(Screens.ImportWallet, { clean: true })}
            testID="ImportSelect/Mnemonic"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

ImportSelect.navigationOptions = {
  ...nuxNavigationOptions,
  // Prevent swipe back on iOS, users have to explicitly press cancel
  gestureEnabled: false,
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    flex: 1,
    padding: 0,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  cardDescription: {
    ...typeScale.bodySmall,
    marginLeft: 28,
  },
  cardTitle: {
    ...typeScale.labelMedium,
    color: colors.contentPrimary,
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.backgroundPrimary,
    flex: 1,
  },
  screenDescription: {
    ...typeScale.bodyMedium,
    textAlign: 'center',
  },
  screenTitle: {
    ...typeScale.titleSmall,
    textAlign: 'center',
  },
  screenTextContainer: {
    gap: Spacing.Regular16,
  },
  topLine: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.Smallest8,
  },
  touchable: {
    padding: Spacing.Regular16,
  },
  viewContainer: {
    alignItems: 'center',
    gap: Spacing.Thick24,
    padding: Spacing.Thick24,
  },
})
