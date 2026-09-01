import { db } from '@/db/db'

/** Wipes every event, its inventory snapshots, and its transaction history — leaves
 *  the catalog (categories, fandoms, characters, items, bundle rules) untouched. Used
 *  to clear out dry-run/test events before real use, without rebuilding the catalog. */
export async function resetEventData(): Promise<void> {
  await db.transaction('rw', db.events, db.eventInventory, db.transactions, async () => {
    await db.events.clear()
    await db.eventInventory.clear()
    await db.transactions.clear()
  })
}

/** Deletes one event and only its own inventory snapshot + transactions — other
 *  events (real or otherwise) are untouched. Works whether the event is active or
 *  already closed. */
export async function deleteEvent(eventId: string): Promise<void> {
  await db.transaction('rw', db.events, db.eventInventory, db.transactions, async () => {
    await db.eventInventory.where('eventId').equals(eventId).delete()
    await db.transactions.where('eventId').equals(eventId).delete()
    await db.events.delete(eventId)
  })
}
