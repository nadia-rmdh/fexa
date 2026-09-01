import { useState } from 'react'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useBundleRules, useCategories, useCharacters, useFandoms } from '@/hooks/useLiveCatalog'
import { sortByKeys } from '@/lib/sort'
import type {
  BundleRule,
  BundleRuleType,
  QuantityInCategoryRule,
  CrossCategoryVariantMatchedRule,
  CharacterFullSetRule,
  BuyNGet1FreeRule,
} from '@/db/schema-types'
import { formatMoney } from '@/domain/pricing/money'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField, NumberField, SelectField, CheckboxField } from '@/components/ui/FormField'

const RULE_TYPE_LABELS: Record<BundleRuleType, string> = {
  quantity_in_category: 'Quantity in category',
  cross_category_variant_matched: 'Cross-category, variant-matched',
  character_full_set: 'Character full-set',
  buy_n_get_1_free: 'Buy N get 1 free',
}

function describeRule(rule: BundleRule, categoryName: (id: string) => string, characterName: (id: string) => string): string {
  switch (rule.type) {
    case 'quantity_in_category':
      return `${rule.quantity}× ${categoryName(rule.categoryId)} = ${formatMoney(rule.bundlePrice, 'IDR')}`
    case 'cross_category_variant_matched': {
      const matchedPart = `${rule.categoryIds.map(categoryName).join(' + ')} (${rule.allowedCharacterIds
        .map(characterName)
        .join(', ')})`
      const genericPart = rule.genericCategoryIds?.length
        ? ` + ${rule.genericCategoryIds.map(categoryName).join(' + ')} (any character)`
        : ''
      return `${matchedPart}${genericPart} = ${formatMoney(rule.bundlePrice, 'IDR')}`
    }
    case 'character_full_set':
      return `${rule.categoryIds.map(categoryName).join(' + ')}, any matching character = ${formatMoney(
        rule.bundlePrice,
        'IDR',
      )}`
    case 'buy_n_get_1_free':
      return `Buy ${rule.n} ${categoryName(rule.categoryId)}, get 1 free`
  }
}

export function BundleRulesScreen() {
  const rulesUnsorted = useBundleRules()
  const rules = rulesUnsorted && sortByKeys(rulesUnsorted, (r) => [r.name])
  const categories = useCategories()
  const characters = useCharacters()
  const fandoms = useFandoms()
  const [editing, setEditing] = useState<BundleRule | 'new' | null>(null)

  const categoryName = (id: string) => categories?.find((c) => c.id === id)?.name ?? '—'
  const characterName = (id: string) => characters?.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bundle Rules</h1>
        <Button onClick={() => setEditing('new')} disabled={!categories?.length}>
          Add Bundle Rule
        </Button>
      </div>

      {!categories?.length ? (
        <p className="py-6 text-center text-zinc-400">Add at least one Category first.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {rules?.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between py-3">
              <div>
                <div className={rule.active ? '' : 'text-zinc-400 line-through'}>{rule.name}</div>
                <div className="text-xs text-zinc-400">
                  {RULE_TYPE_LABELS[rule.type]} — {describeRule(rule, categoryName, characterName)}
                </div>
              </div>
              <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={() => setEditing(rule)}>
                Edit
              </button>
            </li>
          ))}
          {rules?.length === 0 && <li className="py-6 text-center text-zinc-400">No bundle rules yet.</li>}
        </ul>
      )}

      {editing && categories?.length ? (
        <BundleRuleFormModal
          rule={editing === 'new' ? undefined : editing}
          categories={categories}
          characters={characters ?? []}
          fandoms={fandoms ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="mb-3 max-h-40 overflow-auto rounded-lg border border-zinc-300 p-2 dark:border-zinc-600">
      {options.map((opt) => (
        <label key={opt.id} className="flex items-center gap-2 py-1 text-sm">
          <input type="checkbox" checked={selected.includes(opt.id)} onChange={() => onToggle(opt.id)} />
          {opt.name}
        </label>
      ))}
      {options.length === 0 && <p className="text-sm text-zinc-400">Nothing available yet.</p>}
    </div>
  )
}

/** Same as CheckboxGroup, but sections characters by fandom (sorted, with a header) so
 *  someone unfamiliar with the catalog — a hired helper covering a shift, say — can find
 *  a character by fandom instead of scanning one long alphabetical dump of everyone. */
function CharacterCheckboxGroup({
  characters,
  fandoms,
  selected,
  onToggle,
}: {
  characters: { id: string; name: string; fandomId: string }[]
  fandoms: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const fandomName = (id: string) => fandoms.find((f) => f.id === id)?.name ?? '—'
  const fandomIds = sortByKeys(
    [...new Set(characters.map((c) => c.fandomId))].map((id) => ({ id, name: fandomName(id) })),
    (f) => [f.name],
  )

  return (
    <div className="mb-3 max-h-56 overflow-auto rounded-lg border border-zinc-300 p-2 dark:border-zinc-600">
      {fandomIds.map(({ id: fandomId, name }) => (
        <div key={fandomId} className="mb-2 last:mb-0">
          <div className="sticky top-0 bg-zinc-100 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
            {name}
          </div>
          {sortByKeys(
            characters.filter((c) => c.fandomId === fandomId),
            (c) => [c.name],
          ).map((c) => (
            <label key={c.id} className="flex items-center gap-2 py-1 pl-2 text-sm">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => onToggle(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      ))}
      {characters.length === 0 && <p className="text-sm text-zinc-400">Nothing available yet.</p>}
    </div>
  )
}

function BundleRuleFormModal({
  rule,
  categories,
  characters,
  fandoms,
  onClose,
}: {
  rule?: BundleRule
  categories: { id: string; name: string }[]
  characters: { id: string; name: string; fandomId: string }[]
  fandoms: { id: string; name: string }[]
  onClose: () => void
}) {
  const [type, setType] = useState<BundleRuleType>(rule?.type ?? 'quantity_in_category')
  const [name, setName] = useState(rule?.name ?? '')
  const [active, setActive] = useState(rule?.active ?? true)

  const [categoryId, setCategoryId] = useState(
    (rule?.type === 'quantity_in_category' || rule?.type === 'buy_n_get_1_free') && rule.categoryId
      ? rule.categoryId
      : categories[0].id,
  )
  const [categoryIds, setCategoryIds] = useState<string[]>(
    rule?.type === 'cross_category_variant_matched' || rule?.type === 'character_full_set' ? rule.categoryIds : [],
  )
  const [genericCategoryIds, setGenericCategoryIds] = useState<string[]>(
    rule?.type === 'cross_category_variant_matched' ? (rule.genericCategoryIds ?? []) : [],
  )
  const [allowedCharacterIds, setAllowedCharacterIds] = useState<string[]>(
    rule?.type === 'cross_category_variant_matched' ? rule.allowedCharacterIds : [],
  )
  const [quantity, setQuantity] = useState<number | ''>(rule?.type === 'quantity_in_category' ? rule.quantity : 2)
  const [n, setN] = useState<number | ''>(rule?.type === 'buy_n_get_1_free' ? rule.n : 2)
  const [bundlePrice, setBundlePrice] = useState<number | ''>(
    rule && 'bundlePrice' in rule ? rule.bundlePrice : '',
  )
  const [error, setError] = useState<string | null>(null)

  function toggleCategoryId(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setGenericCategoryIds((prev) => prev.filter((x) => x !== id))
  }
  function toggleGenericCategoryId(id: string) {
    setGenericCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  function toggleCharacterId(id: string) {
    setAllowedCharacterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Enter a name.')
      return
    }
    const now = Date.now()
    const base = { id: rule?.id ?? uuid(), name: name.trim(), active: rule ? active : true, createdAt: rule?.createdAt ?? now, updatedAt: now }

    let toSave: BundleRule
    if (type === 'quantity_in_category') {
      if (quantity === '' || quantity < 2 || bundlePrice === '' || bundlePrice < 0) {
        setError('Enter a valid quantity (≥2) and bundle price.')
        return
      }
      toSave = { ...base, type, categoryId, quantity, bundlePrice } satisfies QuantityInCategoryRule
    } else if (type === 'cross_category_variant_matched') {
      if (
        categoryIds.length < 1 ||
        categoryIds.length + genericCategoryIds.length < 2 ||
        allowedCharacterIds.length === 0 ||
        bundlePrice === '' ||
        bundlePrice < 0
      ) {
        setError('Select ≥1 matched category (≥2 categories total including generic ones), at least one allowed character, and a bundle price.')
        return
      }
      toSave = {
        ...base,
        type,
        categoryIds,
        allowedCharacterIds,
        genericCategoryIds: genericCategoryIds.length ? genericCategoryIds : undefined,
        bundlePrice,
      } satisfies CrossCategoryVariantMatchedRule
    } else if (type === 'character_full_set') {
      if (categoryIds.length < 2 || bundlePrice === '' || bundlePrice < 0) {
        setError('Select ≥2 categories and a bundle price.')
        return
      }
      toSave = { ...base, type, categoryIds, bundlePrice } satisfies CharacterFullSetRule
    } else {
      if (n === '' || n < 1) {
        setError('Enter a valid N (≥1).')
        return
      }
      toSave = { ...base, type, categoryId, n } satisfies BuyNGet1FreeRule
    }

    if (rule) {
      await db.bundleRules.update(rule.id, toSave)
    } else {
      await db.bundleRules.add(toSave)
    }
    onClose()
  }

  async function handleDelete() {
    if (!rule) return
    await db.bundleRules.delete(rule.id)
    onClose()
  }

  return (
    <Modal open title={rule ? 'Edit Bundle Rule' : 'Add Bundle Rule'} onClose={onClose}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <SelectField
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value as BundleRuleType)}
        disabled={!!rule}
      >
        {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>

      {type === 'quantity_in_category' && (
        <>
          <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <NumberField label="Quantity" min={2} step={1} value={quantity} onChange={setQuantity} />
          <NumberField label="Bundle price" min={0} step={1} value={bundlePrice} onChange={setBundlePrice} />
        </>
      )}

      {type === 'cross_category_variant_matched' && (
        <>
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Matched categories (must share one allowed character)</span>
          <CheckboxGroup
            options={categories.filter((c) => !genericCategoryIds.includes(c.id))}
            selected={categoryIds}
            onToggle={toggleCategoryId}
          />
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Generic categories (any character, just needs 1 unit)
          </span>
          <CheckboxGroup
            options={categories.filter((c) => !categoryIds.includes(c.id))}
            selected={genericCategoryIds}
            onToggle={toggleGenericCategoryId}
          />
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Allowed characters</span>
          <CharacterCheckboxGroup characters={characters} fandoms={fandoms} selected={allowedCharacterIds} onToggle={toggleCharacterId} />
          <NumberField label="Bundle price" min={0} step={1} value={bundlePrice} onChange={setBundlePrice} />
        </>
      )}

      {type === 'character_full_set' && (
        <>
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Categories (exactly 1 from each, same character)</span>
          <CheckboxGroup options={categories} selected={categoryIds} onToggle={toggleCategoryId} />
          <NumberField label="Bundle price" min={0} step={1} value={bundlePrice} onChange={setBundlePrice} />
        </>
      )}

      {type === 'buy_n_get_1_free' && (
        <>
          <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <NumberField label="N (buy this many, get 1 more free)" min={1} step={1} value={n} onChange={setN} />
        </>
      )}

      {rule && <CheckboxField label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-between">
        {rule ? (
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        ) : (
          <span />
        )}
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
