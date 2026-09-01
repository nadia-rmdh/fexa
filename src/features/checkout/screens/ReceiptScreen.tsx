import { useCategories, useCharacters, useFandoms, useItems } from '@/hooks/useLiveCatalog'
import { formatMoney } from '@/domain/pricing/money'
import { Button } from '@/components/ui/Button'
import type { Transaction } from '@/db/schema-types'

interface ReceiptScreenProps {
  transaction: Transaction
  onNewSale: () => void
}

export function ReceiptScreen({ transaction, onNewSale }: ReceiptScreenProps) {
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const items = useItems()

  const nameFor = (id: string, list?: { id: string; name: string }[]) => list?.find((x) => x.id === id)?.name ?? '—'

  return (
    <div className="mx-auto flex h-full max-w-md flex-col p-4">
      <h1 className="mb-1 text-center text-xl font-semibold">Sale Complete</h1>
      <p className="mb-4 text-center text-sm text-zinc-400">{new Date(transaction.timestamp).toLocaleString()}</p>

      <ul className="mb-4 flex-1 divide-y divide-zinc-200 overflow-auto dark:divide-zinc-700">
        {transaction.lines.map((line, i) => {
          const item = items?.find((it) => it.id === line.itemId)
          return (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div>
                  {nameFor(line.categoryId, categories)} · {nameFor(line.fandomId, fandoms)} · {nameFor(line.characterId, characters)}
                  {line.variantLabel && <span className="text-zinc-400"> — {line.variantLabel}</span>}
                </div>
                {line.bundleRuleName && <div className="text-xs text-emerald-600">Bundle: {line.bundleRuleName}</div>}
                {line.isFreeFromBuyNGet1FreeRuleId && <div className="text-xs text-emerald-600">Free item</div>}
                {!item && <div className="text-xs text-zinc-400">(item since removed from catalog)</div>}
              </div>
              <span className={line.lineRevenue === 0 ? 'text-emerald-600' : ''}>{formatMoney(line.lineRevenue, 'IDR')}</span>
            </li>
          )
        })}
      </ul>

      <div className="mb-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total ({transaction.paymentMethod === 'cash' ? 'Cash' : 'QR'})</span>
          <span>{formatMoney(transaction.totalPrice, 'IDR')}</span>
        </div>
        {transaction.cashReceived !== undefined && (
          <>
            <div className="mt-1 flex items-center justify-between text-sm text-zinc-500">
              <span>Cash received</span>
              <span>{formatMoney(transaction.cashReceived, 'IDR')}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-base font-medium text-emerald-600">
              <span>Change due</span>
              <span>{formatMoney(transaction.changeDue ?? 0, 'IDR')}</span>
            </div>
          </>
        )}
      </div>

      <Button onClick={onNewSale} className="py-4 text-lg">
        New Sale
      </Button>
    </div>
  )
}
