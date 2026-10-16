import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SplashGate } from './SplashGate'
import { ensureAppSettings } from './db/db'
import { registerAppServiceWorker, requestPersistentStorage } from './pwa'
import { startBackupScheduler } from './services/backupScheduler'
import { optimizeStoredImages } from './services/imageOptimizer'

void ensureAppSettings()
void requestPersistentStorage()
registerAppServiceWorker()
startBackupScheduler()
// Deferred past the splash so shrinking old photos doesn't compete with first render.
setTimeout(() => void optimizeStoredImages().catch(console.error), 5_000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashGate />
  </StrictMode>,
)
