// C1 (2026-10-22, yeu cau khach): tai khoan VOLUNTEER khong duoc vao giao dien
// quan tri web. BE tra role 'VOLUNTEER' that, nhung normalizeRole() map moi role
// la ve 'COMMUNITY' → volunteer bi day vao /community.
//
// Test nay khoa HANH VI that: render RequireRole voi user volunteer, khang dinh
// ket qua la chuyen huong /volunteer chu khong phai render noi dung quan tri.
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireRole } from '@/routes/RequireRole'

let currentUser: {
  id: string
  role: 'COMMUNITY' | 'PARISH' | 'LEADER' | 'MATERIAL_OFFICER'
  rawRole?: string
} | null = null

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: currentUser, isPending: false }),
}))

/** Render /community (route quan tri) va ghi lai duong dan da dung. */
function renderAtAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/community']}>
      <Routes>
        <Route
          path="/community"
          element={
            <RequireRole roles={['COMMUNITY', 'PARISH']}>
              <p>NOI DUNG QUAN TRI</p>
            </RequireRole>
          }
        />
        <Route path="/volunteer" element={<p>TRANG TINH NGUYEN VIEN</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

test('volunteer bi chuyen sang /volunteer, KHONG thay noi dung quan tri', () => {
  currentUser = { id: 'u1', role: 'COMMUNITY', rawRole: 'VOLUNTEER' }
  renderAtAdminRoute()
  expect(screen.queryByText('NOI DUNG QUAN TRI')).toBeNull()
  expect(screen.getByText('TRANG TINH NGUYEN VIEN')).toBeDefined()
})

test('user COMMUNITY that (khong phai volunteer) van vao duoc route quan tri', () => {
  currentUser = { id: 'u2', role: 'COMMUNITY', rawRole: 'PARISH' }
  renderAtAdminRoute()
  expect(screen.getByText('NOI DUNG QUAN TRI')).toBeDefined()
  expect(screen.queryByText('TRANG TINH NGUYEN VIEN')).toBeNull()
})