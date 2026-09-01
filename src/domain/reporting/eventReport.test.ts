import { describe, expect, it } from 'vitest'
import { computeEventSummary } from './eventReport'
import type { Event, EventInventory, Item, Transaction } from '@/db/schema-types'

const lookups = {
  categoryName: () => 'Category',
  fandomName: () => 'Fandom',
  characterName: () => 'Character',
  bundleRuleName: () => 'Rule',
}

describe('computeEventSummary', () => {
  it('totalRevenue matches transaction.totalPrice (and the payment-method breakdown) even when a buy-N-get-1-free nominee sits inside a flat-price bundle group', () => {
    // Group of 2 units (face 30000 + 20000 = 50000) sold as a flat 40000 bundle: shares
    // allocated proportionally are 24000 and 16000 (last unit absorbs the rounding
    // remainder). The second unit (face 20000, share 16000) is ALSO nominated free by an
    // unrelated buy-N-get-1-free rule elsewhere in the cart — per buy-n-get-1.ts, that
    // rebate is valued at the unit's FACE price (20000), not its bundle-allocated share
    // (16000), so summing lineRevenue would under-subtract by exactly that 4000 gap.
    const event: Event = { id: 'e1', name: 'Test Event', startedAt: 0, status: 'active' }
    const transaction: Transaction = {
      id: 't1',
      eventId: 'e1',
      timestamp: 0,
      paymentMethod: 'cash',
      totalPrice: 20000, // 40000 group price - 20000 rebate, computed independently by the engine
      synced: 0,
      lines: [
        {
          itemId: 'item-a',
          categoryId: 'cat-a',
          fandomId: 'fandom-a',
          characterId: 'char-a',
          unitPriceAtSale: 30000,
          bundleGroupId: 'group-1',
          bundleRuleId: 'rule-1',
          bundleRuleName: 'Test Bundle',
          lineRevenue: 24000,
        },
        {
          itemId: 'item-b',
          categoryId: 'cat-b',
          fandomId: 'fandom-b',
          characterId: 'char-b',
          unitPriceAtSale: 20000,
          bundleGroupId: 'group-1',
          bundleRuleId: 'rule-1',
          bundleRuleName: 'Test Bundle',
          isFreeFromBuyNGet1FreeRuleId: 'free-rule-1',
          lineRevenue: 0, // zeroed for a clean receipt line, per buildTransactionLines
        },
      ],
    }

    const summary = computeEventSummary(event, [transaction], [], [], lookups)

    expect(summary.totalRevenue).toBe(20000)
    expect(summary.totalRevenue).toBe(transaction.totalPrice)
    const paymentTotal = summary.paymentBreakdown.reduce((sum, p) => sum + p.revenue, 0)
    expect(summary.totalRevenue).toBe(paymentTotal)

    // Sanity: naively summing lineRevenue (the old, buggy behavior) would have produced
    // 24000 here — confirming this test actually exercises the drift, not a no-op case.
    const naiveLineSum = transaction.lines.reduce((sum, l) => sum + l.lineRevenue, 0)
    expect(naiveLineSum).not.toBe(summary.totalRevenue)
  })

  it('totalRevenue matches transaction.totalPrice across multiple ordinary transactions with no free-in-group edge case', () => {
    const event: Event = { id: 'e1', name: 'Test Event', startedAt: 0, status: 'active' }
    const transactions: Transaction[] = [
      {
        id: 't1',
        eventId: 'e1',
        timestamp: 0,
        paymentMethod: 'cash',
        totalPrice: 30000,
        synced: 0,
        lines: [
          {
            itemId: 'item-a',
            categoryId: 'cat-a',
            fandomId: 'fandom-a',
            characterId: 'char-a',
            unitPriceAtSale: 30000,
            lineRevenue: 30000,
          },
        ],
      },
      {
        id: 't2',
        eventId: 'e1',
        timestamp: 1,
        paymentMethod: 'qr',
        totalPrice: 15000,
        synced: 0,
        lines: [
          {
            itemId: 'item-b',
            categoryId: 'cat-b',
            fandomId: 'fandom-b',
            characterId: 'char-b',
            unitPriceAtSale: 15000,
            lineRevenue: 15000,
          },
        ],
      },
    ]

    const summary = computeEventSummary(event, transactions, [], [], lookups)
    expect(summary.totalRevenue).toBe(45000)
  })

  it('leftoverStock reports starting/sold/remaining per item, sorted by label, excluding never-stocked items', () => {
    const event: Event = { id: 'e1', name: 'Test Event', startedAt: 0, status: 'active' }
    const items: Item[] = [
      { id: 'item-a', categoryId: 'cat-a', fandomId: 'fandom-a', characterId: 'char-a', unitPrice: 10000, active: true, createdAt: 0, updatedAt: 0 },
      { id: 'item-b', categoryId: 'cat-b', fandomId: 'fandom-b', characterId: 'char-b', unitPrice: 5000, active: true, createdAt: 0, updatedAt: 0 },
    ]
    const inventory: EventInventory[] = [
      { id: 'e1_item-a', eventId: 'e1', itemId: 'item-a', stockQty: 6, startingQty: 10 },
      { id: 'e1_item-b', eventId: 'e1', itemId: 'item-b', stockQty: 0, startingQty: 0 }, // never actually stocked
    ]
    const transactions: Transaction[] = [
      {
        id: 't1',
        eventId: 'e1',
        timestamp: 0,
        paymentMethod: 'cash',
        totalPrice: 40000,
        synced: 0,
        lines: Array.from({ length: 4 }, () => ({
          itemId: 'item-a',
          categoryId: 'cat-a',
          fandomId: 'fandom-a',
          characterId: 'char-a',
          unitPriceAtSale: 10000,
          lineRevenue: 10000,
        })),
      },
    ]

    const summary = computeEventSummary(event, transactions, inventory, items, lookups)

    expect(summary.leftoverStock).toHaveLength(1) // item-b excluded: startingQty 0
    expect(summary.leftoverStock[0]).toMatchObject({
      itemId: 'item-a',
      startingQty: 10,
      unitsSold: 4,
      remainingQty: 6,
    })
    expect(summary.leftoverStock[0].label).toContain('Category')
  })
})
