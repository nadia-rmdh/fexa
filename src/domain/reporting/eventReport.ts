import { csvRow } from '@/lib/csv'
import { formatMoney } from '@/domain/pricing/money'
import type { Event, EventInventory, Item, Transaction } from '@/db/schema-types'

export interface NameLookups {
  categoryName: (id: string) => string
  fandomName: (id: string) => string
  characterName: (id: string) => string
  bundleRuleName: (id: string) => string
}

interface CountAndRevenue {
  unitsSold: number
  revenue: number
}

export interface EventSummary {
  eventName: string
  startedAt: number
  endedAt?: number
  transactionCount: number
  totalRevenue: number
  totalUnitsSold: number
  freeUnitsCount: number
  paymentBreakdown: { method: 'cash' | 'qr'; transactionCount: number; revenue: number }[]
  categoryBreakdown: { id: string; name: string; unitsSold: number; revenue: number }[]
  fandomBreakdown: { id: string; name: string; unitsSold: number; revenue: number }[]
  characterBreakdown: { id: string; name: string; unitsSold: number; revenue: number }[]
  bestSellers: { itemId: string; label: string; unitsSold: number; revenue: number }[]
  bundleUsage: { ruleId: string; ruleName: string; timesApplied: number; totalDiscount: number }[]
  leftoverStock: { itemId: string; label: string; startingQty: number; unitsSold: number; remainingQty: number }[]
}

function tally<K extends string>(map: Map<K, CountAndRevenue>, key: K, units: number, revenue: number) {
  const existing = map.get(key) ?? { unitsSold: 0, revenue: 0 }
  existing.unitsSold += units
  existing.revenue += revenue
  map.set(key, existing)
}

export function computeEventSummary(
  event: Event,
  transactions: Transaction[],
  inventory: EventInventory[],
  items: Item[],
  lookups: NameLookups,
): EventSummary {
  const byCategory = new Map<string, CountAndRevenue>()
  const byFandom = new Map<string, CountAndRevenue>()
  const byCharacter = new Map<string, CountAndRevenue>()
  const byItem = new Map<string, CountAndRevenue & { label: string }>()
  const byPayment = new Map<'cash' | 'qr', { transactionCount: number; revenue: number }>()
  // group-application discount: sum of (à-la-carte price − actual charged) per bundleGroupId,
  // resolved to its rule at the end — captures flat-bundle savings and any stacked free-item
  // savings on that group's own lines together.
  const groupDiscountByRule = new Map<string, { ruleId: string; timesApplied: number; totalDiscount: number }>()
  const seenGroupIds = new Set<string>()
  const freeUsageByRule = new Map<string, { ruleId: string; timesApplied: number; totalDiscount: number }>()

  let totalRevenue = 0
  let totalUnitsSold = 0
  let freeUnitsCount = 0

  for (const transaction of transactions) {
    const paymentEntry = byPayment.get(transaction.paymentMethod) ?? { transactionCount: 0, revenue: 0 }
    paymentEntry.transactionCount += 1
    paymentEntry.revenue += transaction.totalPrice
    byPayment.set(transaction.paymentMethod, paymentEntry)
    // transaction.totalPrice is the ground truth for money actually collected. Per-line
    // lineRevenue is only an *allocation* of that total across items/categories (for the
    // breakdowns below) and can drift from it in a rare edge case: when a buy-N-get-1-free
    // "free" nomination lands on a unit that's also inside a flat-price bundle group, that
    // line is zeroed out at its bundle-share value while the rebate that produced
    // totalPrice was computed at the unit's face price — those two numbers aren't equal
    // whenever the bundle discounted the unit below face price. Summing lineRevenue here
    // would silently drift from the real total; summing totalPrice never does.
    totalRevenue += transaction.totalPrice

    for (const line of transaction.lines) {
      totalUnitsSold += 1
      if (line.isFreeFromBuyNGet1FreeRuleId) freeUnitsCount += 1

      tally(byCategory, line.categoryId, 1, line.lineRevenue)
      tally(byFandom, line.fandomId, 1, line.lineRevenue)
      tally(byCharacter, line.characterId, 1, line.lineRevenue)

      const baseLabel = `${lookups.categoryName(line.categoryId)} · ${lookups.fandomName(line.fandomId)} · ${lookups.characterName(line.characterId)}`
      const itemEntry = byItem.get(line.itemId) ?? {
        unitsSold: 0,
        revenue: 0,
        // Two variants of the same character would otherwise show as identical rows.
        label: line.variantLabel ? `${baseLabel} — ${line.variantLabel}` : baseLabel,
      }
      itemEntry.unitsSold += 1
      itemEntry.revenue += line.lineRevenue
      byItem.set(line.itemId, itemEntry)

      if (line.bundleGroupId && line.bundleRuleId) {
        const discount = line.unitPriceAtSale - line.lineRevenue
        const groupKey = `${line.bundleGroupId}`
        if (!seenGroupIds.has(groupKey)) {
          seenGroupIds.add(groupKey)
          const entry = groupDiscountByRule.get(line.bundleRuleId) ?? { ruleId: line.bundleRuleId, timesApplied: 0, totalDiscount: 0 }
          entry.timesApplied += 1
          groupDiscountByRule.set(line.bundleRuleId, entry)
        }
        const entry = groupDiscountByRule.get(line.bundleRuleId)!
        entry.totalDiscount += discount
      } else if (line.isFreeFromBuyNGet1FreeRuleId) {
        const entry = freeUsageByRule.get(line.isFreeFromBuyNGet1FreeRuleId) ?? {
          ruleId: line.isFreeFromBuyNGet1FreeRuleId,
          timesApplied: 0,
          totalDiscount: 0,
        }
        entry.timesApplied += 1
        entry.totalDiscount += line.unitPriceAtSale
        freeUsageByRule.set(line.isFreeFromBuyNGet1FreeRuleId, entry)
      }
    }
  }

  const toBreakdown = (map: Map<string, CountAndRevenue>, nameFor: (id: string) => string) =>
    [...map.entries()]
      .map(([id, v]) => ({ id, name: nameFor(id), ...v }))
      .sort((a, b) => b.unitsSold - a.unitsSold)

  const bundleUsage = [...groupDiscountByRule.values(), ...freeUsageByRule.values()]
    .map((entry) => ({ ...entry, ruleName: lookups.bundleRuleName(entry.ruleId) }))
    .sort((a, b) => b.timesApplied - a.timesApplied)

  // Ending-stock reconciliation: what the system thinks is left in each box, for a
  // physical count against the actual leftovers at pack-down. Only items actually
  // stocked for this event are listed — a never-restocked item has nothing to count.
  const itemById = new Map(items.map((i) => [i.id, i]))
  const leftoverStock = inventory
    .filter((inv) => inv.startingQty > 0)
    .map((inv) => {
      const item = itemById.get(inv.itemId)
      const label = item
        ? `${lookups.categoryName(item.categoryId)} · ${lookups.fandomName(item.fandomId)} · ${lookups.characterName(item.characterId)}${item.variantLabel ? ` — ${item.variantLabel}` : ''}`
        : '(deleted item)'
      return {
        itemId: inv.itemId,
        label,
        startingQty: inv.startingQty,
        unitsSold: byItem.get(inv.itemId)?.unitsSold ?? 0,
        remainingQty: inv.stockQty,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    eventName: event.name,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    transactionCount: transactions.length,
    totalRevenue,
    totalUnitsSold,
    freeUnitsCount,
    paymentBreakdown: [...byPayment.entries()].map(([method, v]) => ({ method, ...v })),
    categoryBreakdown: toBreakdown(byCategory, lookups.categoryName),
    fandomBreakdown: toBreakdown(byFandom, lookups.fandomName),
    characterBreakdown: toBreakdown(byCharacter, lookups.characterName),
    bestSellers: [...byItem.entries()]
      .map(([itemId, v]) => ({ itemId, ...v }))
      .sort((a, b) => b.unitsSold - a.unitsSold),
    bundleUsage,
    leftoverStock,
  }
}

function section(title: string, header: string[], rows: (string | number)[][]): string[] {
  const lines = [`== ${title} ==`, csvRow(header)]
  for (const row of rows) lines.push(csvRow(row))
  lines.push('')
  return lines
}

/** Builds one CSV with a summary section (revenue/payment/category/fandom/character/
 *  best-seller/bundle-usage rollups) followed by the full itemized transaction log —
 *  a single file the operator can open directly in Excel/Sheets/Numbers. */
export function buildEventReportCsv(summary: EventSummary, transactions: Transaction[], lookups: NameLookups): string {
  const currency = 'IDR'
  const money = (n: number) => formatMoney(n, currency)
  const lines: string[] = []

  lines.push(`Event Report: ${summary.eventName}`)
  lines.push(`Started: ${new Date(summary.startedAt).toLocaleString()}`)
  if (summary.endedAt) lines.push(`Ended: ${new Date(summary.endedAt).toLocaleString()}`)
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push('')

  lines.push(
    ...section(
      'Overview',
      ['Metric', 'Value'],
      [
        ['Transactions', summary.transactionCount],
        ['Units sold', summary.totalUnitsSold],
        ['Free units (buy-N-get-1-free)', summary.freeUnitsCount],
        ['Total revenue', money(summary.totalRevenue)],
      ],
    ),
  )

  lines.push(
    ...section(
      'Revenue by Payment Method',
      ['Payment Method', 'Transactions', 'Revenue'],
      summary.paymentBreakdown.map((p) => [p.method === 'cash' ? 'Cash' : 'QR', p.transactionCount, money(p.revenue)]),
    ),
  )

  lines.push(
    ...section(
      'Best Sellers',
      ['Item', 'Units Sold', 'Revenue'],
      summary.bestSellers.map((i) => [i.label, i.unitsSold, money(i.revenue)]),
    ),
  )

  lines.push(
    ...section(
      'Units Sold by Category',
      ['Category', 'Units Sold', 'Revenue'],
      summary.categoryBreakdown.map((c) => [c.name, c.unitsSold, money(c.revenue)]),
    ),
  )

  lines.push(
    ...section(
      'Units Sold by Fandom',
      ['Fandom', 'Units Sold', 'Revenue'],
      summary.fandomBreakdown.map((f) => [f.name, f.unitsSold, money(f.revenue)]),
    ),
  )

  lines.push(
    ...section(
      'Units Sold by Character',
      ['Character', 'Units Sold', 'Revenue'],
      summary.characterBreakdown.map((c) => [c.name, c.unitsSold, money(c.revenue)]),
    ),
  )

  lines.push(
    ...section(
      'Bundle Usage',
      ['Bundle Rule', 'Times Applied', 'Total Discount Given'],
      summary.bundleUsage.map((b) => [b.ruleName, b.timesApplied, money(b.totalDiscount)]),
    ),
  )

  lines.push(
    ...section(
      'Leftover Stock (for physical count at pack-down)',
      ['Item', 'Starting Qty', 'Units Sold', 'Expected Remaining (system)', 'Actual Counted'],
      summary.leftoverStock.map((s) => [s.label, s.startingQty, s.unitsSold, s.remainingQty, '']),
    ),
  )

  lines.push(
    ...section(
      'Transaction Log (one row per unit sold)',
      [
        'Transaction ID',
        'Timestamp',
        'Payment Method',
        'Category',
        'Fandom',
        'Character',
        'Variant',
        'Unit Price',
        'Bundle Rule',
        'Free Item',
        'Line Revenue',
      ],
      transactions.flatMap((t) =>
        t.lines.map((line) => [
          t.id,
          new Date(t.timestamp).toLocaleString(),
          t.paymentMethod === 'cash' ? 'Cash' : 'QR',
          lookups.categoryName(line.categoryId),
          lookups.fandomName(line.fandomId),
          lookups.characterName(line.characterId),
          line.variantLabel ?? '',
          money(line.unitPriceAtSale),
          line.bundleRuleName ?? '',
          line.isFreeFromBuyNGet1FreeRuleId ? 'Yes' : '',
          money(line.lineRevenue),
        ]),
      ),
    ),
  )

  return lines.join('\r\n')
}
