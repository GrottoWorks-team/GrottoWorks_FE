import { describe, expect, test } from 'vitest'
import { ApiError } from '@/lib/api'
import { errorMessage } from '@/lib/errorMessage'

/**
 * Mục đích: bắt lỗi quay lại kiểu cũ — gộp mọi thứ thành một câu chung.
 * Lỗi thật đã xảy ra ngày 2026-10-27: BE tắt, `fetch` ném TypeError, nhưng
 * Login hiện "Email hoặc mật khẩu không đúng" khiến người dùng đi đổi mật khẩu.
 */
describe('errorMessage', () => {
  test('mat mang (TypeError) phai bao KHONG ket noi duoc, khong do loi du lieu', () => {
    const msg = errorMessage(new TypeError('Failed to fetch'))
    expect(msg).toMatch(/kết nối/i)
    expect(msg).not.toMatch(/mật khẩu/i)
  })

  test('401 phai la het phien, khong phai sai mat khau', () => {
    const msg = errorMessage(new ApiError(401, 'Unauthorized'))
    expect(msg).toMatch(/đăng nhập lại/i)
  })

  test('403 phai la khong du quyen', () => {
    const msg = errorMessage(new ApiError(403, 'Forbidden'))
    expect(msg).toMatch(/quyền/i)
  })

  test('412 phai la du lieu da bi nguoi khac sua', () => {
    const msg = errorMessage(new ApiError(412, 'Precondition Failed'))
    expect(msg).toMatch(/thay đổi/i)
  })

  test('5xx phai la loi may chu, khong lo chi tiet noi bo', () => {
    const msg = errorMessage(new ApiError(500, 'NullReferenceException at line 42'))
    expect(msg).toMatch(/máy chủ/i)
    expect(msg).not.toMatch(/NullReference/)
  })

  test('400 giu nguyen cau BE viet (co ich cho nguoi dung)', () => {
    const msg = errorMessage(new ApiError(400, 'Số lượng phải lớn hơn 0'))
    expect(msg).toBe('Số lượng phải lớn hơn 0')
  })

  test('loi khong xac dinh van co cau', () => {
    expect(errorMessage(null)).toBeTruthy()
    expect(errorMessage(undefined)).toBeTruthy()
  })
})
