import type {
  BundleRule,
  BuyNGet1FreeRule,
  CharacterFullSetRule,
  CrossCategoryVariantMatchedRule,
  QuantityInCategoryRule,
} from '@/db/schema-types'
import type { CartUnit } from './types'

let counter = 0
const nextId = (prefix: string) => `${prefix}-${counter++}`

export function unit(categoryId: string, characterId: string, unitPrice: number): CartUnit {
  return { instanceId: nextId('unit'), itemId: nextId('item'), categoryId, characterId, unitPrice }
}

export function quantityRule(categoryId: string, quantity: number, bundlePrice: number, overrides: Partial<QuantityInCategoryRule> = {}): QuantityInCategoryRule {
  return {
    id: nextId('rule'),
    name: `Quantity ${quantity}x ${categoryId}`,
    type: 'quantity_in_category',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    categoryId,
    quantity,
    bundlePrice,
    ...overrides,
  }
}

export function crossRule(
  categoryIds: string[],
  allowedCharacterIds: string[],
  bundlePrice: number,
  overrides: Partial<CrossCategoryVariantMatchedRule> = {},
): CrossCategoryVariantMatchedRule {
  return {
    id: nextId('rule'),
    name: `Cross ${categoryIds.join('+')}`,
    type: 'cross_category_variant_matched',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    categoryIds,
    allowedCharacterIds,
    bundlePrice,
    ...overrides,
  }
}

export function fullSetRule(categoryIds: string[], bundlePrice: number, overrides: Partial<CharacterFullSetRule> = {}): CharacterFullSetRule {
  return {
    id: nextId('rule'),
    name: `Full set ${categoryIds.join('+')}`,
    type: 'character_full_set',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    categoryIds,
    bundlePrice,
    ...overrides,
  }
}

export function buyNRule(categoryId: string, n: number, overrides: Partial<BuyNGet1FreeRule> = {}): BuyNGet1FreeRule {
  return {
    id: nextId('rule'),
    name: `Buy ${n} get 1 free ${categoryId}`,
    type: 'buy_n_get_1_free',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    categoryId,
    n,
    ...overrides,
  }
}

type ExclusiveRule = QuantityInCategoryRule | CrossCategoryVariantMatchedRule | CharacterFullSetRule

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (items.length < k) return []
  const [first, ...rest] = items
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

/** Exhaustive (exponential) reference solver — only for small test inputs. Tries every
 *  valid bundle instance touching the first unassigned unit, or leaves it à la carte,
 *  and recurses; returns the true minimum price. Used to validate the optimized solver. */
export function bruteForceExclusivePrice(units: CartUnit[], rules: BundleRule[]): number {
  const exclusiveRules = rules.filter((r): r is ExclusiveRule => r.active && r.type !== 'buy_n_get_1_free')

  function helper(remaining: CartUnit[]): number {
    if (remaining.length === 0) return 0
    const [first, ...rest] = remaining
    let best = first.unitPrice + helper(rest)

    for (const rule of exclusiveRules) {
      if (rule.type === 'quantity_in_category') {
        if (first.categoryId !== rule.categoryId) continue
        const candidates = rest.filter((u) => u.categoryId === rule.categoryId)
        for (const combo of combinations(candidates, rule.quantity - 1)) {
          const usedIds = new Set([first.instanceId, ...combo.map((u) => u.instanceId)])
          const newRemaining = rest.filter((u) => !usedIds.has(u.instanceId))
          best = Math.min(best, rule.bundlePrice + helper(newRemaining))
        }
      } else {
        const genericCategoryIds = rule.type === 'cross_category_variant_matched' ? (rule.genericCategoryIds ?? []) : []
        const firstIsMatched = rule.categoryIds.includes(first.categoryId)
        const firstIsGeneric = genericCategoryIds.includes(first.categoryId)
        if (!firstIsMatched && !firstIsGeneric) continue

        // Which character anchors this bundle instance: if `first` sits in a matched
        // category, it supplies the anchor directly (as before). But `first` might only
        // be in a *generic* category (e.g. it's the Zine, and the rule's real anchor is
        // whichever character the Keychain turns out to be) — in that case `first`
        // carries no character constraint of its own, so every allowed character has to
        // be tried as a hypothesis. Without this, a generic-category unit that appears
        // earlier than its matched partner in the array could never be recognized as
        // "reserved for a bundle" and would be forced to à la carte with no way back.
        const candidateCharacters = firstIsMatched
          ? [first.characterId]
          : rule.type === 'cross_category_variant_matched'
            ? rule.allowedCharacterIds
            : []

        function enumerateGenericCombos(categoryIds: string[], used: Set<string>): CartUnit[][] {
          if (categoryIds.length === 0) return [[]]
          const [firstCat, ...restCats] = categoryIds
          const candidates = rest.filter((u) => u.categoryId === firstCat && !used.has(u.instanceId))
          const results: CartUnit[][] = []
          for (const candidate of candidates) {
            const nextUsed = new Set(used)
            nextUsed.add(candidate.instanceId)
            for (const restCombo of enumerateGenericCombos(restCats, nextUsed)) {
              results.push([candidate, ...restCombo])
            }
          }
          return results
        }

        for (const anchorCharacter of candidateCharacters) {
          if (rule.type === 'cross_category_variant_matched' && !rule.allowedCharacterIds.includes(anchorCharacter)) continue

          const usedSoFar = new Set<string>([first.instanceId])
          const remainingMatchedCategories = rule.categoryIds.filter((c) => !(firstIsMatched && c === first.categoryId))
          let ok = true
          for (const categoryId of remainingMatchedCategories) {
            const match = rest.find(
              (u) => u.categoryId === categoryId && u.characterId === anchorCharacter && !usedSoFar.has(u.instanceId),
            )
            if (!match) {
              ok = false
              break
            }
            usedSoFar.add(match.instanceId)
          }
          if (!ok) continue

          const remainingGenericCategories = genericCategoryIds.filter((c) => !(firstIsGeneric && c === first.categoryId))
          for (const genericPick of enumerateGenericCombos(remainingGenericCategories, usedSoFar)) {
            const usedIds = new Set([...usedSoFar, ...genericPick.map((u) => u.instanceId)])
            const newRemaining = rest.filter((u) => !usedIds.has(u.instanceId))
            best = Math.min(best, rule.bundlePrice + helper(newRemaining))
          }
        }
      }
    }

    return best
  }

  return helper(units)
}

/** Deterministic PRNG so randomized property tests are reproducible on failure. */
export function mulberry32(seed: number) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
