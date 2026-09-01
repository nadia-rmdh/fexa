import { useState } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { useCategories, useCharacters, useFandoms, useItems } from '@/hooks/useLiveCatalog'
import { sortByKeys } from '@/lib/sort'
import { formatMoney } from '@/domain/pricing/money'
import { Button } from '@/components/ui/Button'
import { PaymentMethodModal } from './PaymentMethodModal'
import { BundleBadge } from './BundleBadge'
import type { CartLine } from '@/stores/cartStore'
import type { Item, Transaction } from '@/db/schema-types'

interface CartRow {
  line: CartLine
  item: Item
}

interface CartPanelProps {
  eventId: string
  stockMap: Record<string, number>
  onCheckoutComplete: (transaction: Transaction) => void
}

export function CartPanel({ eventId, stockMap, onCheckoutComplete }: CartPanelProps) {
  const lines = useCartStore((s) => s.lines)
  const bundleResult = useCartStore((s) => s.bundleResult)
  const units = useCartStore((s) => s.units)
  const addItem = useCartStore((s) => s.addItem)
  const removeOne = useCartStore((s) => s.removeOne)
  const clear = useCartStore((s) => s.clear)
  const items = useItems()
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const [checkingOut, setCheckingOut] = useState(false)

  const nameFor = (id: string, list?: { id: string; name: string }[]) => list?.find((x) => x.id === id)?.name ?? '—'

  const unsortedRows: CartRow[] = lines
    .map((line) => {
      const item = items?.find((i) => i.id === line.itemId)
      return item ? { line, item } : null
    })
    .filter((r): r is CartRow => r !== null)

  const rows = sortByKeys(unsortedRows, ({ item }) => [
    nameFor(item.categoryId, categories),
    nameFor(item.fandomId, fandoms),
    nameFor(item.characterId, characters),
    item.variantLabel ?? '',
  ])

  const fallbackTotal = rows.reduce((sum, r) => sum + r.item.unitPrice * r.line.quantity, 0)
  const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0)
  // bundleResult/units can briefly lag one cart mutation behind (they resolve async);
  // only trust them once their unit count matches the current cart.
  const isFresh = !!bundleResult && units.length === totalQty
  const total = isFresh ? bundleResult!.totalPrice : fallbackTotal
  const freeCount = isFresh ? bundleResult!.freeApplications.length : 0

  return (
    <div className="flex h-full flex-col border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 lg:w-80 lg:shrink-0 lg:border-l lg:border-t-0">
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">Cart</h2>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">Cart is empty. Tap items to add them.</p>
        ) : (
          <>
            {isFresh && bundleResult!.groups.length > 0 && (
              <ul className="mb-3 space-y-2">
                {bundleResult!.groups.map((group) => {
                  const memberUnits = group.unitInstanceIds
                    .map((id) => units.find((u) => u.instanceId === id))
                    .filter((u): u is NonNullable<typeof u> => !!u)
                  const aLaCarteValue = memberUnits.reduce((sum, u) => sum + u.unitPrice, 0)
                  return (
                    <BundleBadge key={group.id} group={group} memberCount={memberUnits.length} aLaCarteValue={aLaCarteValue} />
                  )
                })}
              </ul>
            )}
            {freeCount > 0 && (
              <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {freeCount} item{freeCount > 1 ? 's' : ''} free (buy-N-get-1-free)
              </p>
            )}

            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {rows.map(({ line, item }) => {
                const available = (stockMap[item.id] ?? 0) - line.quantity
                return (
                  <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">
                        {nameFor(item.categoryId, categories)} · {nameFor(item.fandomId, fandoms)} · {nameFor(item.characterId, characters)}
                        {item.variantLabel && <span className="text-zinc-400"> — {item.variantLabel}</span>}
                      </div>
                      <div className="text-xs text-zinc-400">{formatMoney(item.unitPrice, 'IDR')} each</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded bg-zinc-100 dark:bg-zinc-700"
                        onClick={() => removeOne(item.id)}
                      >
                        −
                      </button>
                      <span className="w-5 text-center">{line.quantity}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded bg-zinc-100 disabled:opacity-30 dark:bg-zinc-700"
                        disabled={available <= 0}
                        onClick={() => addItem(eventId, item.id)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-200 p-3 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatMoney(total, 'IDR')}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={clear} disabled={rows.length === 0} className="flex-1">
            Clear
          </Button>
          <Button onClick={() => setCheckingOut(true)} disabled={rows.length === 0} className="flex-1">
            Checkout
          </Button>
        </div>
      </div>

      {checkingOut && (
        <PaymentMethodModal
          eventId={eventId}
          lines={lines}
          total={total}
          onClose={() => setCheckingOut(false)}
          onComplete={(transaction) => {
            setCheckingOut(false)
            onCheckoutComplete(transaction)
          }}
        />
      )}
    </div>
  )
}
