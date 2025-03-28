import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { backupCompletedSelector } from 'src/account/selectors'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { OnboardingEvents } from 'src/analytics/Events'
import Checkmark from 'src/icons/Checkmark'
import { navigate, navigateInitialTab } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { useSelector } from 'src/redux/hooks'
import { typeScale } from 'src/styles/fonts'

/**
 * Component shown to the user upon completion of the Recovery Phrase setup flow. Informs the user that
 * they've successfully completed the backup process and automatically returns them to where they
 * came from.
 */

type Props = NativeStackScreenProps<StackParamList, Screens.BackupComplete>

function BackupComplete({ route }: Props) {
  const isAccountRemoval = route.params?.isAccountRemoval ?? false
  const backupCompleted = useSelector(backupCompletedSelector)
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAccountRemoval) {
        navigate(Screens.SecuritySubmenu, { promptConfirmRemovalModal: true })
      } else if (backupCompleted) {
        AppAnalytics.track(OnboardingEvents.backup_complete)
        navigateInitialTab()
      } else {
        throw new Error('Backup complete screen should not be reachable without completing backup')
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View testID="BackupComplete" style={styles.innerContainer}>
        {backupCompleted && <Checkmark height={32} />}
        {backupCompleted && <Text style={styles.h1}>{t('backupComplete.2')}</Text>}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  h1: {
    ...typeScale.titleMedium,
    marginTop: 20,
    paddingHorizontal: 40,
  },
})

export default BackupComplete
