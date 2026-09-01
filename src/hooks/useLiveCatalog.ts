import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [], [])
}

export function useFandoms() {
  return useLiveQuery(() => db.fandoms.orderBy('sortOrder').toArray(), [], [])
}

export function useCharacters(fandomId?: string) {
  return useLiveQuery(async () => {
    const all = await db.characters.orderBy('sortOrder').toArray()
    return fandomId ? all.filter((c) => c.fandomId === fandomId) : all
  }, [fandomId], [])
}

export function useItems() {
  return useLiveQuery(() => db.items.toArray(), [], [])
}

export function useBundleRules() {
  return useLiveQuery(() => db.bundleRules.toArray(), [], [])
}

export function useEvents() {
  return useLiveQuery(() => db.events.orderBy('startedAt').reverse().toArray(), [], [])
}

export function useActiveEvent() {
  return useLiveQuery(() => db.events.where('status').equals('active').first(), [], undefined)
}
