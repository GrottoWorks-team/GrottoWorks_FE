import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'

// apiUrl() là chỗ duy nhất quyết định gọi vào Gateway nào. Sai ở đây thì mọi
// request đều hỏng, nên phải khoá hành vi bằng test chứ không dựa vào đọc mắt.

const MODULE = '@/lib/api'

describe('apiUrl', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  const load = async (base: string | undefined) => {
    vi.stubEnv('VITE_API_BASE_URL', base as string)
    return await import(MODULE)
  }

  test('có VITE_API_BASE_URL thì ghép tuyệt đối vào gateway', async () => {
    const { apiUrl } = await load('https://api.example.test')
    expect(apiUrl('/seasons')).toBe('https://api.example.test/api/v1/seasons')
    expect(apiUrl('/api/v1/seasons')).toBe('https://api.example.test/api/v1/seasons')
  })

  test('bỏ dấu / ở cuối base để không sinh // trong URL', async () => {
    const { apiUrl } = await load('https://api.example.test///')
    expect(apiUrl('/seasons')).toBe('https://api.example.test/api/v1/seasons')
  })

  test('không có base thì dùng đường dẫn tương đối theo origin', async () => {
    const { apiUrl } = await load(undefined)
    expect(apiUrl('/seasons')).toBe(`${location.origin}/api/v1/seasons`)
  })

  test('base rỗng cũng là chế độ tương đối (proxy Vite)', async () => {
    const { apiUrl } = await load('')
    expect(apiUrl('/api/v1/seasons')).toBe(`${location.origin}/api/v1/seasons`)
  })
})
