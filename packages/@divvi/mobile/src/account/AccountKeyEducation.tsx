import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Education, { EducationTopic } from 'src/account/Education'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { OnboardingEvents } from 'src/analytics/Events'
import { getAppConfig } from 'src/appConfig'
import { BtnTypes } from 'src/components/Button'
import { accountKey1, accountKey2, accountKey3, accountKey4 } from 'src/images/Images'
import { noHeader } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'

type Props = NativeStackScreenProps<StackParamList, Screens.AccountKeyEducation>

export default function AccountKeyEducation(props: Props) {
  function onComplete() {
    AppAnalytics.track(OnboardingEvents.backup_education_complete)
    if (props.route.params?.origin === 'cabOnboarding') {
      navigate(Screens.OnboardingRecoveryPhrase, { origin: 'cabOnboarding' })
    } else if (props.route.params?.nextScreen) {
      navigate(props.route.params?.nextScreen)
    } else {
      navigate(Screens.BackupPhrase)
    }
  }

  const { t } = useTranslation()

  const steps = useSteps()

  useEffect(() => {
    AppAnalytics.track(OnboardingEvents.backup_education_start)
  }, [])

  return (
    <Education
      stepInfo={steps}
      onFinish={onComplete}
      finalButtonText={t('completeEducation')}
      buttonText={t('next')}
      finalButtonType={BtnTypes.PRIMARY}
    />
  )
}

AccountKeyEducation.navigationOptions = {
  ...noHeader,
}

function useSteps() {
  const { t } = useTranslation()
  const backupAndRecoveryImages = getAppConfig().themes?.default?.assets?.backupAndRecoveryImages
  return React.useMemo(
    () =>
      [
        {
          image: backupAndRecoveryImages?.recoveryPhraseEducation1 ?? accountKey1,
          topic: EducationTopic.backup,
        },
        {
          image: backupAndRecoveryImages?.recoveryPhraseEducation2 ?? accountKey2,
          topic: EducationTopic.backup,
        },
        {
          image: backupAndRecoveryImages?.recoveryPhraseEducation3 ?? accountKey3,
          topic: EducationTopic.backup,
        },
        {
          image: backupAndRecoveryImages?.recoveryPhraseEducation4 ?? accountKey4,
          topic: EducationTopic.backup,
        },
      ].map((step, index) => {
        return {
          ...step,
          title: t(`guide.${index}.title`),
          text: t(`guide.${index}.text`),
        }
      }),
    []
  )
}
