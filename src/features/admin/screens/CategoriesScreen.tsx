import { useState } from 'react'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useCategories } from '@/hooks/useLiveCatalog'
import { sortByKeys } from '@/lib/sort'
import type { Category } from '@/db/schema-types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField, CheckboxField } from '@/components/ui/FormField'

export function CategoriesScreen() {
  const categoriesUnsorted = useCategories()
  const categories = categoriesUnsorted && sortByKeys(categoriesUnsorted, (c) => [c.name])
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button onClick={() => setEditing('new')}>Add Category</Button>
      </div>

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {categories?.map((category) => (
          <li key={category.id} className="flex items-center justify-between py-3">
            <span className={category.active ? '' : 'text-zinc-400 line-through'}>{category.name}</span>
            <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={() => setEditing(category)}>
              Edit
            </button>
          </li>
        ))}
        {categories?.length === 0 && <li className="py-6 text-center text-zinc-400">No categories yet.</li>}
      </ul>

      {editing && (
        <CategoryFormModal
          category={editing === 'new' ? undefined : editing}
          nextSortOrder={categories?.length ?? 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function CategoryFormModal({
  category,
  nextSortOrder,
  onClose,
}: {
  category?: Category
  nextSortOrder: number
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [active, setActive] = useState(category?.active ?? true)

  async function handleSave() {
    if (!name.trim()) return
    if (category) {
      await db.categories.update(category.id, { name: name.trim(), active })
    } else {
      await db.categories.add({ id: uuid(), name: name.trim(), sortOrder: nextSortOrder, active: true })
    }
    onClose()
  }

  async function handleDelete() {
    if (!category) return
    const inUse = await db.items.where('categoryId').equals(category.id).count()
    if (inUse > 0) {
      alert(`Can't delete — ${inUse} item(s) still use this category. Deactivate it instead.`)
      return
    }
    await db.categories.delete(category.id)
    onClose()
  }

  return (
    <Modal open title={category ? 'Edit Category' : 'Add Category'} onClose={onClose}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      {category && <CheckboxField label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      <div className="mt-4 flex justify-between">
        {category ? (
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
