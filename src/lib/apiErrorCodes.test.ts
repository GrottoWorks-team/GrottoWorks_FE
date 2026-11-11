// Mã lỗi BE → câu hiển thị: `translateCode` tra nhóm i18n `errors.<CODE>`.
// Bao phủ 3 mã từng hiện nguyên văn tiếng Anh của BE trên toast (báo cáo
// UI-TEST-RUN 11/11/2026) và kiểm tra fallback khi mã chưa được map.
import { describe, expect, it } from 'vitest'
import { translateCode } from './api'

describe('translateCode', () => {
  it('maps the work-area scope codes to Vietnamese copy', () => {
    expect(translateCode('WORK_AREA_SCOPE_DENIED')).toBeTruthy()
    expect(translateCode('WORK_AREA_SCOPE_DENIED')).not.toBe('WORK_AREA_SCOPE_DENIED')
  })

  it('maps corrective task and readiness review codes', () => {
    expect(translateCode('CORRECTIVE_TASK_INVALID')).toContain('khắc phục')
    expect(translateCode('WORK_AREA_NOT_IN_READINESS_REVIEW')).toContain('sẵn sàng')
  })

  it('returns undefined for codes without a translation (caller keeps BE detail)', () => {
    expect(translateCode('SOME_UNMAPPED_CODE')).toBeUndefined()
    expect(translateCode(undefined)).toBeUndefined()
  })
})
