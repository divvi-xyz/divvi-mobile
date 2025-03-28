import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { OnboardingEvents } from 'src/analytics/Events'
import CancelButton from 'src/components/CancelButton'
import Dialog from 'src/components/Dialog'
import { navigateInitialTab } from 'src/navigator/NavigationService'
import colors from 'src/styles/colors'

interface Props {
  screen: string
}

export default function CancelConfirm({ screen }: Props) {
  const [isOpen, setOpenState] = React.useState(false)
  const { t } = useTranslation()

  const actionText = t('cancelDialog.action')
  const secondaryText = t('cancelDialog.secondary')

  const onCancel = React.useCallback(() => {
    setOpenState(true)
    AppAnalytics.track(OnboardingEvents.backup_cancel)
  }, [screen])

  const onComplete = React.useCallback(() => {
    setOpenState(false)
    AppAnalytics.track(OnboardingEvents.backup_delay_cancel)
  }, [screen, actionText])

  const onProcrastinate = React.useCallback(() => {
    setOpenState(false)
    // Specify fromModal to avoid app crash
    navigateInitialTab(true)
    AppAnalytics.track(OnboardingEvents.backup_delay_confirm)
  }, [screen, secondaryText])

  return (
    <>
      <Dialog
        title={t('cancelDialog.title')}
        isVisible={isOpen}
        actionText={actionText}
        actionPress={onComplete}
        secondaryActionPress={onProcrastinate}
        secondaryActionText={secondaryText}
      >
        {t('cancelDialog.body')}
      </Dialog>
      <CancelButton onCancel={onCancel} style={styles.button} />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    color: colors.contentSecondary,
  },
})
