import type { BundleRule } from '@/db/schema-types'

/** One physical unit in the cart. Bundle rules only ever key off category + character
 *  (never fandom), so this is the full slice of item data the engine needs. */
export interface CartUnit {
  instanceId: string
  itemId: string
  categoryId: string
  characterId: string
  unitPrice: number
}

export interface BundleGroup {
  id: string
  ruleId: string
  ruleName: string
  ruleType: Exclude<BundleRule['type'], 'buy_n_get_1_free'>
  unitInstanceIds: string[]
  price: number
}

export interface FreeApplication {
  ruleId: string
  ruleName: string
  instanceId: string
  amount: number
}

export interface BundleSolution {
  groups: BundleGroup[]
  /** unit instanceIds sold à la carte — not part of any exclusive bundle group */
  leftoverInstanceIds: string[]
  freeApplications: FreeApplication[]
  /** sum of group prices + leftover unit prices, before buy-N-get-1-free rebates */
  subtotal: number
  /** subtotal minus buy-N-get-1-free rebates — what the customer actually pays */
  totalPrice: number
}

export { type BundleRule }
