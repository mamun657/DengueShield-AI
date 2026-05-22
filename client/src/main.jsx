import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n'
import { registerServiceWorker } from './pwa/registerSw'
import { getDb } from './storage/indexedDb'

registerServiceWorker()
getDb().catch((err) => console.warn('[OfflineDB] init deferred:', err.message))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
