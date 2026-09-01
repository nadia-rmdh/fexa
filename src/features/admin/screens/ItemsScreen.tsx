import { useState } from 'react'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useCategories, useCharacters, useFandoms, useItems } from '@/hooks/useLiveCatalog'
import { useImageUrl } from '@/hooks/useImageUrl'
import { sortByKeys } from '@/lib/sort'
import type { CharacterVariant, Item } from '@/db/schema-types'
import { formatMoney } from '@/domain/pricing/money'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { NumberField, SelectField, CheckboxField, TextField } from '@/components/ui/FormField'
import { ImageUpload } from '@/components/ui/ImageUpload'

export function ItemsScreen() {
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const items = useItems()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const canAddItem = !!categories?.length && !!fandoms?.length && !!characters?.length

  const nameFor = (id: string, list?: { id: string; name: string }[]) => list?.find((x) => x.id === id)?.name ?? '—'

  const filteredItems = items?.filter((i) => !categoryFilter || i.categoryId === categoryFilter)
  const visibleItems =
    filteredItems &&
    sortByKeys(filteredItems, (i) => [
      nameFor(i.categoryId, categories),
      nameFor(i.fandomId, fandoms),
      nameFor(i.characterId, characters),
      i.variantLabel ?? '',
    ])

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Items</h1>
        <Button onClick={() => setAdding(true)} disabled={!canAddItem}>
          Add Items
        </Button>
      </div>

      {!canAddItem ? (
        <p className="py-6 text-center text-zinc-400">Add at least one Category, Fandom, and Character first.</p>
      ) : (
        <>
          <select
            className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {visibleItems?.map((item) => {
              const delistedReasons = [
                categories?.find((c) => c.id === item.categoryId)?.active === false && 'category',
                fandoms?.find((f) => f.id === item.fandomId)?.active === false && 'fandom',
                characters?.find((c) => c.id === item.characterId)?.active === false && 'variant',
              ].filter((r): r is string => !!r)
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  categoryName={nameFor(item.categoryId, categories)}
                  fandomName={nameFor(item.fandomId, fandoms)}
                  characterName={nameFor(item.characterId, characters)}
                  delistedReasons={delistedReasons}
                  onEdit={() => setEditingItem(item)}
                />
              )
            })}
            {visibleItems?.length === 0 && <li className="py-6 text-center text-zinc-400">No items yet.</li>}
          </ul>
        </>
      )}

      {adding && categories?.length && fandoms?.length && characters?.length ? (
        <AddItemsModal
          categories={categories}
          fandoms={fandoms}
          characters={characters}
          existingItems={items ?? []}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {editingItem && categories?.length && fandoms?.length && characters?.length ? (
        <EditItemModal
          item={editingItem}
          categories={categories}
          fandoms={fandoms}
          characters={characters}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  )
}

function CrossedCartIcon() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M1 1h2l1.6 8.2a1.5 1.5 0 0 0 1.5 1.3h5.6a1.5 1.5 0 0 0 1.47-1.2L14 4H4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="14" r="1" fill="currentColor" stroke="none" />
      <path d="M1 1l14 14" strokeLinecap="round" />
    </svg>
  )
}

function ItemRow({
  item,
  categoryName,
  fandomName,
  characterName,
  delistedReasons,
  onEdit,
}: {
  item: Item
  categoryName: string
  fandomName: string
  characterName: string
  delistedReasons: string[]
  onEdit: () => void
}) {
  const url = useImageUrl(item.thumbnailImageId)
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <div className={item.active ? '' : 'text-zinc-400 line-through'}>
            {categoryName} · {fandomName} · {characterName}
            {item.variantLabel && <span className="text-zinc-400"> — {item.variantLabel}</span>}
            {delistedReasons.length > 0 && (
              <span
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400"
                title={`Its ${delistedReasons.join(' and ')} ${delistedReasons.length === 1 ? 'is' : 'are'} inactive — this item can't be sold until it's turned back on`}
              >
                <CrossedCartIcon />
                Delisted {delistedReasons.join(' + ')}
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400">{formatMoney(item.unitPrice, 'IDR')}</div>
        </div>
      </div>
      <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={onEdit}>
        Edit
      </button>
    </li>
  )
}

interface CatalogRef {
  id: string
  name: string
}

/** Bulk-create items: pick one Category + Fandom, then check off any number of that
 *  fandom's characters — all created at once with one shared price/threshold. Characters
 *  that already have an item in this Category+Fandom are shown disabled, not hidden, so
 *  it's obvious at a glance what's still missing when finishing off a partially-built set. */
function AddItemsModal({
  categories,
  fandoms,
  characters,
  existingItems,
  onClose,
}: {
  categories: CatalogRef[]
  fandoms: CatalogRef[]
  characters: CharacterVariant[]
  existingItems: Item[]
  onClose: () => void
}) {
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [fandomId, setFandomId] = useState(fandoms[0].id)
  const [variantLabel, setVariantLabel] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const normalizedLabel = variantLabel.trim() || undefined

  const charactersInFandom = characters.filter((c) => c.fandomId === fandomId)
  // Keyed by character + variant label together — a second design for the same
  // character isn't a duplicate, but re-adding the exact same label is.
  const existingKeys = new Set(
    existingItems
      .filter((i) => i.categoryId === categoryId && i.fandomId === fandomId)
      .map((i) => `${i.characterId}::${i.variantLabel ?? ''}`),
  )
  const isAlreadyAdded = (characterId: string) => existingKeys.has(`${characterId}::${normalizedLabel ?? ''}`)
  const availableCharacters = charactersInFandom.filter((c) => !isAlreadyAdded(c.id))

  // Selection is scoped to one Category+Fandom+Label at a time — changing any of them
  // resets it rather than silently carrying over checks that no longer refer to visible
  // rows. Adjusted during render (React's recommended pattern) instead of an effect,
  // since an effect would commit one stale render with the old selection before catching up.
  const [scopeKey, setScopeKey] = useState(`${categoryId}|${fandomId}|${normalizedLabel ?? ''}`)
  const currentScopeKey = `${categoryId}|${fandomId}|${normalizedLabel ?? ''}`
  if (currentScopeKey !== scopeKey) {
    setScopeKey(currentScopeKey)
    setCheckedIds(new Set())
  }

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setCheckedIds((prev) => (prev.size === availableCharacters.length ? new Set() : new Set(availableCharacters.map((c) => c.id))))
  }

  async function handleCreate() {
    if (unitPrice === '' || unitPrice < 0) {
      setError('Enter a valid price.')
      return
    }
    if (checkedIds.size === 0) {
      setError('Check at least one character.')
      return
    }
    setSubmitting(true)
    setError(null)
    const now = Date.now()
    for (const characterId of checkedIds) {
      await db.items.add({
        id: uuid(),
        categoryId,
        fandomId,
        characterId,
        variantLabel: normalizedLabel,
        unitPrice,
        lowStockThreshold: lowStockThreshold === '' ? undefined : lowStockThreshold,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal open title="Add Items" onClose={onClose}>
      <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Fandom" value={fandomId} onChange={(e) => setFandomId(e.target.value)}>
        {fandoms.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Variant / design label (optional)"
        placeholder="e.g. Design B — leave blank for the only/default design"
        value={variantLabel}
        onChange={(e) => setVariantLabel(e.target.value)}
      />

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Characters / Variants</span>
          {availableCharacters.length > 0 && (
            <button type="button" className="text-xs text-zinc-500 hover:underline" onClick={toggleSelectAll}>
              {checkedIds.size === availableCharacters.length ? 'Select none' : 'Select all'}
            </button>
          )}
        </div>
        <div className="max-h-52 overflow-auto rounded-lg border border-zinc-300 p-2 dark:border-zinc-600">
          {charactersInFandom.length === 0 && <p className="text-sm text-zinc-400">No characters in this fandom.</p>}
          {charactersInFandom.map((c) => {
            const alreadyExists = isAlreadyAdded(c.id)
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 py-1 text-sm ${alreadyExists ? 'text-zinc-400' : ''}`}
              >
                <input
                  type="checkbox"
                  disabled={alreadyExists}
                  checked={alreadyExists || checkedIds.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                {c.name}
                {alreadyExists && <span className="text-xs">(already added)</span>}
              </label>
            )
          })}
        </div>
      </div>

      <NumberField label="Unit price (à la carte, applied to all checked)" min={0} step={1} value={unitPrice} onChange={setUnitPrice} />
      <NumberField
        label="Low-stock threshold (blank = use default)"
        min={0}
        step={1}
        value={lowStockThreshold}
        onChange={setLowStockThreshold}
      />
      <p className="mb-3 text-xs text-zinc-400">Thumbnails can be added per item afterward by editing it.</p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={submitting || checkedIds.size === 0}>
          {submitting ? 'Adding…' : `Add ${checkedIds.size || ''} Item${checkedIds.size === 1 ? '' : 's'}`}
        </Button>
      </div>
    </Modal>
  )
}

function EditItemModal({
  item,
  categories,
  fandoms,
  characters,
  onClose,
}: {
  item: Item
  categories: CatalogRef[]
  fandoms: CatalogRef[]
  characters: CharacterVariant[]
  onClose: () => void
}) {
  const [categoryId, setCategoryId] = useState(item.categoryId)
  const [fandomId, setFandomId] = useState(item.fandomId)
  const charactersInFandom = characters.filter((c) => c.fandomId === fandomId)
  const [characterId, setCharacterId] = useState(item.characterId)
  const [variantLabel, setVariantLabel] = useState(item.variantLabel ?? '')
  const [unitPrice, setUnitPrice] = useState<number | ''>(item.unitPrice)
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(item.lowStockThreshold ?? '')
  const [active, setActive] = useState(item.active)
  const [thumbnailImageId, setThumbnailImageId] = useState(item.thumbnailImageId)
  const [error, setError] = useState<string | null>(null)

  function handleFandomChange(newFandomId: string) {
    setFandomId(newFandomId)
    const stillValid = characters.some((c) => c.id === characterId && c.fandomId === newFandomId)
    if (!stillValid) {
      const firstForFandom = characters.find((c) => c.fandomId === newFandomId)
      setCharacterId(firstForFandom?.id ?? '')
    }
  }

  async function handleSave() {
    if (unitPrice === '' || unitPrice < 0) {
      setError('Enter a valid price.')
      return
    }
    if (!characterId) {
      setError('This fandom has no characters yet — add one in Admin → Characters first.')
      return
    }
    await db.items.update(item.id, {
      categoryId,
      fandomId,
      characterId,
      variantLabel: variantLabel.trim() || undefined,
      unitPrice,
      lowStockThreshold: lowStockThreshold === '' ? undefined : lowStockThreshold,
      active,
      thumbnailImageId,
      updatedAt: Date.now(),
    })
    onClose()
  }

  async function handleDelete() {
    await db.items.delete(item.id)
    onClose()
  }

  return (
    <Modal open title="Edit Item" onClose={onClose}>
      <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Fandom" value={fandomId} onChange={(e) => handleFandomChange(e.target.value)}>
        {fandoms.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Character / Variant"
        value={characterId}
        onChange={(e) => setCharacterId(e.target.value)}
        disabled={charactersInFandom.length === 0}
      >
        {charactersInFandom.length === 0 && <option value="">No characters in this fandom</option>}
        {charactersInFandom.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Variant / design label (optional)"
        placeholder="e.g. Design B — leave blank for the only/default design"
        value={variantLabel}
        onChange={(e) => setVariantLabel(e.target.value)}
      />
      <NumberField label="Unit price (à la carte)" min={0} step={1} value={unitPrice} onChange={setUnitPrice} />
      <NumberField
        label="Low-stock threshold (blank = use default)"
        min={0}
        step={1}
        value={lowStockThreshold}
        onChange={setLowStockThreshold}
      />
      <ImageUpload label="Thumbnail" value={thumbnailImageId} onChange={setThumbnailImageId} />
      <CheckboxField label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-between">
        <Button variant="danger" onClick={handleDelete}>
          Delete
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}
