import { describe, expect, it } from 'vitest'
import { solveExclusivePartition } from './partition-search'
import { bruteForceExclusivePrice, crossRule, fullSetRule, mulberry32, quantityRule, unit } from './test-helpers'

describe('solveExclusivePartition', () => {
  it('returns zero for an empty cart', () => {
    expect(solveExclusivePartition([], []).price).toBe(0)
  })

  it('sells a single item à la carte when no rule applies', () => {
    const units = [unit('keychain', 'zhongli', 15000)]
    expect(solveExclusivePartition(units, []).price).toBe(15000)
  })

  it('applies a flat quantity-in-category bundle, preferring the highest-priced units as filler', () => {
    const rule = quantityRule('keychain', 2, 25)
    const units = [unit('keychain', 'a', 10), unit('keychain', 'b', 20), unit('keychain', 'c', 30)]
    const result = solveExclusivePartition(units, [rule])
    // optimal: bundle the 20+30 units (price 25), leave the 10 à la carte => 35
    expect(result.price).toBe(35)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].price).toBe(25)
  })

  it('picks the cheaper of two competing bundles even when the other bundle "looks bigger"', () => {
    // Matches the requirements doc's own callout: the biggest-looking bundle can be the worse deal.
    const fullSet = fullSetRule(['keychain', 'pin', 'sticker'], 50) // 3-category set, any character
    const cross = crossRule(['keychain', 'zine'], ['x'], 80) // 2-category set, character x only

    const units = [
      unit('keychain', 'x', 30),
      unit('pin', 'x', 25),
      unit('sticker', 'x', 20),
      unit('zine', 'x', 40),
    ]
    // à la carte would be 115. Full-set (50) + leftover zine (40) = 90.
    // Cross-category (80) + leftover pin+sticker (45) = 125 — worse despite the bigger flat price.
    const result = solveExclusivePartition(units, [fullSet, cross])
    expect(result.price).toBe(90)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].ruleType).toBe('character_full_set')
  })

  it('character full-set applies to any character, not just one', () => {
    const rule = fullSetRule(['keychain', 'pin'], 40)
    const units = [
      unit('keychain', 'zhongli', 25),
      unit('pin', 'zhongli', 25),
      unit('keychain', 'childe', 28),
      unit('pin', 'childe', 28),
    ]
    // Both characters can form a full set (2 x 40 = 80) strictly cheaper than forming
    // only one (96 or 90) or none (106) — no price ties, so both bundles must be chosen.
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(80)
    expect(result.groups).toHaveLength(2)
  })

  it('when two items share the same category+character at different prices (e.g. two designs of the same keychain), a matched-rule bundle still lands on the price-optimal total', () => {
    // Multiple physical items can now share (category, character) — bundle rules still
    // only look at category/character, never at which specific design is in the cart.
    const cross = crossRule(['keychain', 'zine'], ['zhongli'], 10)
    const units = [
      unit('keychain', 'zhongli', 20), // Design A
      unit('keychain', 'zhongli', 35), // Design B — same character, different price
      unit('zine', 'zhongli', 15),
    ]
    const result = solveExclusivePartition(units, [cross])
    // Optimal: bundle Design B (35) + zine (15) at flat 10, leave Design A (20) à la
    // carte => 30. Taking Design A into the bundle instead would leave 35 as leftover => 45.
    expect(result.price).toBe(30)
  })

  it('picks the true price-optimal N-of-M selection for a quantity bundle when a contested type has 3+ same-character instances at non-monotonic prices', () => {
    // The solver's state only tracks a per-type COUNT, so a quantity-in-category rule
    // can only ever consume a *contiguous prefix* of whatever instances are left for
    // that type — it has no way to reach into the middle and skip one. With instances
    // pre-sorted highest-price-first that's harmless (a prefix is always "the N
    // priciest"), but with an unsorted/scrambled array the truly-optimal N-of-M
    // combination can become structurally unreachable. This only bites contested types
    // (character referenced by some other rule) with 3+ instances, which is exactly
    // what multiple item designs for the same character introduces.
    const fullSet = fullSetRule(['keychain', 'pin'], 999999) // contests every keychain character; never actually completes (no pin item exists)
    const quantity = quantityRule('keychain', 2, 5)
    const units = [
      unit('keychain', 'zhongli', 30), // Design A — inserted deliberately out of price order
      unit('keychain', 'zhongli', 10), // Design B
      unit('keychain', 'zhongli', 20), // Design C
    ]
    const result = solveExclusivePartition(units, [fullSet, quantity])
    // True optimal: bundle the two priciest (30 + 20) at flat 5, leave the cheapest (10)
    // à la carte => 15. A prefix-only search over the unsorted array can only reach
    // {30,10}+leftover 20 (=25) or {10,20}+leftover 30 (=35) — both worse than 15.
    expect(result.price).toBe(15)
  })

  it('cross-category rule with a generic category matches any character in that category, matched category still restricted to the allow-list', () => {
    // Mirrors a real catalog where a Zine isn't tied to any specific character (one
    // generic zine per fandom) but still bundles with a character-matched keychain.
    const rule = crossRule(['keychain'], ['childe', 'zhongli'], 100, { genericCategoryIds: ['zine'] })
    const units = [unit('zine', 'zine', 80), unit('keychain', 'zhongli', 30)]
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(100)
    expect(result.groups).toHaveLength(1)
  })

  it('generic-category rule does not fire when the matched category is outside the allow-list', () => {
    const rule = crossRule(['keychain'], ['childe', 'zhongli'], 100, { genericCategoryIds: ['zine'] })
    const units = [unit('zine', 'zine', 80), unit('keychain', 'diluc', 30)]
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(110) // plain à la carte, diluc isn't allowed
    expect(result.groups).toHaveLength(0)
  })

  it('generic-category rule still fires when the generic category sorts before the matched category', () => {
    // The solver picks which unit to consider next by sorting internal keys, which are
    // built from categoryId — an arbitrary string in practice (a UUID in the real app).
    // Nothing guarantees the matched category sorts first, so deliberately pick category
    // ids where the generic one ('aaa-zine') sorts before the matched one ('zzz-keychain')
    // to exercise the case where a generic-category unit gets pinned before its matched
    // partner ever does.
    const rule = crossRule(['zzz-keychain'], ['zhongli'], 10, { genericCategoryIds: ['aaa-zine'] })
    const units = [unit('aaa-zine', 'zine', 80), unit('zzz-keychain', 'zhongli', 30)]
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(10)
    expect(result.groups).toHaveLength(1)
  })

  it('generic-category rule picks the price-optimal unit to fill the character-agnostic slot', () => {
    const rule = crossRule(['keychain'], ['zhongli'], 10, { genericCategoryIds: ['zine'] })
    const units = [unit('zine', 'a', 50), unit('zine', 'b', 5), unit('keychain', 'zhongli', 1)]
    const result = solveExclusivePartition(units, [rule])
    // Bundle should consume the pricier zine (50), leaving the cheap one (5) à la carte:
    // 10 + 5 = 15. Consuming the cheap zine instead would leave 50 stranded => 60.
    expect(result.price).toBe(15)
  })

  it('ignores a bundle deal that would cost more than à la carte', () => {
    const rule = quantityRule('keychain', 1, 1000) // deliberately bad deal, should be ignored
    const units = [unit('keychain', 'a', 10)]
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(10)
    expect(result.groups).toHaveLength(0)
  })

  it('leaves a partial group à la carte when there are not enough units to hit the threshold', () => {
    const rule = quantityRule('keychain', 3, 40)
    const units = [unit('keychain', 'a', 15), unit('keychain', 'b', 15)]
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(30)
    expect(result.groups).toHaveLength(0)
  })

  it('ignores inactive rules', () => {
    const rule = quantityRule('keychain', 2, 1, { active: false })
    const units = [unit('keychain', 'a', 10), unit('keychain', 'b', 10)]
    const result = solveExclusivePartition(units, [rule])
    expect(result.price).toBe(20)
  })

  it('matches an exhaustive brute-force search across randomized small carts and rule sets', () => {
    const rand = mulberry32(20260824)
    const categories = ['keychain', 'pin', 'sticker', 'zine']
    const characters = ['a', 'b', 'c']

    for (let trial = 0; trial < 300; trial++) {
      // (categoryId, characterId) determines a single real-world Item, hence a single
      // price — mirror that invariant here so we never generate impossible carts (two
      // "instances of the same item" priced differently, which the brute-force
      // reference doesn't attempt to disambiguate between).
      const priceByType = new Map<string, number>()
      const priceFor = (categoryId: string, characterId: string) => {
        const key = `${categoryId}::${characterId}`
        if (!priceByType.has(key)) priceByType.set(key, 1 + Math.floor(rand() * 50))
        return priceByType.get(key)!
      }

      const unitCount = 1 + Math.floor(rand() * 6)
      const units = Array.from({ length: unitCount }, () => {
        const categoryId = categories[Math.floor(rand() * categories.length)]
        const characterId = characters[Math.floor(rand() * characters.length)]
        return unit(categoryId, characterId, priceFor(categoryId, characterId))
      })

      const rules = []
      if (rand() < 0.6) {
        rules.push(quantityRule(categories[Math.floor(rand() * categories.length)], 2 + Math.floor(rand() * 2), Math.floor(rand() * 60)))
      }
      if (rand() < 0.5) {
        // Sometimes make the second category generic (any character) instead of matched,
        // exercising the same code path as a real character-agnostic Zine bundle. Which
        // of the two categories plays the matched role is also randomized — the pinned
        // recursion order depends on category-id string sort, not on which role a
        // category plays, so fixing the matched category to always sort first would mask
        // bugs that only appear when a generic-category unit gets pinned first.
        const swap = rand() < 0.5
        const cats = swap ? [categories[1], categories[0]] : [categories[0], categories[1]]
        const useGeneric = rand() < 0.5
        rules.push(
          crossRule(useGeneric ? [cats[0]] : cats, [characters[Math.floor(rand() * characters.length)]], Math.floor(rand() * 80), {
            genericCategoryIds: useGeneric ? [cats[1]] : undefined,
          }),
        )
      }
      if (rand() < 0.5) {
        rules.push(fullSetRule([categories[2], categories[3]], Math.floor(rand() * 70)))
      }

      const expected = bruteForceExclusivePrice(units, rules)
      const actual = solveExclusivePartition(units, rules).price
      expect(actual, `trial ${trial}: units=${JSON.stringify(units)} rules=${JSON.stringify(rules)}`).toBe(expected)
    }
  })

  it('resolves a realistic-scale cart (30 items, several active rules) well under the 100ms recompute-on-every-tap budget', () => {
    const categories = ['keychain', 'pin', 'sticker', 'zine', 'lanyard']
    const characters = ['zhongli', 'childe', 'ganyu', 'venti', 'klee']
    const rand = mulberry32(1)

    const priceByType = new Map<string, number>()
    const priceFor = (categoryId: string, characterId: string) => {
      const key = `${categoryId}::${characterId}`
      if (!priceByType.has(key)) priceByType.set(key, 5000 + Math.floor(rand() * 45000))
      return priceByType.get(key)!
    }

    const units = Array.from({ length: 30 }, () => {
      const categoryId = categories[Math.floor(rand() * categories.length)]
      const characterId = characters[Math.floor(rand() * characters.length)]
      return unit(categoryId, characterId, priceFor(categoryId, characterId))
    })

    const rules = [
      quantityRule('keychain', 2, 40000),
      quantityRule('sticker', 3, 25000),
      crossRule(['keychain', 'zine'], ['zhongli', 'childe'], 90000),
      fullSetRule(['pin', 'keychain', 'sticker'], 60000),
    ]

    const start = performance.now()
    const result = solveExclusivePartition(units, rules)
    const elapsedMs = performance.now() - start

    expect(elapsedMs).toBeLessThan(100)
    expect(result.price).toBeGreaterThan(0)
  })
})
