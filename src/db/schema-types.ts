// Catalog (persists across events)

export interface Category {
  id: string
  name: string
  sortOrder: number
  active: boolean
}

export interface Fandom {
  id: string
  name: string
  thumbnailImageId?: string
  sortOrder: number
  active: boolean
}

export interface CharacterVariant {
  id: string
  fandomId: string
  name: string
  thumbnailImageId?: string
  sortOrder: number
  active: boolean
}

export interface Item {
  id: string
  categoryId: string
  fandomId: string
  characterId: string
  /** distinguishes multiple physical products sharing the same Category+Fandom+
   *  Character (e.g. two different Zhongli keychain designs) — undefined for the
   *  common case of a single design. Never affects bundle-rule matching, which only
   *  ever looks at category/character. */
  variantLabel?: string
  /** integer minor currency units (e.g. cents) — never store floats */
  unitPrice: number
  /** undefined => fall back to appSettings.defaultLowStockThreshold */
  lowStockThreshold?: number
  thumbnailImageId?: string
  active: boolean
  createdAt: number
  updatedAt: number
}

export interface ImageBlob {
  id: string
  blob: Blob
  mimeType: string
}

// Bundle rules

export type BundleRuleType =
  | 'quantity_in_category'
  | 'cross_category_variant_matched'
  | 'character_full_set'
  | 'buy_n_get_1_free'

interface BundleRuleBase {
  id: string
  name: string
  type: BundleRuleType
  active: boolean
  createdAt: number
  updatedAt: number
}

export interface QuantityInCategoryRule extends BundleRuleBase {
  type: 'quantity_in_category'
  categoryId: string
  quantity: number
  bundlePrice: number
}

export interface CrossCategoryVariantMatchedRule extends BundleRuleBase {
  type: 'cross_category_variant_matched'
  /** categories that must all share one literal matched character (from allowedCharacterIds) */
  categoryIds: string[]
  allowedCharacterIds: string[]
  /** categories that just need 1 unit of ANY character — e.g. a generic zine that isn't
   *  tied to a specific character but still pairs with a character-matched keychain.
   *  Must not overlap with categoryIds. */
  genericCategoryIds?: string[]
  bundlePrice: number
}

export interface CharacterFullSetRule extends BundleRuleBase {
  type: 'character_full_set'
  categoryIds: string[]
  bundlePrice: number
}

export interface BuyNGet1FreeRule extends BundleRuleBase {
  type: 'buy_n_get_1_free'
  categoryId: string
  n: number
}

export type BundleRule =
  | QuantityInCategoryRule
  | CrossCategoryVariantMatchedRule
  | CharacterFullSetRule
  | BuyNGet1FreeRule

// Event-scoped data (reset per event; catalog above is untouched)

export interface Event {
  id: string
  name: string
  startedAt: number
  endedAt?: number
  status: 'active' | 'closed'
}

export interface EventInventory {
  /** `${eventId}_${itemId}` */
  id: string
  eventId: string
  itemId: string
  stockQty: number
  startingQty: number
}

// Transactions

export interface TransactionLine {
  itemId: string
  // denormalized snapshot — catalog rows can change/be deleted after the sale,
  // but historical reports must stay accurate to what was actually sold
  categoryId: string
  fandomId: string
  characterId: string
  variantLabel?: string
  unitPriceAtSale: number
  bundleGroupId?: string
  bundleRuleId?: string
  bundleRuleName?: string
  isFreeFromBuyNGet1FreeRuleId?: string
  lineRevenue: number
}

export interface Transaction {
  id: string
  eventId: string
  timestamp: number
  paymentMethod: 'cash' | 'qr'
  totalPrice: number
  lines: TransactionLine[]
  synced: 0 | 1
  syncedAt?: number
  /** Cash-only, optional: what the customer physically handed over. Undefined means
   *  they gave exact change — no cashReceived/changeDue to show on the receipt. */
  cashReceived?: number
  changeDue?: number
}

// Settings

export interface AppSettings {
  id: 'singleton'
  defaultLowStockThreshold: number
  currency: string
  googleSheetsSpreadsheetId?: string
  /** auto-backup after this many transactions since the last export */
  backupTxnInterval: number
  /** auto-backup after this many minutes since the last export */
  backupMinuteInterval: number
  /** undefined is treated as true — existing installs from before this field existed
   *  default to auto-backup staying on, matching prior behavior. */
  autoBackupEnabled?: boolean
}
