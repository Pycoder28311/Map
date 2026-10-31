// MOCK DATA: the fields an opened search result shows under its description, by what it is, until each kind gets its own details.
// Nothing is saved: every value is "—" for now. Replacing this file is the only change the result card needs.
import type { PointLabel } from '../types'
import type { SearchEntry } from './mapSearch'

const BY_LABEL: Record<PointLabel, string[]> = {
  city: ['Population', 'Country', 'Founded'],
  country: ['Capital', 'Population', 'Area'],
  mountain: ['Height', 'Range'],
  sea: ['Area', 'Depth'],
  river: ['Length', 'Flows into'],
  lake: ['Area', 'Depth'],
  island: ['Area', 'Population'],
  organization: ['Founded', 'Headquarters'],
  other: ['Notes'],
}

const BY_KIND: Record<Exclude<SearchEntry['kind'], 'point'>, string[]> = {
  border: ['Population', 'Area'],
  line: ['Length'],
  shape: ['Notes'],
}

/** The sample fields of a result: its name and a value ("—" until there are real details) */
export function mockDetails(entry: SearchEntry): { name: string; value: string }[] {
  const names = entry.kind === 'point' ? BY_LABEL[entry.label ?? 'other'] : BY_KIND[entry.kind]
  return names.map((name) => ({ name, value: '—' }))
}
