import OtaClient from '@crowdin/ota-client'
import i18n from 'i18next'
import DeviceInfo from 'react-native-device-info'
import { getAppConfig } from 'src/appConfig'
import { saveOtaTranslations } from 'src/i18n/otaTranslations'
import {
  currentLanguageSelector,
  otaTranslationsAppVersionSelector,
  otaTranslationsLanguageSelector,
  otaTranslationsLastUpdateSelector,
} from 'src/i18n/selectors'
import { otaTranslationsUpdated, setLanguage } from 'src/i18n/slice'
import Logger from 'src/utils/Logger'
import { safely } from 'src/utils/safely'
import { call, put, select, spawn, takeLatest } from 'typed-redux-saga'

const TAG = 'i18n/saga'

export function* handleFetchOtaTranslations() {
  const appConfig = yield* call(getAppConfig)
  const otaTranslationsConfig = appConfig.experimental?.otaTranslations
  if (otaTranslationsConfig === undefined) {
    Logger.debug(`${TAG}@handleFetchOtaTranslations`, 'OTA translations disabled')
    return
  }

  try {
    const currentLanguage = yield* select(currentLanguageSelector)
    if (!currentLanguage) {
      // this is true on first app install if the language cannot be
      // automatically detected, we should not proceed without a language
      return
    }

    const otaClient = new OtaClient(otaTranslationsConfig.crowdinDistributionHash)
    const crowdinContent = yield* call([otaClient, otaClient.getContent])

    // note that the Crowdin language codes are different from the app
    // language codes so we need to map them. unfortunately the mapping is not
    // publically exposed so it is a little cumbersome, and we derive it from
    // getContent
    const translationPathRegex = new RegExp(`main/locales/${currentLanguage}/translation\\.json`)
    const crowdinLanguageCode = Object.entries(crowdinContent).find(([_, paths]) =>
      paths.some((path) => translationPathRegex.test(path))
    )?.[0]

    if (!crowdinLanguageCode) {
      Logger.error(
        `${TAG}@handleFetchOtaTranslations`,
        `Failed to find Crowdin language code for app language ${currentLanguage}`
      )
      return
    }

    const lastFetchLanguage = yield* select(otaTranslationsLanguageSelector)
    const lastFetchTime = yield* select(otaTranslationsLastUpdateSelector)
    const timestamp = yield* call([otaClient, otaClient.getManifestTimestamp])
    const lastFetchAppVersion = yield* select(otaTranslationsAppVersionSelector)

    if (
      lastFetchLanguage !== currentLanguage ||
      lastFetchTime !== timestamp ||
      DeviceInfo.getVersion() !== lastFetchAppVersion
    ) {
      const translations = yield* call(
        [otaClient, otaClient.getStringsByLocale],
        crowdinLanguageCode
      )
      i18n.addResourceBundle(currentLanguage, 'translation', translations, true, true)

      yield* call(saveOtaTranslations, { [currentLanguage]: translations })
      yield* put(
        otaTranslationsUpdated({
          otaTranslationsLastUpdate: timestamp,
          otaTranslationsAppVersion: DeviceInfo.getVersion(),
          otaTranslationsLanguage: currentLanguage,
        })
      )
    }
  } catch (error) {
    Logger.error(`${TAG}@handleFetchOtaTranslations`, 'Failed to fetch OTA translations', error)
  }
}

export function* watchOtaTranslations() {
  yield* takeLatest([setLanguage.type], safely(handleFetchOtaTranslations))
}

export function* i18nSaga() {
  yield* spawn(handleFetchOtaTranslations)
  yield* spawn(watchOtaTranslations)
}
