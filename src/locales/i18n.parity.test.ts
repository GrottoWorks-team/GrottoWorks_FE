// F-06: chốt parity vi/en. Test chạy trong CI (vitest) nên lệch key là fail merge.
import { expect, test } from 'vitest'
import { en, vi } from '@/lib/i18n'

const viKeys = Object.keys(vi)
const enKeys = Object.keys(en)
const viMap = vi as Record<string, string>
const enMap = en as Record<string, string>

test('vi và en có đúng cùng bộ key', () => {
  expect(viKeys.filter((key) => !(key in enMap)).sort()).toEqual([])
  expect(enKeys.filter((key) => !(key in viMap)).sort()).toEqual([])
})

test('placeholder {{...}} khớp giữa vi và en', () => {
  const placeholders = (value: string) => (value.match(/{{\s*\w+\s*}}/g) ?? []).sort()
  const mismatches = viKeys.filter(
    (key) =>
      key in enMap &&
      JSON.stringify(placeholders(viMap[key])) !== JSON.stringify(placeholders(enMap[key])),
  )
  expect(mismatches.slice(0, 15)).toEqual([])
})
