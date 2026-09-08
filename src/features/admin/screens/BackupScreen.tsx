import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { exportBackup } from '@/services/backupExport'
import { parseBackupFile, restoreBackup, InvalidBackupError } from '@/services/backupRestore'
import { useUiStore } from '@/stores/uiStore'
import { useCartStore } from '@/stores/cartStore'
import type { BackupFile } from '@/services/backupTypes'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { NumberField, CheckboxField } from '@/components/ui/FormField'

export function BackupScreen() {
  const settings = useLiveQuery(() => db.appSettings.get('singleton'), [], undefined)
  const autoBackupEnabled = settings?.autoBackupEnabled ?? false
  const lastBackup = useUiStore((s) => s.lastBackup)
  const clearCart = useCartStore((s) => s.clear)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exporting, setExporting] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  async function handleExportNow() {
    setExporting(true)
    try {
      const result = await exportBackup(true)
      useUiStore.getState().setLastBackup({ filename: result.filename, at: Date.now(), method: result.method })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e
    } finally {
      setExporting(false)
    }
  }

  async function handleFileSelected(file: File) {
    setRestoreError(null)
    try {
      const backup = await parseBackupFile(file)
      setPendingRestore(backup)
    } catch (e) {
      setRestoreError(e instanceof InvalidBackupError ? e.message : 'Could not read that file.')
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return
    setRestoring(true)
    try {
      await restoreBackup(pendingRestore)
      clearCart()
      setPendingRestore(null)
    } catch {
      setRestoreError('Restore failed partway through — the database was not changed.')
    } finally {
      setRestoring(false)
    }
  }

  async function updateInterval(field: 'backupTxnInterval' | 'backupMinuteInterval', value: number) {
    if (value < 1) return
    await db.appSettings.update('singleton', { [field]: value })
  }

  async function toggleAutoBackup(enabled: boolean) {
    await db.appSettings.update('singleton', { autoBackupEnabled: enabled })
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Backup &amp; Restore</h1>

      <section className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="mb-2 font-medium">Manual backup</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Saves the full catalog, inventory, and transaction history to a file on this device — independent of and in
          addition to any future online sync. This only protects against losing this device; it doesn't get data
          anywhere else on its own.
        </p>
        <Button onClick={handleExportNow} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Backup Now'}
        </Button>
        {lastBackup && (
          <p className="mt-2 text-xs text-zinc-400">
            Last backup: {new Date(lastBackup.at).toLocaleString()} ({lastBackup.filename})
          </p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="mb-2 font-medium">Automatic backup</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Runs automatically in the background — after this many completed sales, or this many minutes, whichever
          comes first. Uses a plain file download, so each auto-backup lands as a new file in Downloads.
        </p>
        <CheckboxField
          label="Auto-backup enabled"
          checked={autoBackupEnabled}
          onChange={(e) => toggleAutoBackup(e.target.checked)}
        />
        <div className={`flex flex-wrap gap-4 ${autoBackupEnabled ? '' : 'opacity-40'}`}>
          <NumberField
            label="Every N transactions"
            min={1}
            step={1}
            disabled={!autoBackupEnabled}
            value={settings?.backupTxnInterval ?? ''}
            onChange={(v) => updateInterval('backupTxnInterval', v)}
          />
          <NumberField
            label="Every N minutes"
            min={1}
            step={1}
            disabled={!autoBackupEnabled}
            value={settings?.backupMinuteInterval ?? ''}
            onChange={(v) => updateInterval('backupMinuteInterval', v)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="mb-2 font-medium">Restore from backup</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Replaces everything currently in the app — catalog, inventory, and transaction history — with the contents
          of the backup file. Use this to recover after a device failure, or to move onto a different device.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFileSelected(file)
            e.target.value = ''
          }}
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Choose Backup File…
        </Button>
        {restoreError && <p className="mt-2 text-sm text-red-600">{restoreError}</p>}
      </section>

      {pendingRestore && (
        <Modal open title="Restore from backup?" onClose={() => setPendingRestore(null)}>
          <p className="mb-2 text-sm">
            This backup was exported <strong>{new Date(pendingRestore.exportedAt).toLocaleString()}</strong>.
          </p>
          <p className="mb-4 text-sm text-red-600">
            Restoring will permanently replace everything currently in this app — catalog, inventory, and all
            transaction history — with this backup's contents. This can't be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingRestore(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRestore} disabled={restoring}>
              {restoring ? 'Restoring…' : 'Restore'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
