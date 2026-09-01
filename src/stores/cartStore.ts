import { create } from 'zustand'
import { computeCartPricing } from '@/domain/inventory/cart-pricing'
import type { CartLine } from '@/domain/inventory/cart-pricing'
import type { BundleSolution, CartUnit } from '@/domain/bundle-engine'

export type { CartLine } from '@/domain/inventory/cart-pricing'

interface CartState {
  eventId: string | null
  lines: CartLine[]
  bundleResult: BundleSolution | null
  units: CartUnit[]
  addItem: (eventId: string, itemId: string) => Promise<void>
  removeOne: (itemId: string) => Promise<void>
  clear: () => void
}

async function reprice(lines: CartLine[]): Promise<{ bundleResult: BundleSolution | null; units: CartUnit[] }> {
  if (lines.length === 0) return { bundleResult: null, units: [] }
  const { solution, units } = await computeCartPricing(lines)
  return { bundleResult: solution, units }
}

export const useCartStore = create<CartState>((set, get) => ({
  eventId: null,
  lines: [],
  bundleResult: null,
  units: [],

  addItem: async (eventId, itemId) => {
    const state = get()
    // A cart started under one event can't silently carry into another
    // (e.g. operator closes the event mid-sale) — reset instead of mixing inventory pools.
    const lines = state.eventId === eventId ? state.lines : []
    const existing = lines.find((l) => l.itemId === itemId)
    const nextLines = existing
      ? lines.map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity + 1 } : l))
      : [...lines, { itemId, quantity: 1 }]
    set({ eventId, lines: nextLines })
    const { bundleResult, units } = await reprice(nextLines)
    // Guard against a stale response landing after the cart changed again or was cleared.
    if (get().lines === nextLines) set({ bundleResult, units })
  },

  removeOne: async (itemId) => {
    const nextLines = get()
      .lines.map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity - 1 } : l))
      .filter((l) => l.quantity > 0)
    set({ lines: nextLines })
    const { bundleResult, units } = await reprice(nextLines)
    if (get().lines === nextLines) set({ bundleResult, units })
  },

  clear: () => set({ eventId: null, lines: [], bundleResult: null, units: [] }),
}))
