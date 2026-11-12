// Hồi quy: gõ trong ô nhập của dialog KHÔNG được làm focus nhảy sang element khác.
// Trước đây `Dialog` có effect `[open, onClose]`; `onClose` là arrow function tạo mới mỗi lần cha
// render nên mỗi ký tự gõ vào (state đổi → render lại) làm effect chạy lại và focus nhảy sang nút X.
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Dialog } from './dialog'

function DeleteDialogHarness() {
  const [reason, setReason] = useState('')
  return (
    <Dialog
      open
      title="Xoá khu vực"
      // Cố tình tạo hàm mới mỗi lần render — đúng như cách các trang đang dùng.
      onClose={() => undefined}
      footer={<button type="button">Xoá</button>}
    >
      <label htmlFor="reason">Lý do</label>
      <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Dialog>
  )
}

describe('Dialog focus', () => {
  test('focus ô nhập đầu tiên khi mở (không phải nút đóng)', () => {
    render(<DeleteDialogHarness />)
    expect(document.activeElement).toBe(screen.getByLabelText('Lý do'))
  })

  test('gõ nhiều ký tự vẫn giữ focus ở ô nhập', () => {
    render(<DeleteDialogHarness />)
    const input = screen.getByLabelText('Lý do') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'K' } })
    expect(document.activeElement).toBe(input)

    fireEvent.change(input, { target: { value: 'Kh' } })
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('Kh')

    fireEvent.change(input, { target: { value: 'Khu' } })
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('Khu')
  })

  test('dialog không có ô nhập thì focus nút đóng', () => {
    render(
      <Dialog open title="Xác nhận xoá" onClose={() => undefined}>
        Bạn có chắc muốn xoá?
      </Dialog>,
    )
    const closeButton = screen.getByRole('button', { name: /đóng|close/i })
    expect(document.activeElement).toBe(closeButton)
  })
})
