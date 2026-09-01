import { db } from '@/db/db'
import { BACKUP_FORMAT_VERSION } from './backupTypes'
import type { BackupFile, SerializedImage } from './backupTypes'

export class InvalidBackupError extends Error {}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new InvalidBackupError('This file is not valid JSON.')
  }
  if (
    typeof json !== 'object' ||
    json === null ||
    typeof (json as BackupFile).version !== 'number' ||
    typeof (json as BackupFile).exportedAt !== 'number' ||
    typeof (json as BackupFile).data !== 'object'
  ) {
    throw new InvalidBackupError("This file doesn't look like an FEXA POS backup.")
  }
  const backup = json as BackupFile
  if (backup.version > BACKUP_FORMAT_VERSION) {
    throw new InvalidBackupError('This backup was made by a newer version of the app.')
  }
  return backup
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

/** Clears every table and bulk-inserts the backup's contents in one Dexie transaction —
 *  restore is all-or-nothing so a failure partway through can't leave a half-restored DB. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const images = await Promise.all(
    backup.data.images.map(async (img: SerializedImage) => ({
      id: img.id,
      mimeType: img.mimeType,
      blob: await dataUrlToBlob(img.dataUrl),
    })),
  )

  await db.transaction(
    'rw',
    [db.categories, db.fandoms, db.characters, db.items, db.images, db.bundleRules, db.events, db.eventInventory, db.transactions, db.appSettings],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.fandoms.clear(),
        db.characters.clear(),
        db.items.clear(),
        db.images.clear(),
        db.bundleRules.clear(),
        db.events.clear(),
        db.eventInventory.clear(),
        db.transactions.clear(),
        db.appSettings.clear(),
      ])
      await Promise.all([
        db.categories.bulkAdd(backup.data.categories),
        db.fandoms.bulkAdd(backup.data.fandoms),
        db.characters.bulkAdd(backup.data.characters),
        db.items.bulkAdd(backup.data.items),
        db.images.bulkAdd(images),
        db.bundleRules.bulkAdd(backup.data.bundleRules),
        db.events.bulkAdd(backup.data.events),
        db.eventInventory.bulkAdd(backup.data.eventInventory),
        db.transactions.bulkAdd(backup.data.transactions),
        db.appSettings.bulkAdd(backup.data.appSettings),
      ])
    },
  )
}
