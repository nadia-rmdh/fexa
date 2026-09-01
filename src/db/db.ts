import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  Fandom,
  CharacterVariant,
  Item,
  ImageBlob,
  BundleRule,
  Event,
  EventInventory,
  Transaction,
  AppSettings,
} from './schema-types'

export class AppDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  fandoms!: EntityTable<Fandom, 'id'>
  characters!: EntityTable<CharacterVariant, 'id'>
  items!: EntityTable<Item, 'id'>
  images!: EntityTable<ImageBlob, 'id'>
  bundleRules!: EntityTable<BundleRule, 'id'>
  events!: EntityTable<Event, 'id'>
  eventInventory!: EntityTable<EventInventory, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  appSettings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('art-market-pos')

    this.version(1).stores({
      categories: 'id, sortOrder, active',
      fandoms: 'id, sortOrder, active',
      characters: 'id, fandomId, sortOrder, active',
      items: 'id, &[categoryId+fandomId+characterId], categoryId, fandomId, characterId, active',
      images: 'id',
      bundleRules: 'id, type, active',
      events: 'id, status, startedAt',
      eventInventory: 'id, eventId, itemId, &[eventId+itemId]',
      transactions: 'id, eventId, timestamp, synced',
      appSettings: 'id',
    })

    // v2: multiple items can now share the same Category+Fandom+Character (distinct
    // physical designs of the same character) — drop the uniqueness constraint on that
    // combo, keep it as a plain (non-unique) index for lookups.
    this.version(2).stores({
      categories: 'id, sortOrder, active',
      fandoms: 'id, sortOrder, active',
      characters: 'id, fandomId, sortOrder, active',
      items: 'id, [categoryId+fandomId+characterId], categoryId, fandomId, characterId, active',
      images: 'id',
      bundleRules: 'id, type, active',
      events: 'id, status, startedAt',
      eventInventory: 'id, eventId, itemId, &[eventId+itemId]',
      transactions: 'id, eventId, timestamp, synced',
      appSettings: 'id',
    })
  }
}

export const db = new AppDatabase()

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'singleton',
  defaultLowStockThreshold: 5,
  currency: 'IDR',
  backupTxnInterval: 5,
  backupMinuteInterval: 15,
  autoBackupEnabled: true,
}

/** Ensures the singleton settings row exists. Safe to call on every app boot. */
export async function ensureAppSettings(): Promise<AppSettings> {
  const existing = await db.appSettings.get('singleton')
  if (existing) return existing
  await db.appSettings.add(DEFAULT_APP_SETTINGS)
  return DEFAULT_APP_SETTINGS
}
