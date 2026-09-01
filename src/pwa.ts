import { registerSW } from 'virtual:pwa-register'
import { useUiStore } from './stores/uiStore'

// registerType is 'prompt' (see vite.config.ts): a kiosk app mid-checkout must
// never be silently reloaded by a background service-worker update. The update
// is only applied when the operator (or, from milestone 9, an idle-cart check)
// explicitly confirms via the UI banner driven by uiStore.
export function registerAppServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      useUiStore.getState().setUpdateAvailable(() => updateSW(true))
    },
    onOfflineReady() {
      useUiStore.getState().setOfflineReady()
    },
  })
}

export async function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    await navigator.storage.persist()
  }
}
