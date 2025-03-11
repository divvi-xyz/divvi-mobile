import hoistStatics from 'hoist-non-react-statics'
import i18n, { Resource, ResourceLanguage } from 'i18next'
import _ from 'lodash'
import {
  initReactI18next,
  WithTranslation,
  withTranslation as withTranslationI18Next,
} from 'react-i18next'
import DeviceInfo from 'react-native-device-info'
import { getAppConfig } from 'src/appConfig'
import { APP_NAME, DEFAULT_APP_LANGUAGE } from 'src/config'
import { getOtaTranslations } from 'src/i18n/otaTranslations'
import { type PublicAppConfig } from 'src/public'
import locales from '../../locales'

function getAvailableResources(cachedTranslations: Resource) {
  const resources: Resource = {}
  for (const [language, value] of Object.entries(locales)) {
    let translation: ResourceLanguage
    const custom: ResourceLanguage | undefined =
      getAppConfig().locales?.[language as keyof PublicAppConfig['locales']]

    Object.defineProperty(resources, language, {
      get: () => {
        if (!translation) {
          // prioritise bundled translations over OTA translations in dev mode
          // so that copy updates can be surfaced
          translation = __DEV__
            ? _.merge(cachedTranslations[language], value!.strings.translation)
            : _.merge(value!.strings.translation, cachedTranslations[language])
        }
        return { translation, custom }
      },
      enumerable: true,
    })
  }
  return resources
}
export async function initI18n(
  language: string,
  allowOtaTranslations: boolean,
  otaTranslationsAppVersion: string
) {
  let cachedTranslations: Resource = {}
  if (allowOtaTranslations && DeviceInfo.getVersion() === otaTranslationsAppVersion) {
    cachedTranslations = await getOtaTranslations()
  }
  const resources = getAvailableResources(cachedTranslations)

  const result = i18n.use(initReactI18next).init({
    fallbackLng: {
      default: [DEFAULT_APP_LANGUAGE],
      'es-US': ['es-LA'],
    },
    lng: language,
    resources,
    ns: ['custom', 'translation'],
    defaultNS: 'custom',
    fallbackNS: 'translation',
    // Only enable for debugging as it forces evaluation of all our lazy loaded locales
    // and prints out all strings when initializing
    debug: false,
    interpolation: {
      escapeValue: false,
      defaultVariables: {
        appName: APP_NAME,
      },
    },
  })

  i18n.services.formatter?.addCached('getCorrectArticle', (lng) => {
    if (lng !== 'en-US') return (val: string) => ''
    return (val: string) => {
      if (!val) return val
      return /^[aeiouAEIOU]/.test(val) ? 'an' : 'a'
    }
  })

  return result
}

// Disabling this for now as we have our own language selection within the app
// and this will change the displayed language only for the current session
// when the device locale is changed outside of the app.
// RNLocalize.addEventListener('change', () => {
//   i18n
//     .changeLanguage(getLanguage())
//     .catch((reason: any) => Logger.error(TAG, 'Failed to change i18n language', reason))
// })

// Create HOC wrapper that hoists statics
// https://react.i18next.com/latest/withtranslation-hoc#hoist-non-react-statics
export const withTranslation =
  <P extends WithTranslation>() =>
  <C extends React.ComponentType<P>>(component: C) =>
    hoistStatics(withTranslationI18Next()(component), component)

export default i18n
