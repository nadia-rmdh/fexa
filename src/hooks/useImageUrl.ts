import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

/** Resolves a stored image id to a display-able object URL, revoking it on change/unmount. */
export function useImageUrl(imageId: string | undefined): string | undefined {
  const blob = useLiveQuery(async () => {
    if (!imageId) return undefined
    const image = await db.images.get(imageId)
    return image?.blob
  }, [imageId])

  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
