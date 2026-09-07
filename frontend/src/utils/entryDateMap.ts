import type { EntryResponse } from '../types'

export function buildEntryDateMap(items: EntryResponse[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of items) {
    map.set(entry.date, entry.id)
  }
  return map
}
