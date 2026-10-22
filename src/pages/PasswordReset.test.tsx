import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ForgotPasswordPage from './ForgotPassword'
import ResetPasswordPage from './ResetPassword'

vi.mock('@/features/auth/api', () => ({
  useForgotPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResetPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

test('renders ForgotPasswordPage correctly', () => {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByLabelText(/Email/i)).toBeTruthy()
})

test('renders ResetPasswordPage correctly', () => {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reset-password?token=test-token-123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByLabelText(/Token/i)).toBeTruthy()
})
