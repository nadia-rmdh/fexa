import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { computeCartPricing } from './cart-pricing'
import type { CartLine } from './cart-pricing'
import type { CartUnit, BundleSolution } from '@/domain/bundle-engine'
import type { Item, Transaction, TransactionLine } from '@/db/schema-types'
import { notifyTransactionCompleted } from '@/services/backupScheduler'

export class InsufficientStockError extends Error {
  itemId: string
  constructor(itemId: string) {
    super(`Not enough stock for item ${itemId}`)
    this.itemId = itemId
  }
}

export class InsufficientCashError extends Error {
  totalPrice: number
  cashReceived: number
  constructor(totalPrice: number, cashReceived: number) {
    super(`Cash received (${cashReceived}) is less than the total (${totalPrice})`)
    this.totalPrice = totalPrice
    this.cashReceived = cashReceived
  }
}

interface SubmitCheckoutArgs {
  eventId: string
  lines: CartLine[]
  paymentMethod: 'cash' | 'qr'
  /** Cash-only, optional: what the customer handed over. Omit/leave undefined for exact
   *  change — re-validated here against the freshly recomputed total (not the caller's
   *  possibly-stale one), since bundle rules/stock can change between cart and submit. */
  cashReceived?: number
}

/**
 * Splits a bundle group's flat price across its member units, proportional to each
 * unit's own à-la-carte price — so per-item/per-category revenue reporting (§5.5)
 * still reflects roughly what each item contributed, even though the bundle sold at
 * one combined price. The last unit absorbs the rounding remainder so shares always
 * sum to exactly the group price (all prices are integers — never floats).
 */
function allocateGroupShares(groupUnits: CartUnit[], groupPrice: number): Map<string, number> {
  const totalOriginal = groupUnits.reduce((sum, u) => sum + u.unitPrice, 0)
  const shares = new Map<string, number>()
  let allocated = 0
  groupUnits.forEach((unit, i) => {
    if (i === groupUnits.length - 1) {
      shares.set(unit.instanceId, groupPrice - allocated)
      return
    }
    const share = totalOriginal === 0 ? 0 : Math.round((unit.unitPrice / totalOriginal) * groupPrice)
    shares.set(unit.instanceId, share)
    allocated += share
  })
  return shares
}

function buildTransactionLines(units: CartUnit[], itemById: Map<string, Item>, solution: BundleSolution): TransactionLine[] {
  const unitById = new Map(units.map((u) => [u.instanceId, u]))
  const freeByInstance = new Map(solution.freeApplications.map((f) => [f.instanceId, f]))
  const lines: TransactionLine[] = []

  const makeLine = (unit: CartUnit, extra: Partial<TransactionLine>): TransactionLine => {
    const item = itemById.get(unit.itemId)!
    const free = freeByInstance.get(unit.instanceId)
    const baseRevenue = extra.lineRevenue ?? unit.unitPrice
    return {
      itemId: unit.itemId,
      categoryId: unit.categoryId,
      fandomId: item.fandomId,
      characterId: unit.characterId,
      variantLabel: item.variantLabel,
      unitPriceAtSale: unit.unitPrice,
      ...extra,
      isFreeFromBuyNGet1FreeRuleId: free?.ruleId,
      // A unit already inside a flat-price group can also be freed by buy-N-get-1
      // (they stack, per spec) — when that happens we report its line at zero rather
      // than its fractional group share, favoring a clean "this item was free" receipt
      // line over penny-perfect reconciliation of an already-rare double discount.
      lineRevenue: free ? 0 : baseRevenue,
    }
  }

  for (const instanceId of solution.leftoverInstanceIds) {
    const unit = unitById.get(instanceId)
    if (unit) lines.push(makeLine(unit, {}))
  }

  for (const group of solution.groups) {
    const groupUnits = group.unitInstanceIds.map((id) => unitById.get(id)!).filter(Boolean)
    const shares = allocateGroupShares(groupUnits, group.price)
    for (const unit of groupUnits) {
      lines.push(
        makeLine(unit, {
          bundleGroupId: group.id,
          bundleRuleId: group.ruleId,
          bundleRuleName: group.ruleName,
          lineRevenue: shares.get(unit.instanceId) ?? 0,
        }),
      )
    }
  }

  return lines
}

async function submitCheckoutOnce({ eventId, lines, paymentMethod, cashReceived }: SubmitCheckoutArgs): Promise<Transaction> {
  const { solution, units, itemById } = await computeCartPricing(lines)
  const transactionLines = buildTransactionLines(units, itemById, solution)

  if (cashReceived !== undefined && cashReceived < solution.totalPrice) {
    throw new InsufficientCashError(solution.totalPrice, cashReceived)
  }

  const transaction = await db.transaction('rw', db.eventInventory, db.transactions, async () => {
    const qtyByItem = new Map<string, number>()
    for (const unit of units) qtyByItem.set(unit.itemId, (qtyByItem.get(unit.itemId) ?? 0) + 1)

    for (const [itemId, qty] of qtyByItem) {
      const inventoryId = `${eventId}_${itemId}`
      const inventory = await db.eventInventory.get(inventoryId)
      if (!inventory || inventory.stockQty < qty) {
        throw new InsufficientStockError(itemId)
      }
      await db.eventInventory.update(inventoryId, { stockQty: inventory.stockQty - qty })
    }

    const transaction: Transaction = {
      id: uuid(),
      eventId,
      timestamp: Date.now(),
      paymentMethod,
      totalPrice: solution.totalPrice,
      lines: transactionLines,
      synced: 0,
      ...(cashReceived !== undefined && { cashReceived, changeDue: cashReceived - solution.totalPrice }),
    }
    await db.transactions.add(transaction)
    return transaction
  })

  notifyTransactionCompleted()
  return transaction
}

/**
 * Re-prices the cart fresh (stock and bundle rules may have changed since the cart
 * was built), then atomically re-validates stock, decrements it, and records the sale.
 *
 * Retries once on any failure that isn't a genuine business-logic conflict. Some
 * WebKit-based browsers (notably iOS Safari and iOS Chrome, which is WebKit underneath
 * — iOS forces every browser onto it) intermittently fail the first IndexedDB write
 * after a tab has been idle or backgrounded, then succeed immediately on an identical
 * retry. Stock and cash conflicts are real business-logic failures, so they're never
 * retried — retrying could paper over legitimately oversold stock, and a cash shortfall
 * needs the operator to re-enter the amount, not a silent second attempt.
 */
export async function submitCheckout(args: SubmitCheckoutArgs): Promise<Transaction> {
  try {
    return await submitCheckoutOnce(args)
  } catch (e) {
    if (e instanceof InsufficientStockError || e instanceof InsufficientCashError) throw e
    console.error('submitCheckout failed, retrying once', e)
    await new Promise((resolve) => setTimeout(resolve, 200))
    return submitCheckoutOnce(args)
  }
}
