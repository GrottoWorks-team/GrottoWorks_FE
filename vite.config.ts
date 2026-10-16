import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
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
        target: process.env.VITE_API_TARGET ?? 'http://localhost:6102',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
    // Full-suite chạy 22 file / 60 test trên 1 máy: ReportPage (aggregate 8
    // resource) hay vượt timeout 5s mặc định dưới tải — nâng lên 15s.
    testTimeout: 15_000,
  },
})
