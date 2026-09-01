import { describe, expect, it } from 'vitest'
import { solve } from './engine'
import { buyNRule, crossRule, quantityRule, unit } from './test-helpers'

describe('solve (exclusive partition + buy-N-get-1-free stacking)', () => {
  it('stacks buy-N-get-1-free on top of a separately-chosen quantity bundle', () => {
    const qty = quantityRule('keychain', 2, 15)
    const buyN = buyNRule('keychain', 2) // buy 2, 3rd free
    const units = [unit('keychain', 'a', 10), unit('keychain', 'b', 20), unit('keychain', 'c', 30)]

    const result = solve(units, [qty, buyN])
    // Exclusive step: bundle the two highest (20+30) at flat 15, leaving the 10 à la carte => subtotal 25.
    expect(result.subtotal).toBe(25)
    // Buy-N-get-1-free is independent: 3 units total, 1 free (cheapest overall = 10).
    expect(result.freeApplications).toHaveLength(1)
    expect(result.freeApplications[0].amount).toBe(10)
    expect(result.totalPrice).toBe(15)
  })

  it('lets a unit already inside an exclusive bundle also be nominated free', () => {
    // Cross-category bundle forces the character-x keychain into a group regardless of price,
    // even though it happens to be the cheapest keychain in the cart.
    const cross = crossRule(['keychain', 'zine'], ['x'], 1)
    const buyN = buyNRule('keychain', 1) // buy 1, get 1 free
    const units = [unit('keychain', 'x', 5), unit('zine', 'x', 8), unit('keychain', 'y', 50)]

    const result = solve(units, [cross, buyN])
    // Exclusive: cross bundle (keychain-x + zine-x) at price 1, leftover keychain-y (50) à la carte => 51.
    expect(result.subtotal).toBe(51)
    // Buy-N-get-1-free over ALL keychains (x@5, y@50): 2 units, 1 free, cheapest = 5 — the one inside the bundle.
    expect(result.freeApplications).toHaveLength(1)
    expect(result.freeApplications[0].amount).toBe(5)
    expect(result.totalPrice).toBe(46)
  })

  it('returns an empty solution for an empty cart', () => {
    const result = solve([], [quantityRule('keychain', 2, 10)])
    expect(result.totalPrice).toBe(0)
    expect(result.groups).toHaveLength(0)
    expect(result.freeApplications).toHaveLength(0)
  })
})
