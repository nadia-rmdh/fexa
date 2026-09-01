import { useState } from 'react'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useCharacters, useFandoms } from '@/hooks/useLiveCatalog'
import { useImageUrl } from '@/hooks/useImageUrl'
import { sortByKeys } from '@/lib/sort'
import type { CharacterVariant } from '@/db/schema-types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormField'
import { ImageUpload } from '@/components/ui/ImageUpload'

export function CharactersScreen() {
  const fandoms = useFandoms()
  const [fandomFilter, setFandomFilter] = useState<string>('')
  const charactersUnsorted = useCharacters(fandomFilter || undefined)
  const [editing, setEditing] = useState<CharacterVariant | 'new' | null>(null)

  const fandomName = (id: string) => fandoms?.find((f) => f.id === id)?.name ?? '—'
  // Grouped by fandom first (a no-op when a single fandom is already filtered) so an
  // unfiltered "All fandoms" view doesn't interleave characters from different fandoms.
  const characters = charactersUnsorted && sortByKeys(charactersUnsorted, (c) => [fandomName(c.fandomId), c.name])

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Characters</h1>
        <Button onClick={() => setEditing('new')} disabled={!fandoms?.length}>
          Add Character
        </Button>
      </div>

      {!fandoms?.length ? (
        <p className="py-6 text-center text-zinc-400">Add a Fandom first.</p>
      ) : (
        <>
          <select
            className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            value={fandomFilter}
            onChange={(e) => setFandomFilter(e.target.value)}
          >
            <option value="">All fandoms</option>
            {fandoms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {characters?.map((character) => (
              <CharacterRow
                key={character.id}
                character={character}
                fandomName={fandomName(character.fandomId)}
                onEdit={() => setEditing(character)}
              />
            ))}
            {characters?.length === 0 && <li className="py-6 text-center text-zinc-400">No characters yet.</li>}
          </ul>
        </>
      )}

      {editing && fandoms?.length ? (
        <CharacterFormModal
          character={editing === 'new' ? undefined : editing}
          fandoms={fandoms}
          defaultFandomId={fandomFilter || fandoms[0].id}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function CharacterRow({
  character,
  fandomName,
  onEdit,
}: {
  character: CharacterVariant
  fandomName: string
  onEdit: () => void
}) {
  const url = useImageUrl(character.thumbnailImageId)
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <div className={character.active ? '' : 'text-zinc-400 line-through'}>{character.name}</div>
          <div className="text-xs text-zinc-400">{fandomName}</div>
        </div>
      </div>
      <button type="button" className="text-sm text-zinc-500 hover:underline" onClick={onEdit}>
        Edit
      </button>
    </li>
  )
}

function CharacterFormModal({
  character,
  fandoms,
  defaultFandomId,
  onClose,
}: {
  character?: CharacterVariant
  fandoms: { id: string; name: string }[]
  defaultFandomId: string
  onClose: () => void
}) {
  const [name, setName] = useState(character?.name ?? '')
  const [fandomId, setFandomId] = useState(character?.fandomId ?? defaultFandomId)
  const [active, setActive] = useState(character?.active ?? true)
  const [thumbnailImageId, setThumbnailImageId] = useState(character?.thumbnailImageId)

  async function handleSave() {
    if (!name.trim()) return
    if (character) {
      await db.characters.update(character.id, { name: name.trim(), fandomId, active, thumbnailImageId })
    } else {
      await db.characters.add({
        id: uuid(),
        name: name.trim(),
        fandomId,
        sortOrder: Date.now(),
        active: true,
        thumbnailImageId,
      })
    }
    onClose()
  }

  async function handleDelete() {
    if (!character) return
    const inUse = await db.items.where('characterId').equals(character.id).count()
    if (inUse > 0) {
      alert(`Can't delete — ${inUse} item(s) still use this character. Deactivate it instead.`)
      return
    }
    await db.characters.delete(character.id)
    onClose()
  }

  return (
    <Modal open title={character ? 'Edit Character' : 'Add Character'} onClose={onClose}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <SelectField label="Fandom" value={fandomId} onChange={(e) => setFandomId(e.target.value)}>
        {fandoms.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </SelectField>
      <ImageUpload label="Thumbnail" value={thumbnailImageId} onChange={setThumbnailImageId} />
      {character && <CheckboxField label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      <div className="mt-4 flex justify-between">
        {character ? (
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
