import type {
  BundleRule,
  CharacterFullSetRule,
  CrossCategoryVariantMatchedRule,
  QuantityInCategoryRule,
} from '@/db/schema-types'
import type { CartUnit, BundleGroup } from './types'

/** Rules this module ever operates on — buy_n_get_1_free is handled separately (see buy-n-get-1.ts). */
type ExclusiveRule = QuantityInCategoryRule | CrossCategoryVariantMatchedRule | CharacterFullSetRule

const UNCONTESTED_CHARACTER: null = null

/** A group of interchangeable units: either "this exact character in this category"
 *  (contested — its identity matters to some rule) or "any leftover character in this
 *  category that no rule cares about" (the uncontested pool, one per category). */
interface TypeDef {
  key: string
  categoryId: string
  characterId: string | null
  /** instanceIds in consumption order: highest price first, so a flat-price bundle
   *  always prefers to swallow the priciest uncontested filler (see partition-search notes). */
  instanceIds: string[]
  prices: number[]
  total: number
}

type CountState = Record<string, number>

interface SolveResult {
  price: number
  groups: BundleGroup[]
  leftoverInstanceIds: string[]
}

const contestedKey = (categoryId: string, characterId: string) => `c:${categoryId}::${characterId}`
const uncontestedKey = (categoryId: string) => `u:${categoryId}`

function isContestedPair(categoryId: string, characterId: string, rules: BundleRule[]): boolean {
  return rules.some((rule) => {
    if (rule.type === 'cross_category_variant_matched') {
      return rule.categoryIds.includes(categoryId) && rule.allowedCharacterIds.includes(characterId)
    }
    if (rule.type === 'character_full_set') {
      return rule.categoryIds.includes(categoryId)
    }
    return false
  })
}

function buildTypes(units: CartUnit[], rules: BundleRule[]): Map<string, TypeDef> {
  const byContestedKey = new Map<string, { categoryId: string; characterId: string; units: CartUnit[] }>()
  const byUncontestedCategory = new Map<string, CartUnit[]>()

  for (const unit of units) {
    if (isContestedPair(unit.categoryId, unit.characterId, rules)) {
      const key = contestedKey(unit.categoryId, unit.characterId)
      const entry = byContestedKey.get(key) ?? { categoryId: unit.categoryId, characterId: unit.characterId, units: [] }
      entry.units.push(unit)
      byContestedKey.set(key, entry)
    } else {
      const list = byUncontestedCategory.get(unit.categoryId) ?? []
      list.push(unit)
      byUncontestedCategory.set(unit.categoryId, list)
    }
  }

  const types = new Map<string, TypeDef>()

  // Keep the FULL count for each contested type — a matched rule only ever consumes
  // one unit per instance, but multiple units of the same character can still form
  // *multiple* bundle instances (e.g. two sticker+zine full-sets for the same
  // character), and applyQuantityRule's distribution search needs the true count to
  // correctly weigh pairing two contested units together against using free-pool filler.
  //
  // Sorted highest-price-first, same as the uncontested pool below. This isn't just
  // cosmetic: the solver's state is a plain per-type COUNT, so `applyQuantityRule` can
  // only ever consume a contiguous prefix of "whichever instances are still left" — it
  // has no way to skip over a specific instance while holding others back. With 3+
  // same-character instances at different prices (multiple item designs can now share
  // one character) and an unsorted array, that can make the truly-optimal 2-of-3
  // selection unreachable — e.g. array [30,10,20] can only ever yield {30,10} or {10,20}
  // as a prefix, never the actually-best {30,20}. Sorting descending first guarantees
  // "take the next N" is always the N highest-priced instances.
  for (const [key, { categoryId, characterId, units: list }] of byContestedKey) {
    const sorted = [...list].sort((a, b) => b.unitPrice - a.unitPrice)
    types.set(key, {
      key,
      categoryId,
      characterId,
      instanceIds: sorted.map((u) => u.instanceId),
      prices: sorted.map((u) => u.unitPrice),
      total: sorted.length,
    })
  }

  for (const [categoryId, list] of byUncontestedCategory) {
    const sorted = [...list].sort((a, b) => b.unitPrice - a.unitPrice)
    types.set(uncontestedKey(categoryId), {
      key: uncontestedKey(categoryId),
      categoryId,
      characterId: UNCONTESTED_CHARACTER,
      instanceIds: sorted.map((u) => u.instanceId),
      prices: sorted.map((u) => u.unitPrice),
      total: sorted.length,
    })
  }

  return types
}

function groupRulesByCategory(rules: ExclusiveRule[]): Map<string, ExclusiveRule[]> {
  const map = new Map<string, ExclusiveRule[]>()
  const add = (categoryId: string, rule: ExclusiveRule) => {
    const list = map.get(categoryId) ?? []
    list.push(rule)
    map.set(categoryId, list)
  }
  for (const rule of rules) {
    if (rule.type === 'quantity_in_category') add(rule.categoryId, rule)
    else if (rule.type === 'cross_category_variant_matched' || rule.type === 'character_full_set') {
      for (const categoryId of rule.categoryIds) add(categoryId, rule)
      // A generic category must also be registered here: `solve()` only ever tries a
      // rule against whichever type `pickNextType` pins next, and pinning order depends
      // on key string sort (categoryId+characterId), not on matched-vs-generic role. If
      // a generic-category unit gets pinned before its matched partner, the rule still
      // needs to be found — otherwise it silently never fires whenever a generic
      // category's UUID happens to sort before its matched category's UUID.
      if (rule.type === 'cross_category_variant_matched') {
        for (const categoryId of rule.genericCategoryIds ?? []) add(categoryId, rule)
      }
    }
  }
  return map
}

function canonicalKey(state: CountState): string {
  return Object.keys(state)
    .filter((k) => state[k] > 0)
    .sort()
    .map((k) => `${k}=${state[k]}`)
    .join(',')
}

function pickNextType(state: CountState): string | null {
  const keys = Object.keys(state)
    .filter((k) => state[k] > 0)
    .sort()
  return keys[0] ?? null
}

/** All ways to distribute `total` units across `available[i]`-capped buckets. */
function enumerateDistributions(total: number, available: number[]): number[][] {
  if (available.length === 0) return total === 0 ? [[]] : []
  const [first, ...rest] = available
  const results: number[][] = []
  for (let take = 0; take <= Math.min(first, total); take++) {
    for (const tail of enumerateDistributions(total - take, rest)) {
      results.push([take, ...tail])
    }
  }
  return results
}

function applyQuantityRule(
  rule: QuantityInCategoryRule,
  state: CountState,
  categoryTypes: TypeDef[],
  pinnedKey: string,
): CountState[] {
  const pinned = categoryTypes.find((t) => t.key === pinnedKey)
  if (!pinned || rule.quantity < 1) return []

  const avail: Record<string, number> = {}
  for (const t of categoryTypes) avail[t.key] = state[t.key] ?? 0

  // pinned always contributes its mandatory 1 unit — it's the specific unit under
  // consideration at this recursive step. The remaining (quantity - 1) slots are then
  // filled by exhaustively enumerating how many come from EACH type in the category
  // (pinned included, if it has more left after its own mandatory unit) — never
  // greedily maximizing any one type first. A greedy "always prefer the free pool"
  // shortcut looks safe locally but isn't: pairing two reserved contested units
  // together can free up a *second* profitable bundle instance from what's left,
  // which a greedy free-pool-first rule would never discover.
  avail[pinned.key] -= 1
  if (avail[pinned.key] < 0) return []
  const remainingNeeded = rule.quantity - 1

  const distributionAvail = categoryTypes.map((t) => avail[t.key])
  const distributions = enumerateDistributions(remainingNeeded, distributionAvail)
  if (distributions.length === 0) return []

  return distributions.map((dist) => {
    const consumed: CountState = { [pinned.key]: 1 }
    categoryTypes.forEach((t, i) => {
      if (dist[i] > 0) consumed[t.key] = (consumed[t.key] ?? 0) + dist[i]
    })
    return consumed
  })
}

/** All ways to pick exactly 1 unit from EACH of `categoryIds`, any type/character within
 *  that category — the cross product of "which type supplies this category's unit"
 *  across every generic category. Returns every combination (not a greedy pick) because
 *  which type fills a character-agnostic slot can still change what's left over for
 *  everything else, same reasoning as enumerateDistributions above. */
function enumerateGenericPicks(categoryIds: string[], typesByCategory: Map<string, TypeDef[]>, state: CountState): CountState[] {
  if (categoryIds.length === 0) return [{}]
  const [first, ...rest] = categoryIds
  const availableTypes = (typesByCategory.get(first) ?? []).filter((t) => (state[t.key] ?? 0) > 0)
  if (availableTypes.length === 0) return []

  const restPicks = enumerateGenericPicks(rest, typesByCategory, state)
  const results: CountState[] = []
  for (const type of availableTypes) {
    for (const restPick of restPicks) {
      results.push({ [type.key]: 1, ...restPick })
    }
  }
  return results
}

function applyMatchedRule(
  rule: CrossCategoryVariantMatchedRule | CharacterFullSetRule,
  state: CountState,
  pinned: TypeDef,
  typesByCategory: Map<string, TypeDef[]>,
): CountState[] {
  const genericCategoryIds = rule.type === 'cross_category_variant_matched' ? (rule.genericCategoryIds ?? []) : []
  const pinnedIsMatched = rule.categoryIds.includes(pinned.categoryId)
  const pinnedIsGeneric = genericCategoryIds.includes(pinned.categoryId)
  if (!pinnedIsMatched && !pinnedIsGeneric) return []
  if (pinnedIsMatched && pinned.characterId === UNCONTESTED_CHARACTER) return []

  // Which character anchors this bundle instance: if `pinned` sits in a matched
  // category, it supplies the anchor directly. But `pinned` might only be in a
  // *generic* category (e.g. it's the Zine, and the rule's real anchor is whichever
  // character the Keychain turns out to be) — a generic unit carries no character
  // constraint of its own, so every allowed character has to be tried as a hypothesis.
  // Without this, whenever a generic-category unit's key happens to sort before its
  // matched partner's, this rule would never even be attempted from that recursion node.
  const candidateCharacters = pinnedIsMatched
    ? [pinned.characterId!]
    : rule.type === 'cross_category_variant_matched'
      ? rule.allowedCharacterIds
      : []

  const results: CountState[] = []
  for (const anchorCharacter of candidateCharacters) {
    if (rule.type === 'cross_category_variant_matched' && !rule.allowedCharacterIds.includes(anchorCharacter)) continue

    const remainingMatchedCategories = rule.categoryIds.filter((c) => !(pinnedIsMatched && c === pinned.categoryId))
    const requiredKeys = remainingMatchedCategories.map((categoryId) => contestedKey(categoryId, anchorCharacter))
    if (requiredKeys.some((key) => (state[key] ?? 0) < 1)) continue

    const remainingGenericCategories = genericCategoryIds.filter((c) => !(pinnedIsGeneric && c === pinned.categoryId))
    const genericPicks = enumerateGenericPicks(remainingGenericCategories, typesByCategory, state)
    if (genericPicks.length === 0) continue // some generic category has nothing available

    for (const pick of genericPicks) {
      const consumed: CountState = { ...pick, [pinned.key]: (pick[pinned.key] ?? 0) + 1 }
      for (const key of requiredKeys) consumed[key] = (consumed[key] ?? 0) + 1
      results.push(consumed)
    }
  }
  return results
}

export function solveExclusivePartition(units: CartUnit[], rules: BundleRule[]): SolveResult {
  if (units.length === 0) return { price: 0, groups: [], leftoverInstanceIds: [] }

  const exclusiveRules = rules.filter(
    (r): r is ExclusiveRule => r.active && r.type !== 'buy_n_get_1_free',
  )
  const types = buildTypes(units, exclusiveRules)
  const typesByCategory = new Map<string, TypeDef[]>()
  for (const t of types.values()) {
    const list = typesByCategory.get(t.categoryId) ?? []
    list.push(t)
    typesByCategory.set(t.categoryId, list)
  }
  const rulesByCategory = groupRulesByCategory(exclusiveRules)

  const initialState: CountState = {}
  for (const t of types.values()) initialState[t.key] = t.total

  const memo = new Map<string, SolveResult>()

  function consumedIndexOf(type: TypeDef, state: CountState): number {
    return type.total - (state[type.key] ?? 0)
  }

  function decrementMap(state: CountState, delta: CountState): CountState {
    const next = { ...state }
    for (const [key, amount] of Object.entries(delta)) next[key] = (next[key] ?? 0) - amount
    return next
  }

  function buildGroup(rule: ExclusiveRule, consumed: CountState, state: CountState): BundleGroup {
    const unitInstanceIds: string[] = []
    for (const [key, amount] of Object.entries(consumed)) {
      const type = types.get(key)!
      const startIndex = consumedIndexOf(type, state)
      unitInstanceIds.push(...type.instanceIds.slice(startIndex, startIndex + amount))
    }
    return {
      id: `${rule.id}:${unitInstanceIds.join('|')}`,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type as BundleGroup['ruleType'],
      unitInstanceIds,
      price: rule.bundlePrice,
    }
  }

  function solve(state: CountState): SolveResult {
    const key = canonicalKey(state)
    const cached = memo.get(key)
    if (cached) return cached

    const pinnedKey = pickNextType(state)
    if (!pinnedKey) {
      const result: SolveResult = { price: 0, groups: [], leftoverInstanceIds: [] }
      memo.set(key, result)
      return result
    }

    const pinned = types.get(pinnedKey)!
    const unitIndex = consumedIndexOf(pinned, state)
    const unitPrice = pinned.prices[unitIndex]
    const unitInstanceId = pinned.instanceIds[unitIndex]

    const aLaCarteSub = solve(decrementMap(state, { [pinnedKey]: 1 }))
    let best: SolveResult = {
      price: unitPrice + aLaCarteSub.price,
      groups: aLaCarteSub.groups,
      leftoverInstanceIds: [unitInstanceId, ...aLaCarteSub.leftoverInstanceIds],
    }

    for (const rule of rulesByCategory.get(pinned.categoryId) ?? []) {
      const ways: CountState[] =
        rule.type === 'quantity_in_category'
          ? applyQuantityRule(rule, state, typesByCategory.get(pinned.categoryId) ?? [], pinnedKey)
          : applyMatchedRule(rule, state, pinned, typesByCategory)

      for (const consumed of ways) {
        const group = buildGroup(rule, consumed, state)
        const sub = solve(decrementMap(state, consumed))
        const candidatePrice = rule.bundlePrice + sub.price
        if (candidatePrice < best.price) {
          best = {
            price: candidatePrice,
            groups: [...sub.groups, group],
            leftoverInstanceIds: sub.leftoverInstanceIds,
          }
        }
      }
    }

    memo.set(key, best)
    return best
  }

  return solve(initialState)
}
