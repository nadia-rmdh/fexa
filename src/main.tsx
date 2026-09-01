import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SplashGate } from './SplashGate'
import { ensureAppSettings } from './db/db'
import { registerAppServiceWorker, requestPersistentStorage } from './pwa'
import { startBackupScheduler } from './services/backupScheduler'

void ensureAppSettings()
void requestPersistentStorage()
registerAppServiceWorker()
startBackupScheduler()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashGate />
  </StrictMode>,
)
