import type { BuyNGet1FreeRule } from '@/db/schema-types'
import type { CartUnit, FreeApplication } from './types'

/**
 * Independent stacking pass, per the spec's explicit exception: buy-N-get-1-free
 * applies on top of whatever exclusive bundle grouping was chosen — a unit already
 * inside a flat-price group can *also* be nominated free here. The cheapest eligible
 * unit in the category is the one freed (per user preference, standard retail
 * convention — swap the sort order here if that convention ever needs to flip).
 */
export function applyBuyNGet1Free(units: CartUnit[], rules: BuyNGet1FreeRule[]): FreeApplication[] {
  const applications: FreeApplication[] = []

  for (const rule of rules) {
    if (!rule.active) continue
    const inCategory = units.filter((u) => u.categoryId === rule.categoryId).sort((a, b) => a.unitPrice - b.unitPrice)
    const freeCount = Math.floor(inCategory.length / (rule.n + 1))
    for (const unit of inCategory.slice(0, freeCount)) {
      applications.push({
        ruleId: rule.id,
        ruleName: rule.name,
        instanceId: unit.instanceId,
        amount: unit.unitPrice,
      })
    }
  }

  return applications
}
