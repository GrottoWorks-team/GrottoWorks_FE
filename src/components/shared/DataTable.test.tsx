import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from './DataTable'

interface Row {
  id: string
  name: string
  status: string
}

const rows: Row[] = [
  { id: 't1', name: 'Khung hang đá', status: 'DOING' },
  { id: 't2', name: 'Trang trí ánh sáng', status: 'DONE' },
  { id: 't3', name: 'Sơn nền hang', status: 'TODO' },
]

const columns = [
  { key: 'name', header: 'Tên' },
  { key: 'status', header: 'Trạng thái' },
]

test('hiện đủ các dòng và EmptyState khi lọc hết', async () => {
  const user = userEvent.setup()
  render(<DataTable<Row> columns={columns} rows={rows} searchKeys={['name']} />)
  expect(screen.getByText('Khung hang đá')).toBeDefined()
  expect(screen.getByText('Trang trí ánh sáng')).toBeDefined()

  await user.type(screen.getByLabelText('Tìm kiếm'), 'không có gì khớp')
  expect(screen.getByText('Chưa có gì ở đây')).toBeDefined()
})

test('tìm theo tên lọc bớt dòng', async () => {
  const user = userEvent.setup()
  render(<DataTable<Row> columns={columns} rows={rows} searchKeys={['name']} />)
  await user.type(screen.getByLabelText('Tìm kiếm'), 'sơn')
  expect(screen.getByText('Sơn nền hang')).toBeDefined()
  expect(screen.queryByText('Khung hang đá')).toBeNull()
})

test('chip trạng thái lọc theo status', async () => {
  const user = userEvent.setup()
  render(
    <DataTable<Row>
      columns={columns}
      rows={rows}
      filters={[{ key: 'status', options: ['DOING', 'DONE'] }]}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Xong' }))
  expect(screen.getByText('Trang trí ánh sáng')).toBeDefined()
  expect(screen.queryByText('Khung hang đá')).toBeNull()
  // Chip "Tất cả" trả lại đầy đủ.
  await user.click(screen.getByRole('button', { name: 'Tất cả' }))
  expect(screen.getByText('Khung hang đá')).toBeDefined()
})
