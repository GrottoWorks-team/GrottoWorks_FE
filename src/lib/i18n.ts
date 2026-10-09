// i18next: fallback en, mặc định vi. Keys phẳng theo domain (nav.*, login.*,
// common.*, status.*) — tắt keySeparator để dấu chấm trong key không bị
// hiểu là nested path.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from '@/locales/vi.json'
import en from '@/locales/en.json'

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: 'vi',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
})

export default i18n
