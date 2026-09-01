import { db } from '@/db/db'
import { BACKUP_FORMAT_VERSION } from './backupTypes'
import type { BackupFile, SerializedImage } from './backupTypes'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function buildBackupFile(): Promise<BackupFile> {
  const [categories, fandoms, characters, items, images, bundleRules, events, eventInventory, transactions, appSettings] =
    await Promise.all([
      db.categories.toArray(),
      db.fandoms.toArray(),
      db.characters.toArray(),
      db.items.toArray(),
      db.images.toArray(),
      db.bundleRules.toArray(),
      db.events.toArray(),
      db.eventInventory.toArray(),
      db.transactions.toArray(),
      db.appSettings.toArray(),
    ])

  const serializedImages: SerializedImage[] = await Promise.all(
    images.map(async (img) => ({ id: img.id, mimeType: img.mimeType, dataUrl: await blobToDataUrl(img.blob) })),
  )

  return {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    data: { categories, fandoms, characters, items, images: serializedImages, bundleRules, events, eventInventory, transactions, appSettings },
  }
}

function backupFilename(): string {
  return `art-market-pos-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
}

export interface ExportResult {
  method: 'file-picker' | 'download'
  filename: string
}

/**
 * `preferFilePicker` must only be true when called synchronously from a real user
 * gesture (a button click) — the File System Access API requires user activation and
 * throws otherwise. Scheduled auto-backups have no such gesture, so they always fall
 * through to the universal `<a download>` mechanism, which produces a new
 * auto-suffixed file each time rather than a silent overwrite.
 */
export async function exportBackup(preferFilePicker: boolean): Promise<ExportResult> {
  const backup = await buildBackupFile()
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const filename = backupFilename()

  if (preferFilePicker && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'FEXA POS backup', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { method: 'file-picker', filename }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      // Any other failure (e.g. permission denied) — fall through to the download link.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return { method: 'download', filename }
}
