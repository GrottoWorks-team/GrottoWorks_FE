// i18next: fallback en, mặc định vi. Key phẳng theo domain (nav.*, login.*,
// common.*, status.*) — tắt keySeparator để dấu chấm trong key không bị hiểu là
// nested path.
//
// F-06: bản dịch chia namespace nhỏ (common/tasks/materials/money/people/errors)
// để không còn file 180 KB; key vẫn PHẲNG như trước nên màn hình không phải đổi.
// `src/locales/i18n.parity.test.ts` chặn nếu vi/en lệch key.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import viCommon from '@/locales/vi/common.json'
import viTasks from '@/locales/vi/tasks.json'
import viMaterials from '@/locales/vi/materials.json'
import viMoney from '@/locales/vi/money.json'
import viPeople from '@/locales/vi/people.json'
import viErrors from '@/locales/vi/errors.json'
import enCommon from '@/locales/en/common.json'
import enTasks from '@/locales/en/tasks.json'
import enMaterials from '@/locales/en/materials.json'
import enMoney from '@/locales/en/money.json'
import enPeople from '@/locales/en/people.json'
import enErrors from '@/locales/en/errors.json'

export const vi = { ...viCommon, ...viTasks, ...viMaterials, ...viMoney, ...viPeople, ...viErrors }
export const en = { ...enCommon, ...enTasks, ...enMaterials, ...enMoney, ...enPeople, ...enErrors }

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: 'vi',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
})

export default i18n
