import { create } from 'zustand'

interface LastBackupInfo {
  filename: string
  at: number
  method: 'file-picker' | 'download'
}

interface UiState {
  updateAvailable: boolean
  applyUpdate: (() => void) | null
  offlineReady: boolean
  lastBackup: LastBackupInfo | null
  setUpdateAvailable: (apply: () => void) => void
  setOfflineReady: () => void
  setLastBackup: (info: LastBackupInfo) => void
}

export const useUiStore = create<UiState>((set) => ({
  updateAvailable: false,
  applyUpdate: null,
  offlineReady: false,
  lastBackup: null,
  setUpdateAvailable: (apply) => set({ updateAvailable: true, applyUpdate: apply }),
  setOfflineReady: () => set({ offlineReady: true }),
  setLastBackup: (info) => set({ lastBackup: info }),
}))
