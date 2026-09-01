import { db } from '@/db/db'
import { exportBackup } from './backupExport'
import { useUiStore } from '@/stores/uiStore'

const CHECK_INTERVAL_MS = 60_000

let transactionsSinceBackup = 0
let lastBackupAt = Date.now()
let checkTimer: ReturnType<typeof setInterval> | null = null
let running = false

async function runAutoBackup() {
  if (running) return
  running = true
  try {
    const result = await exportBackup(false)
    transactionsSinceBackup = 0
    lastBackupAt = Date.now()
    useUiStore.getState().setLastBackup({ filename: result.filename, at: lastBackupAt, method: result.method })
  } finally {
    running = false
  }
}

async function checkTriggers() {
  const settings = await db.appSettings.get('singleton')
  if (settings?.autoBackupEnabled === false) return

  const txnThreshold = settings?.backupTxnInterval ?? 5
  const minuteThreshold = settings?.backupMinuteInterval ?? 15

  const dueByCount = transactionsSinceBackup >= txnThreshold
  const dueByTime = Date.now() - lastBackupAt >= minuteThreshold * 60_000

  if (dueByCount || dueByTime) await runAutoBackup()
}

/** Starts the periodic time-based check. Call once at app boot. */
export function startBackupScheduler() {
  if (checkTimer) return
  checkTimer = setInterval(() => void checkTriggers(), CHECK_INTERVAL_MS)
}

/** Call after every completed sale — trips the transaction-count trigger. */
export function notifyTransactionCompleted() {
  transactionsSinceBackup += 1
  void checkTriggers()
}
