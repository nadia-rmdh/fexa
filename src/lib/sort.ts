/** Locale-aware, case-insensitive string comparator with natural number ordering
 *  (so "Item 2" sorts before "Item 10") — used wherever a list is displayed
 *  alphabetically rather than in the admin's custom drag-order (sortOrder). */
export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
}

/** Sorts a copy of `list` by comparing the given string keys in order, left to right
 *  acting as tie-breakers — e.g. sortByKeys(items, i => [categoryName(i), fandomName(i)]). */
export function sortByKeys<T>(list: T[], keysOf: (item: T) => string[]): T[] {
  return [...list].sort((a, b) => {
    const aKeys = keysOf(a)
    const bKeys = keysOf(b)
    for (let i = 0; i < Math.max(aKeys.length, bKeys.length); i++) {
      const cmp = compareStrings(aKeys[i] ?? '', bKeys[i] ?? '')
      if (cmp !== 0) return cmp
    }
    return 0
  })
}
