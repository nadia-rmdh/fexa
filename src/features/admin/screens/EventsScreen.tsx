import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useActiveEvent, useCategories, useCharacters, useEvents, useFandoms, useItems } from '@/hooks/useLiveCatalog'
import type { Item } from '@/db/schema-types'
import { resetEventData, deleteEvent } from '@/services/eventDataReset'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/FormField'

export function EventsScreen() {
  const activeEvent = useActiveEvent()
  const events = useEvents()
  const items = useItems()
  const [startingNew, setStartingNew] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; name: string } | null>(null)

  const pastEvents = events?.filter((e) => e.id !== activeEvent?.id)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Events</h1>
        <div className="flex gap-2">
          <Button onClick={() => setStartingNew(true)} disabled={!items?.length}>
            Start New Event
          </Button>
        </div>
      </div>
      {!items?.length && <p className="mb-4 text-sm text-zinc-400">Add at least one Item before starting an event.</p>}

      {activeEvent ? (
        <ActiveEventPanel eventId={activeEvent.id} eventName={activeEvent.name} startedAt={activeEvent.startedAt} />
      ) : (
        <p className="mb-6 text-zinc-400">No active event. Start one to begin selling.</p>
      )}

      {!!pastEvents?.length && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">Past events</h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {pastEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {e.name} — {new Date(e.startedAt).toLocaleDateString()}
                  {e.endedAt ? ` → ${new Date(e.endedAt).toLocaleDateString()}` : ''}
                </span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => setDeletingEvent({ id: e.id, name: e.name })}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!events?.length && (
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setConfirmingReset(true)}>
            Reset all event data…
          </button>
        </div>
      )}

      {startingNew && items && <StartEventModal items={items} onClose={() => setStartingNew(false)} />}
      {confirmingReset && (
        <ResetEventDataModal
          eventCount={events?.length ?? 0}
          onClose={() => setConfirmingReset(false)}
        />
      )}
      {deletingEvent && (
        <DeleteEventModal eventId={deletingEvent.id} eventName={deletingEvent.name} onClose={() => setDeletingEvent(null)} />
      )}
    </div>
  )
}

function ResetEventDataModal({ eventCount, onClose }: { eventCount: number; onClose: () => void }) {
  const clearCart = useCartStore((s) => s.clear)
  const [resetting, setResetting] = useState(false)

  async function handleConfirm() {
    setResetting(true)
    await resetEventData()
    clearCart()
    setResetting(false)
    onClose()
  }

  return (
    <Modal open title="Reset all event data?" onClose={onClose}>
      <p className="mb-2 text-sm">
        This permanently deletes all {eventCount} event{eventCount === 1 ? '' : 's'} — including the active one if
        there is one — along with every inventory snapshot and the entire transaction history.
      </p>
      <p className="mb-4 text-sm text-zinc-500">
        Your catalog (categories, fandoms, characters, items, bundle rules) is <strong>not</strong> affected. This
        can't be undone.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={resetting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={resetting}>
          {resetting ? 'Resetting…' : 'Reset Event Data'}
        </Button>
      </div>
    </Modal>
  )
}

function DeleteEventModal({ eventId, eventName, onClose }: { eventId: string; eventName: string; onClose: () => void }) {
  const transactionCount = useLiveQuery(() => db.transactions.where('eventId').equals(eventId).count(), [eventId], 0)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    await deleteEvent(eventId)
    if (useCartStore.getState().eventId === eventId) useCartStore.getState().clear()
    setDeleting(false)
    onClose()
  }

  return (
    <Modal open title={`Delete "${eventName}"?`} onClose={onClose}>
      <p className="mb-2 text-sm">
        This permanently deletes this event, its inventory snapshot, and its {transactionCount} transaction
        {transactionCount === 1 ? '' : 's'}.
      </p>
      <p className="mb-4 text-sm text-zinc-500">
        Other events and your catalog are <strong>not</strong> affected. This can't be undone.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete Event'}
        </Button>
      </div>
    </Modal>
  )
}

function ActiveEventPanel({ eventId, eventName, startedAt }: { eventId: string; eventName: string; startedAt: number }) {
  const inventory = useLiveQuery(() => db.eventInventory.where('eventId').equals(eventId).toArray(), [eventId], [])
  const items = useItems()
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const settings = useLiveQuery(() => db.appSettings.get('singleton'), [], undefined)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addingStock, setAddingStock] = useState(false)

  const nameFor = (id: string, list?: { id: string; name: string }[]) => list?.find((x) => x.id === id)?.name ?? '—'

  async function closeEvent() {
    if (!confirm(`Close "${eventName}"? You can start a new event afterward.`)) return
    await db.events.update(eventId, { status: 'closed', endedAt: Date.now() })
  }

  async function adjustStock(itemId: string, delta: number) {
    const row = await db.eventInventory.get(`${eventId}_${itemId}`)
    if (!row) return
    const stockQty = Math.max(0, row.stockQty + delta)
    // startingQty gates checkout visibility (see useEventStartingStock) — it must never
    // fall (a sold-out item stays visible-but-disabled, per "Sold Out ≠ Gone"), but it
    // does need to rise here: an item Start Event left at 0 (deliberately not brought to
    // this market) has startingQty stuck at 0 forever unless something raises it — this
    // is that something, for the case where stock actually shows up mid-event and the
    // operator brings it in the ordinary way, via +, on the item's already-existing row
    // (as opposed to a brand-new item, which goes through "Add Item to Stock" instead).
    const startingQty = Math.max(row.startingQty, stockQty)
    await db.eventInventory.update(row.id, { stockQty, startingQty })
  }

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-medium">{eventName}</div>
          <div className="text-xs text-zinc-400">Started {new Date(startedAt).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAddingStock(true)}>
            Add Item to Stock
          </Button>
          <Button variant="secondary" onClick={closeEvent}>
            Close Event
          </Button>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            Delete Event
          </Button>
        </div>
      </div>
      {confirmingDelete && (
        <DeleteEventModal eventId={eventId} eventName={eventName} onClose={() => setConfirmingDelete(false)} />
      )}
      {addingStock && items && (
        <AddStockModal
          eventId={eventId}
          allItems={items}
          existingItemIds={new Set((inventory ?? []).map((inv) => inv.itemId))}
          onClose={() => setAddingStock(false)}
        />
      )}

      <ul className="max-h-96 divide-y divide-zinc-200 overflow-auto dark:divide-zinc-700">
        {inventory?.map((inv) => {
          const item = items?.find((i) => i.id === inv.itemId)
          if (!item) return null
          const threshold = item.lowStockThreshold ?? settings?.defaultLowStockThreshold ?? 5
          const low = inv.stockQty <= threshold
          return (
            <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {nameFor(item.categoryId, categories)} · {nameFor(item.fandomId, fandoms)} · {nameFor(item.characterId, characters)}
                {item.variantLabel && <span className="text-zinc-400"> — {item.variantLabel}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className={low ? 'font-semibold text-amber-600' : ''}>{inv.stockQty} in stock</span>
                <button type="button" className="rounded bg-zinc-100 px-2 dark:bg-zinc-700" onClick={() => adjustStock(inv.itemId, -1)}>
                  −
                </button>
                <button type="button" className="rounded bg-zinc-100 px-2 dark:bg-zinc-700" onClick={() => adjustStock(inv.itemId, 1)}>
                  +
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface CatalogRefWithSort {
  id: string
  name: string
  sortOrder: number
  active: boolean
}

/** Delisted (inactive) is purely an admin-side concept — it hides an item from restock
 *  lists (so you're never asked to stock something you meant to retire) and shows a
 *  badge in the Items list, but doesn't touch checkout directly. Checkout visibility is
 *  governed entirely by whether an item actually gets restocked: an item excluded here
 *  gets no eventInventory row at all, so it can never appear at checkout regardless of
 *  any active flag (see useEventStartingStock). */
function filterSellableItems(
  items: Item[],
  categories: CatalogRefWithSort[],
  fandoms: CatalogRefWithSort[],
  characters: CatalogRefWithSort[],
): Item[] {
  const activeCategoryIds = new Set(categories.filter((c) => c.active).map((c) => c.id))
  const activeFandomIds = new Set(fandoms.filter((f) => f.active).map((f) => f.id))
  const activeCharacterIds = new Set(characters.filter((c) => c.active).map((c) => c.id))
  return items.filter(
    (i) => i.active && activeCategoryIds.has(i.categoryId) && activeFandomIds.has(i.fandomId) && activeCharacterIds.has(i.characterId),
  )
}

/** Category order follows the admin's own category sort order; within a category,
 *  fandoms are grouped and sorted the same way, and characters within a fandom follow
 *  their admin sort order too — so the list reads the same way the catalog is organized. */
function groupItemsByCategoryFandom(
  items: Item[],
  categories: CatalogRefWithSort[],
  fandoms: CatalogRefWithSort[],
  characters: CatalogRefWithSort[],
) {
  const fandomById = new Map(fandoms.map((f) => [f.id, f]))
  const characterById = new Map(characters.map((c) => [c.id, c]))

  const itemsByCategory = new Map<string, Item[]>()
  for (const item of items) {
    const list = itemsByCategory.get(item.categoryId) ?? []
    list.push(item)
    itemsByCategory.set(item.categoryId, list)
  }

  return categories
    .filter((category) => itemsByCategory.has(category.id))
    .map((category) => {
      const itemsByFandom = new Map<string, Item[]>()
      for (const item of itemsByCategory.get(category.id)!) {
        const list = itemsByFandom.get(item.fandomId) ?? []
        list.push(item)
        itemsByFandom.set(item.fandomId, list)
      }

      const fandomGroups = [...itemsByFandom.entries()]
        .map(([fandomId, fandomItems]) => ({
          fandomId,
          fandomName: fandomById.get(fandomId)?.name ?? '—',
          fandomSortOrder: fandomById.get(fandomId)?.sortOrder ?? 0,
          items: fandomItems.slice().sort((a, b) => {
            const bySortOrder = (characterById.get(a.characterId)?.sortOrder ?? 0) - (characterById.get(b.characterId)?.sortOrder ?? 0)
            if (bySortOrder !== 0) return bySortOrder
            return (a.variantLabel ?? '').localeCompare(b.variantLabel ?? '')
          }),
        }))
        .sort((a, b) => a.fandomSortOrder - b.fandomSortOrder || a.fandomName.localeCompare(b.fandomName))

      return { categoryId: category.id, categoryName: category.name, fandomGroups }
    })
}

function QuantityGroupedList({
  groupedByCategory,
  characters,
  quantities,
  onChangeQuantity,
}: {
  groupedByCategory: ReturnType<typeof groupItemsByCategoryFandom>
  characters?: { id: string; name: string }[]
  quantities: Record<string, number>
  onChangeQuantity: (itemId: string, value: number) => void
}) {
  const characterName = (id: string) => characters?.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="mb-4 max-h-72 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      {groupedByCategory.map((categoryGroup) => (
        <div key={categoryGroup.categoryId}>
          <div className="sticky top-0 bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {categoryGroup.categoryName}
          </div>
          {categoryGroup.fandomGroups.map((fandomGroup) => (
            <div key={fandomGroup.fandomId}>
              <div className="px-2 py-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{fandomGroup.fandomName}</div>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {fandomGroup.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
                    <span>
                      {characterName(item.characterId)}
                      {item.variantLabel && <span className="text-zinc-400"> — {item.variantLabel}</span>}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                      value={quantities[item.id] ?? 0}
                      onChange={(e) => onChangeQuantity(item.id, e.target.valueAsNumber || 0)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
      {groupedByCategory.length === 0 && <p className="p-3 text-center text-sm text-zinc-400">Nothing here.</p>}
    </div>
  )
}

function AddStockModal({
  eventId,
  allItems,
  existingItemIds,
  onClose,
}: {
  eventId: string
  allItems: Item[]
  existingItemIds: Set<string>
  onClose: () => void
}) {
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Only items not already stocked for this event — active items that were delisted
  // (or didn't exist yet) at Start Event time, and have since been reactivated/added.
  const items = filterSellableItems(allItems, categories ?? [], fandoms ?? [], characters ?? []).filter(
    (i) => !existingItemIds.has(i.id),
  )
  const groupedByCategory = useMemo(
    () => groupItemsByCategoryFandom(items, categories ?? [], fandoms ?? [], characters ?? []),
    [items, categories, fandoms, characters],
  )

  async function handleAdd() {
    const toAdd = items.filter((i) => (quantities[i.id] ?? 0) > 0)
    if (toAdd.length === 0) {
      setError('Enter a quantity for at least one item.')
      return
    }
    setSubmitting(true)
    setError(null)
    await db.eventInventory.bulkAdd(
      toAdd.map((item) => ({
        id: `${eventId}_${item.id}`,
        eventId,
        itemId: item.id,
        stockQty: quantities[item.id],
        startingQty: quantities[item.id],
      })),
    )
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal open title="Add Item to Stock" onClose={onClose}>
      <p className="mb-2 text-sm text-zinc-500">
        Only items not already stocked for this event are listed — useful when you activate a category, fandom, or
        character mid-event, or add a brand-new item, and want it sellable right away instead of waiting for the next
        event.
      </p>
      <QuantityGroupedList
        groupedByCategory={groupedByCategory}
        characters={characters}
        quantities={quantities}
        onChangeQuantity={(itemId, value) => setQuantities((prev) => ({ ...prev, [itemId]: value }))}
      />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleAdd} disabled={submitting}>
          {submitting ? 'Adding…' : 'Add to Stock'}
        </Button>
      </div>
    </Modal>
  )
}

function StartEventModal({ items: allItems, onClose }: { items: Item[]; onClose: () => void }) {
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const [name, setName] = useState(`Event ${new Date().toLocaleDateString()}`)

  const items = filterSellableItems(allItems, categories ?? [], fandoms ?? [], characters ?? [])

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.id, 0])),
  )

  const groupedByCategory = useMemo(
    () => groupItemsByCategoryFandom(items, categories ?? [], fandoms ?? [], characters ?? []),
    [items, categories, fandoms, characters],
  )

  async function handleStart() {
    if (!name.trim()) return
    const now = Date.now()
    await db.transaction('rw', db.events, db.eventInventory, async () => {
      const current = await db.events.where('status').equals('active').first()
      if (current) {
        await db.events.update(current.id, { status: 'closed', endedAt: now })
      }
      const newEventId = uuid()
      await db.events.add({ id: newEventId, name: name.trim(), startedAt: now, status: 'active' })
      await db.eventInventory.bulkAdd(
        items.map((item) => ({
          id: `${newEventId}_${item.id}`,
          eventId: newEventId,
          itemId: item.id,
          stockQty: quantities[item.id] ?? 0,
          startingQty: quantities[item.id] ?? 0,
        })),
      )
    })
    onClose()
  }

  return (
    <Modal open title="Start New Event" onClose={onClose}>
      <TextField label="Event name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Restock quantities</p>
      <QuantityGroupedList
        groupedByCategory={groupedByCategory}
        characters={characters}
        quantities={quantities}
        onChangeQuantity={(itemId, value) => setQuantities((prev) => ({ ...prev, [itemId]: value }))}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleStart}>Start Event</Button>
      </div>
    </Modal>
  )
}
