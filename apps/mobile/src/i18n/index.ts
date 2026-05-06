import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'

const en = require('./locales/en.json')
const pt = require('./locales/pt.json')
const es = require('./locales/es.json')
const ja = require('./locales/ja.json')

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en'
const supportedLanguages = ['en', 'pt', 'es', 'ja']
const lng = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
      ja: { translation: ja },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n