import { describe, expect, it } from 'vitest'
import { applyBuyNGet1Free } from './buy-n-get-1'
import { buyNRule, unit } from './test-helpers'

describe('applyBuyNGet1Free', () => {
  it('frees the cheapest eligible unit, not an arbitrary one', () => {
    const rule = buyNRule('keychain', 2) // buy 2, 3rd free
    const units = [unit('keychain', 'a', 10), unit('keychain', 'b', 20), unit('keychain', 'c', 30)]
    const applications = applyBuyNGet1Free(units, [rule])
    expect(applications).toHaveLength(1)
    expect(applications[0].amount).toBe(10)
  })

  it('grants one free unit per complete group of n+1', () => {
    const rule = buyNRule('keychain', 1) // buy 1, get 1 free
    const units = [10, 10, 10, 10, 10].map((p) => unit('keychain', 'a', p))
    const applications = applyBuyNGet1Free(units, [rule])
    expect(applications).toHaveLength(2) // floor(5/2) = 2
  })

  it('grants nothing short of a full group', () => {
    const rule = buyNRule('keychain', 2)
    const units = [unit('keychain', 'a', 10), unit('keychain', 'b', 20)]
    expect(applyBuyNGet1Free(units, [rule])).toHaveLength(0)
  })

  it('ignores units outside the rule categoryId', () => {
    const rule = buyNRule('keychain', 1)
    const units = [unit('keychain', 'a', 10), unit('pin', 'a', 10)]
    expect(applyBuyNGet1Free(units, [rule])).toHaveLength(0)
  })

  it('ignores inactive rules', () => {
    const rule = buyNRule('keychain', 1, { active: false })
    const units = [unit('keychain', 'a', 10), unit('keychain', 'b', 10)]
    expect(applyBuyNGet1Free(units, [rule])).toHaveLength(0)
  })
})
