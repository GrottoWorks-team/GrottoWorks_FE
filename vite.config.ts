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
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
    // Full-suite chạy 22 file / 60 test trên 1 máy: ReportPage (aggregate 8
    // resource) hay vượt timeout 5s mặc định dưới tải — nâng lên 15s.
    testTimeout: 15_000,
  },
})
