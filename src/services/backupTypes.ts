import type {
  AppSettings,
  BundleRule,
  Category,
  CharacterVariant,
  Event,
  EventInventory,
  Fandom,
  Item,
  Transaction,
} from '@/db/schema-types'

/** Images can't hold a Blob in JSON, so the backup stores each as a base64 data URL. */
export interface SerializedImage {
  id: string
  mimeType: string
  dataUrl: string
}

export interface BackupData {
  categories: Category[]
  fandoms: Fandom[]
  characters: CharacterVariant[]
  items: Item[]
  images: SerializedImage[]
  bundleRules: BundleRule[]
  events: Event[]
  eventInventory: EventInventory[]
  transactions: Transaction[]
  appSettings: AppSettings[]
}

export const BACKUP_FORMAT_VERSION = 1

export interface BackupFile {
  version: number
  exportedAt: number
  data: BackupData
}
