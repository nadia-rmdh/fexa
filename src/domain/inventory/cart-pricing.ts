import { db } from '@/db/db'
import { solve } from '@/domain/bundle-engine'
import type { CartUnit, BundleSolution } from '@/domain/bundle-engine'
import type { Item } from '@/db/schema-types'

export interface CartLine {
  itemId: string
  quantity: number
}

export function expandCartLinesToUnits(lines: CartLine[], itemById: Map<string, Item>): CartUnit[] {
  const units: CartUnit[] = []
  let counter = 0
  for (const line of lines) {
    const item = itemById.get(line.itemId)
    if (!item) continue
    for (let i = 0; i < line.quantity; i++) {
      units.push({
        instanceId: `${line.itemId}#${counter++}`,
        itemId: item.id,
        categoryId: item.categoryId,
        characterId: item.characterId,
        unitPrice: item.unitPrice,
      })
    }
  }
  return units
}

const EMPTY_SOLUTION: BundleSolution = {
  groups: [],
  leftoverInstanceIds: [],
  freeApplications: [],
  subtotal: 0,
  totalPrice: 0,
}

export interface CartPricingResult {
  solution: BundleSolution
  units: CartUnit[]
  itemById: Map<string, Item>
}

/** Re-reads current catalog items and active bundle rules from Dexie and runs the
 *  bundle engine — called fresh on every cart mutation so the live preview and the
 *  final checkout always price against up-to-date data, not stale cached state. */
export async function computeCartPricing(lines: CartLine[]): Promise<CartPricingResult> {
  if (lines.length === 0) return { solution: EMPTY_SOLUTION, units: [], itemById: new Map() }

  const items = await db.items.bulkGet(lines.map((l) => l.itemId))
  const itemById = new Map(items.filter((i): i is Item => !!i).map((i) => [i.id, i]))

  const units = expandCartLinesToUnits(lines, itemById)
  const rules = (await db.bundleRules.toArray()).filter((r) => r.active)
  const solution = solve(units, rules)

  return { solution, units, itemById }
}
