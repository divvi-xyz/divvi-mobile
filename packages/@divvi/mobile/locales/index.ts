import { Locale } from 'date-fns'

interface Locales {
  [key: string]:
    | {
        name: string
        strings: any
        dateFns: Locale
        /**
         * List of supported language codes by Crowdin:
         * https://support.crowdin.com/developer/language-codes/
         */
        crowdinConfig: { langCode: string; osx_code?: string }
      }
    | undefined
}

const locales: Locales = {
  'en-US': {
    name: 'English',
    get strings() {
      return {
        translation: require('./base/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/en-US').enUS
    },
    get crowdinConfig() {
      return { langCode: 'en' }
    },
  },
  'es-419': {
    name: 'Español',
    get strings() {
      return {
        translation: require('./es-419/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/es').es
    },
    get crowdinConfig() {
      return { langCode: 'es', osx_code: 'es-419.lproj' }
    },
  },
  'pt-BR': {
    name: 'Português',
    get strings() {
      return {
        translation: require('./pt-BR/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/pt-BR').ptBR
    },
    get crowdinConfig() {
      return { langCode: 'pt-BR' }
    },
  },
  de: {
    name: 'Deutsch',
    get strings() {
      return {
        translation: require('./de/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/de').de
    },
    get crowdinConfig() {
      return { langCode: 'de' }
    },
  },
  'ru-RU': {
    name: 'Pyccкий',
    get strings() {
      return {
        translation: require('./ru-RU/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/ru').ru
    },
    get crowdinConfig() {
      return { langCode: 'ru' }
    },
  },
  'fr-FR': {
    name: 'Français',
    get strings() {
      return {
        translation: require('./fr-FR/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/fr').fr
    },
    get crowdinConfig() {
      return { langCode: 'fr' }
    },
  },
  'it-IT': {
    name: 'Italiano',
    get strings() {
      return {
        translation: require('./it-IT/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/it').it
    },
    get crowdinConfig() {
      return { langCode: 'it' }
    },
  },
  'uk-UA': {
    name: 'Українська',
    get strings() {
      return {
        translation: require('./uk-UA/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/uk').uk
    },
    get crowdinConfig() {
      return { langCode: 'uk' }
    },
  },
  'th-TH': {
    name: 'ไทย',
    get strings() {
      return {
        translation: require('./th-TH/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/th').th
    },
    get crowdinConfig() {
      return { langCode: 'th' }
    },
  },
  'tr-TR': {
    name: 'Türkçe',
    get strings() {
      return {
        translation: require('./tr-TR/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/tr').tr
    },
    get crowdinConfig() {
      return { langCode: 'tr' }
    },
  },
  'pl-PL': {
    name: 'Polski',
    get strings() {
      return {
        translation: require('./pl-PL/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/pl').pl
    },
    get crowdinConfig() {
      return { langCode: 'pl' }
    },
  },
  'vi-VN': {
    name: 'Tiếng Việt',
    get strings() {
      return {
        translation: require('./vi-VN/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/vi').vi
    },
    get crowdinConfig() {
      return { langCode: 'vi' }
    },
  },
  'zh-CN': {
    name: '简体中文',
    get strings() {
      return {
        translation: require('./zh-CN/translation.json'),
      }
    },
    get dateFns() {
      return require('date-fns/locale/zh-CN').zhCN
    },
    get crowdinConfig() {
      return { langCode: 'zh' }
    },
  },
}

export default locales

export const localesList = Object.entries(locales).map(([key, value]) => {
  return { code: key, name: value!.name }
})
