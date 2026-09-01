import { useRef } from 'react'
import { db } from '@/db/db'
import { uuid } from '@/lib/uuid'
import { useImageUrl } from '@/hooks/useImageUrl'

interface ImageUploadProps {
  label: string
  value: string | undefined
  onChange: (imageId: string | undefined) => void
}

export function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const url = useImageUrl(value)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const id = uuid()
    await db.images.add({ id, blob: file, mimeType: file.type })
    onChange(id)
  }

  return (
    <div className="mb-3">
      <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900"
        >
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            'Add'
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
