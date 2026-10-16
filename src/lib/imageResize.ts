/** Longest edge, in pixels, that stored images are scaled down to. Tiles render at
 *  ~100–200 CSS px, so 512 stays sharp on 2–3x screens while a typical 4000px camera
 *  photo (3–8 MB) comes out around 20–60 KB. */
export const MAX_IMAGE_EDGE = 512
const QUALITY = 0.8

export interface ResizedImage {
  blob: Blob
  mimeType: string
}

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality: QUALITY }).catch(() => null)
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/**
 * Scales an image down to fit MAX_IMAGE_EDGE and re-encodes it as WebP (or JPEG where
 * the browser can't encode WebP — older Safari silently hands back PNG instead).
 * Runs fully offline via createImageBitmap + canvas. Returns null when the browser
 * can't decode the file (e.g. HEIC outside Safari), so callers can keep the original.
 */
export async function resizeImage(source: Blob): Promise<ResizedImage | null> {
  let bitmap: ImageBitmap
  try {
    // imageOrientation 'from-image' applies EXIF rotation so phone photos aren't sideways.
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  } catch {
    return null
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height })
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!ctx) return null
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    for (const type of ['image/webp', 'image/jpeg']) {
      const blob = await canvasToBlob(canvas, type)
      if (blob && blob.type === type) return { blob, mimeType: type }
    }
    return null
  } finally {
    bitmap.close()
  }
}
