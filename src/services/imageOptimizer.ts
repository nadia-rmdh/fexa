import { db } from '@/db/db'
import { resizeImage } from '@/lib/imageResize'

let started = false

/**
 * One-time pass that shrinks images stored before upload-time resizing existed.
 * Processes one image at a time (keeping memory flat on low-end devices) and keeps the
 * same id, so every Item/Fandom/Character thumbnail reference stays valid. Each image
 * is marked `optimized` afterwards — even when the resize couldn't decode or improve
 * it — so this never redoes work on later boots. Safe to call on every app boot.
 */
export async function optimizeStoredImages(): Promise<void> {
  if (started) return
  started = true

  const ids = await db.images.toCollection().primaryKeys()
  for (const id of ids) {
    const image = await db.images.get(id)
    if (!image || image.optimized) continue

    const resized = await resizeImage(image.blob)
    if (resized && resized.blob.size < image.blob.size) {
      await db.images.update(id, { blob: resized.blob, mimeType: resized.mimeType, optimized: true })
    } else {
      await db.images.update(id, { optimized: true })
    }
  }
}
