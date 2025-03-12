import OtaClient from '@crowdin/ota-client'
import i18n from 'i18next'
import locales from 'locales'
import DeviceInfo from 'react-native-device-info'
import {
  CROWDIN_DISTRIBUTION_HASH,
  DEFAULT_APP_LANGUAGE,
  ENABLE_OTA_TRANSLATIONS,
} from 'src/config'
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
const allowOtaTranslations = ENABLE_OTA_TRANSLATIONS

export function* handleFetchOtaTranslations() {
  if (allowOtaTranslations) {
    try {
      const currentLanguage = yield* select(currentLanguageSelector)
      if (!currentLanguage) {
        // this is true on first app install if the language cannot be
        // automatically detected, we should not proceed without a language
        return
      }

      const customMappedLanguage = locales[currentLanguage]?.crowdinConfig.langCode
      const otaClient = new OtaClient(CROWDIN_DISTRIBUTION_HASH, {
        languageCode: customMappedLanguage || currentLanguage || DEFAULT_APP_LANGUAGE,
      })
      const lastFetchLanguage = yield* select(otaTranslationsLanguageSelector)
      const lastFetchTime = yield* select(otaTranslationsLastUpdateSelector)
      const timestamp = yield* call([otaClient, otaClient.getManifestTimestamp])
      const lastFetchAppVersion = yield* select(otaTranslationsAppVersionSelector)

      if (
        lastFetchLanguage !== currentLanguage ||
        lastFetchTime !== timestamp ||
        DeviceInfo.getVersion() !== lastFetchAppVersion
      ) {
        const translations = yield* call([otaClient, otaClient.getStringsByLocale])
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
}

export function* watchOtaTranslations() {
  yield* takeLatest([setLanguage.type], safely(handleFetchOtaTranslations))
}

export function* i18nSaga() {
  yield* spawn(watchOtaTranslations)
}
