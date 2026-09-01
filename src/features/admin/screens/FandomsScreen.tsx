import { useState } from 'react'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useFandoms } from '@/hooks/useLiveCatalog'
import { useImageUrl } from '@/hooks/useImageUrl'
import { sortByKeys } from '@/lib/sort'
import type { Fandom } from '@/db/schema-types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField, CheckboxField } from '@/components/ui/FormField'
import { ImageUpload } from '@/components/ui/ImageUpload'

export function FandomsScreen() {
  const fandomsUnsorted = useFandoms()
  const fandoms = fandomsUnsorted && sortByKeys(fandomsUnsorted, (f) => [f.name])
  const [editing, setEditing] = useState<Fandom | 'new' | null>(null)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fandoms</h1>
        <Button onClick={() => setEditing('new')}>Add Fandom</Button>
      </div>

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {fandoms?.map((fandom) => (
          <FandomRow key={fandom.id} fandom={fandom} onEdit={() => setEditing(fandom)} />
        ))}
        {fandoms?.length === 0 && <li className="py-6 text-center text-zinc-400">No fandoms yet.</li>}
      </ul>

      {editing && (
        <FandomFormModal
          fandom={editing === 'new' ? undefined : editing}
          nextSortOrder={fandoms?.length ?? 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function FandomRow({ fandom, onEdit }: { fandom: Fandom; onEdit: () => void }) {
  const url = useImageUrl(fandom.thumbnailImageId)
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <span className={fandom.active ? '' : 'text-zinc-400 line-through'}>{fandom.name}</span>
      </div>
      <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={onEdit}>
        Edit
      </button>
    </li>
  )
}

function FandomFormModal({
  fandom,
  nextSortOrder,
  onClose,
}: {
  fandom?: Fandom
  nextSortOrder: number
  onClose: () => void
}) {
  const [name, setName] = useState(fandom?.name ?? '')
  const [active, setActive] = useState(fandom?.active ?? true)
  const [thumbnailImageId, setThumbnailImageId] = useState(fandom?.thumbnailImageId)

  async function handleSave() {
    if (!name.trim()) return
    if (fandom) {
      await db.fandoms.update(fandom.id, { name: name.trim(), active, thumbnailImageId })
    } else {
      await db.fandoms.add({ id: uuid(), name: name.trim(), sortOrder: nextSortOrder, active: true, thumbnailImageId })
    }
    onClose()
  }

  async function handleDelete() {
    if (!fandom) return
    const inUse = await db.items.where('fandomId').equals(fandom.id).count()
    if (inUse > 0) {
      alert(`Can't delete — ${inUse} item(s) still use this fandom. Deactivate it instead.`)
      return
    }
    await db.fandoms.delete(fandom.id)
    onClose()
  }

  return (
    <Modal open title={fandom ? 'Edit Fandom' : 'Add Fandom'} onClose={onClose}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <ImageUpload label="Thumbnail" value={thumbnailImageId} onChange={setThumbnailImageId} />
      {fandom && <CheckboxField label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      <div className="mt-4 flex justify-between">
        {fandom ? (
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
