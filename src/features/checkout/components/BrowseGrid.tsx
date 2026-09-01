import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useCategories, useCharacters, useFandoms, useItems } from '@/hooks/useLiveCatalog'
import { useEventStartingStock } from '@/hooks/useEventInventory'
import { useImageUrl } from '@/hooks/useImageUrl'
import { useCartStore } from '@/stores/cartStore'
import { sortByKeys } from '@/lib/sort'
import { Tile } from '@/components/ui/Tile'
import { StockAwareTile } from './StockAwareTile'

interface BrowseGridProps {
  eventId: string
  stockMap: Record<string, number>
}

export function BrowseGrid({ eventId, stockMap }: BrowseGridProps) {
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const items = useItems()
  const startingStock = useEventStartingStock(eventId)
  const settings = useLiveQuery(() => db.appSettings.get('singleton'), [], undefined)
  const addItem = useCartStore((s) => s.addItem)
  // Select the raw `lines` array (not the `quantityOf` accessor) so this component
  // re-renders when cart quantities change — a selected function reference is stable
  // across store updates and would silently skip re-renders otherwise.
  const cartLines = useCartStore((s) => s.lines)
  const quantityOf = (itemId: string) => cartLines.find((l) => l.itemId === itemId)?.quantity ?? 0

  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [fandomId, setFandomId] = useState<string | null>(null)

  // Checkout visibility is governed entirely by whether an item was restocked (>0) for
  // THIS event — not by the catalog's active flags on category/fandom/character/item,
  // which only affect the admin Items list (badge) and the Start Event restock list now.
  // startingQty is fixed at "Start Event" time and never changes afterward, so an item
  // that sells out mid-event stays visible here (still tappable, just shows "Out" via
  // stockMap below) — it only disappears if it was never stocked for this event at all.
  const sellableItems = useMemo(() => items?.filter((i) => (startingStock[i.id] ?? 0) > 0) ?? [], [items, startingStock])

  const fandomIdsInCategory = useMemo(() => {
    if (!categoryId) return new Set<string>()
    return new Set(sellableItems.filter((i) => i.categoryId === categoryId).map((i) => i.fandomId))
  }, [sellableItems, categoryId])

  const itemsInCategoryFandom = useMemo(() => {
    if (!categoryId || !fandomId) return []
    const filtered = sellableItems.filter((i) => i.categoryId === categoryId && i.fandomId === fandomId)
    const characterName = new Map((characters ?? []).map((c) => [c.id, c.name]))
    // Alphabetical by character name, then by variant label so same-character
    // variants stay grouped next to each other.
    return sortByKeys(filtered, (i) => [characterName.get(i.characterId) ?? '', i.variantLabel ?? ''])
  }, [sellableItems, categoryId, fandomId, characters])

  const categoryIdsWithStock = useMemo(() => new Set(sellableItems.map((i) => i.categoryId)), [sellableItems])

  const category = categories?.find((c) => c.id === categoryId)
  const fandom = fandoms?.find((f) => f.id === fandomId)
  const visibleCategories = sortByKeys(categories?.filter((c) => categoryIdsWithStock.has(c.id)) ?? [], (c) => [c.name])

  if (categoryId && fandomId) {
    return (
      <div className="p-3">
        <CategoryQuickPick
          categories={visibleCategories}
          activeCategoryId={categoryId}
          onPick={(id) => { setCategoryId(id); setFandomId(null) }}
        />
        <Breadcrumb
          parts={[
            { label: 'Categories', onClick: () => { setCategoryId(null); setFandomId(null) } },
            { label: category?.name ?? '', onClick: () => setFandomId(null) },
            { label: fandom?.name ?? '' },
          ]}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {itemsInCategoryFandom.map((item) => {
            const character = characters?.find((c) => c.id === item.characterId)
            const available = (stockMap[item.id] ?? 0) - quantityOf(item.id)
            const threshold = item.lowStockThreshold ?? settings?.defaultLowStockThreshold ?? 5
            const label = item.variantLabel ? `${character?.name ?? '—'} — ${item.variantLabel}` : (character?.name ?? '—')
            return (
              <StockAwareTile
                key={item.id}
                label={label}
                imageId={item.thumbnailImageId ?? character?.thumbnailImageId}
                available={available}
                low={available > 0 && available <= threshold}
                onTap={() => addItem(eventId, item.id)}
              />
            )
          })}
          {itemsInCategoryFandom.length === 0 && (
            <p className="col-span-full py-6 text-center text-zinc-400">No items here.</p>
          )}
        </div>
      </div>
    )
  }

  if (categoryId) {
    const visibleFandoms = sortByKeys(fandoms?.filter((f) => fandomIdsInCategory.has(f.id)) ?? [], (f) => [f.name])
    return (
      <div className="p-3">
        <CategoryQuickPick categories={visibleCategories} activeCategoryId={categoryId} onPick={(id) => setCategoryId(id)} />
        <Breadcrumb parts={[{ label: 'Categories', onClick: () => setCategoryId(null) }, { label: category?.name ?? '' }]} />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {visibleFandoms.map((f) => (
            <FandomTile key={f.id} label={f.name} imageId={f.thumbnailImageId} onTap={() => setFandomId(f.id)} />
          ))}
          {visibleFandoms.length === 0 && <p className="col-span-full py-6 text-center text-zinc-400">No fandoms here.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            className="flex aspect-square items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-lg font-medium shadow-sm active:scale-95 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {c.name}
          </button>
        ))}
        {visibleCategories.length === 0 && (
          <p className="col-span-full py-6 text-center text-zinc-400">Add categories and items in Admin first.</p>
        )}
      </div>
    </div>
  )
}

function CategoryQuickPick({
  categories,
  activeCategoryId,
  onPick,
}: {
  categories: { id: string; name: string }[]
  activeCategoryId: string
  onPick: (id: string) => void
}) {
  return (
    <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium active:scale-95 ${
            c.id === activeCategoryId
              ? 'border-zinc-800 bg-zinc-800 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
              : 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

function FandomTile({ label, imageId, onTap }: { label: string; imageId?: string; onTap: () => void }) {
  const url = useImageUrl(imageId)
  return <Tile label={label} imageUrl={url} onClick={onTap} />
}

function Breadcrumb({ parts }: { parts: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 text-sm text-zinc-500">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {part.onClick ? (
            <button type="button" onClick={part.onClick} className="hover:underline">
              {part.label}
            </button>
          ) : (
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{part.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
