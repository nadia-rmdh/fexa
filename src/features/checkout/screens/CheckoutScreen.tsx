import { useState } from 'react'
import { useActiveEvent } from '@/hooks/useLiveCatalog'
import { useEventInventory } from '@/hooks/useEventInventory'
import { useCartStore } from '@/stores/cartStore'
import { BrowseGrid } from '../components/BrowseGrid'
import { CartPanel } from '../components/CartPanel'
import { ReceiptScreen } from './ReceiptScreen'
import type { Transaction } from '@/db/schema-types'

export function CheckoutScreen() {
  const activeEvent = useActiveEvent()
  const stockMap = useEventInventory(activeEvent?.id)
  const clearCart = useCartStore((s) => s.clear)
  const [receipt, setReceipt] = useState<Transaction | null>(null)

  if (!activeEvent) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-zinc-500">
        No active event. Start one in Admin → Events before selling.
      </div>
    )
  }

  if (receipt) {
    return <ReceiptScreen transaction={receipt} onNewSale={() => setReceipt(null)} />
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <BrowseGrid eventId={activeEvent.id} stockMap={stockMap} />
        </div>
      </div>
      <CartPanel
        eventId={activeEvent.id}
        stockMap={stockMap}
        onCheckoutComplete={(transaction) => {
          // Clear the moment the sale is finalized, not when the receipt is dismissed —
          // if the operator navigates away before tapping "New Sale" (e.g. taps another
          // tab), the already-sold items must not linger in the cart and risk a double-sell.
          clearCart()
          setReceipt(transaction)
        }}
      />
    </div>
  )
}
