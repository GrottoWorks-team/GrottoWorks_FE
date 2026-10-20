import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MaterialCategoriesPage from './MaterialCategoriesPage'
import { ToastProvider } from '@/components/ui/toast'

const mockCategories = [
  {
    id: 'cat-1',
    code: 'LIGHTING',
    name: 'Đèn và chiếu sáng',
    description: 'Bao gồm đèn dây, đèn rọi',
    status: 'ACTIVE',
  },
  {
    id: 'cat-2',
    code: 'TIMBER',
    name: 'Gỗ và vật liệu dựng',
    description: 'Gỗ tấm, cột chống',
    status: 'INACTIVE',
  },
]

const mockMutateAsyncCreate = vi.fn().mockResolvedValue({})
const mockMutateAsyncUpdate = vi.fn().mockResolvedValue({})

vi.mock('../api', () => ({
  useMaterialCategories: vi.fn(() => ({
    data: mockCategories,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useCreateMaterialCategory: vi.fn(() => ({
    mutateAsync: mockMutateAsyncCreate,
  })),
  useUpdateMaterialCategory: vi.fn(() => ({
    mutateAsync: mockMutateAsyncUpdate,
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('MaterialCategoriesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hiển thị danh sách danh mục vật tư C1 với các cột và dữ liệu mẫu', async () => {
    render(
      <ToastProvider>
        <MaterialCategoriesPage />
      </ToastProvider>,
    )

    expect(await screen.findByText('features.materials.categories.title')).toBeDefined()
    expect(await screen.findByText('LIGHTING')).toBeDefined()
    expect(await screen.findByText('Đèn và chiếu sáng')).toBeDefined()
    expect(await screen.findByText('TIMBER')).toBeDefined()
    expect(await screen.findByText('features.materials.categories.statusActive')).toBeDefined()
    expect(await screen.findByText('features.materials.categories.statusInactive')).toBeDefined()
  })

  it('mở dialog thêm danh mục mới C2 và submit thành công', async () => {
    render(
      <ToastProvider>
        <MaterialCategoriesPage />
      </ToastProvider>,
    )

    const addButton = screen.getByRole('button', { name: /features\.materials\.categories\.create/i })
    fireEvent.click(addButton)

    expect(await screen.findByText('features.materials.categories.dialogCreate')).toBeDefined()

    const codeInput = screen.getByLabelText(/features\.materials\.categories\.code/i)
    const nameInput = screen.getByLabelText(/features\.materials\.categories\.name/i)

    fireEvent.change(codeInput, { target: { value: 'PAINT' } })
    fireEvent.change(nameInput, { target: { value: 'Sơn và màu vẽ' } })

    const submitBtn = screen.getByRole('button', { name: 'common.create' })
    fireEvent.click(submitBtn)
  })
})
