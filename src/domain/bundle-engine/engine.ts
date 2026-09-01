import type { BundleRule, BuyNGet1FreeRule } from '@/db/schema-types'
import type { CartUnit, BundleSolution } from './types'
import { solveExclusivePartition } from './partition-search'
import { applyBuyNGet1Free } from './buy-n-get-1'

export function solve(units: CartUnit[], rules: BundleRule[]): BundleSolution {
  const exclusive = solveExclusivePartition(units, rules)

  const buyNRules = rules.filter((r): r is BuyNGet1FreeRule => r.active && r.type === 'buy_n_get_1_free')
  const freeApplications = applyBuyNGet1Free(units, buyNRules)

  const rebate = freeApplications.reduce((sum, f) => sum + f.amount, 0)

  return {
    groups: exclusive.groups,
    leftoverInstanceIds: exclusive.leftoverInstanceIds,
    freeApplications,
    subtotal: exclusive.price,
    totalPrice: exclusive.price - rebate,
  }
}
