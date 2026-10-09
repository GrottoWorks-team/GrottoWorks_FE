import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App.tsx'
import { worker } from './mocks/browser.ts'

async function bootstrap() {
  // Bật MSW ở dev và ở preview build, trừ khi VITE_ENABLE_MSW=off.
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW !== 'off') {
    try {
      await worker.start({ onUnhandledRequest: 'bypass' })
    } catch (e) {
      // Thiếu mockServiceWorker.js chẳng hạn — vẫn render app, không trắng trang.
      console.error('MSW worker.start failed, mocking disabled:', e)
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
