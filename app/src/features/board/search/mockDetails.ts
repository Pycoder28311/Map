// The fields an opened search result shows under its description. A point's are the rows of its Info box (the ones that are a label and a
// value); the other kinds have none of their own yet, so they show samples ("—").
import { infoboxOf } from '../pointInfo'
import type { BoardObject } from '../types'
import type { SearchEntry } from './mapSearch'

const BY_KIND: Record<Exclude<SearchEntry['kind'], 'point'>, string[]> = {
  border: ['Population', 'Area'],
  line: ['Length'],
  shape: ['Notes'],
}

/** The fields of a result: its name and a value ("—" for none) */
export function mockDetails(entry: SearchEntry, object?: BoardObject): { name: string; value: string }[] {
  if (entry.kind === 'point' && object?.kind === 'point') {
    return infoboxOf(object).rows.flatMap((row) => (row.kind === 'value' || row.kind === 'date' ? [{ name: row.label || 'Info', value: row.value || '—' }] : []))
  }
  if (entry.kind === 'point') return []
  return BY_KIND[entry.kind].map((name) => ({ name, value: '—' }))
}
