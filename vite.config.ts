import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // .env.local KHÔNG tự vào process.env khi Vite đọc config — phải loadEnv.
  // Không có bước này thì đặt VITE_API_TARGET trong .env.local không có tác dụng.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://localhost:6102'

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        // Mặc định là gateway trong docker-compose (6102). Chạy BE native
        // (scripts/be-local.sh, gateway ở 5190) thì đặt VITE_API_TARGET.
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
    // Full-suite chạy 22 file / 63 test trên 1 máy: ReportPage và lazy routes
    // trong App/Login hay vượt timeout mặc định dưới tải — nâng lên 20s.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  }
})
