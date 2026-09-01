import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

/** Live map of itemId -> current stockQty for the given event. */
export function useEventInventory(eventId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!eventId) return {} as Record<string, number>
      const rows = await db.eventInventory.where('eventId').equals(eventId).toArray()
      return Object.fromEntries(rows.map((r) => [r.itemId, r.stockQty]))
    },
    [eventId],
    {},
  )
}

/** Live map of itemId -> startingQty for the given event — fixed at "Start Event" time
 *  and never touched again afterward (unlike stockQty, which depletes as items sell).
 *  Checkout uses this, not stockQty, to decide whether an item/fandom/category shows up
 *  at all: something restocked at >0 stays visible (and tappable) even after it sells
 *  out mid-event, but something never stocked for this event (because it was delisted,
 *  or the operator just left it at 0) never appears in the first place. */
export function useEventStartingStock(eventId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!eventId) return {} as Record<string, number>
      const rows = await db.eventInventory.where('eventId').equals(eventId).toArray()
      return Object.fromEntries(rows.map((r) => [r.itemId, r.startingQty]))
    },
    [eventId],
    {} as Record<string, number>,
  )
}
