// The info rows a point starts with, by its type (the same rows as an article's Info box: shared/infobox.ts). Pure (pointInfo.test.ts).
import { EMPTY_INFOBOX, type Infobox, type InfoRow } from '@map/shared'
import type { PointLabel, PointObject } from './types'

export type Spec = [kind: 'value' | 'date' | 'link' | 'text', label: string]

const SPECS: Record<PointLabel, Spec[]> = {
  none: [],
  area: [['value', 'Population'], ['value', 'Area'], ['text', 'Notes']],
  city: [['value', 'Population'], ['value', 'Country'], ['date', 'Founded']],
  store: [['value', 'Address'], ['value', 'Opening hours'], ['value', 'Phone'], ['link', 'Website']],
  nature: [['value', 'Protection'], ['value', 'Best season'], ['text', 'Notes']],
  structure: [['date', 'Built'], ['value', 'Architect'], ['value', 'Height'], ['value', 'Use']],
}

function row(prefix: string, [kind, text]: Spec, n: number): InfoRow {
  // The same id every time, so the rows something starts with are the same rows on every render
  const id = `${prefix}-${n}`
  if (kind === 'date') return { id, label: text, kind, value: '' }
  if (kind === 'link') return { id, label: text, kind, text: '', url: '' }
  if (kind === 'text') return { id, label: text, kind, text: '', bullets: false }
  return { id, label: text, kind, value: '' }
}

export const infoboxFrom = (prefix: string, specs: Spec[]): Infobox => ({ ...EMPTY_INFOBOX, rows: specs.map((spec, n) => row(prefix, spec, n)) })

/** The Info box a type of point starts with: its rows, empty */
export const defaultInfobox = (label: PointLabel): Infobox => infoboxFrom(label, SPECS[label])

/** The point's Info box: its own once it was changed, else its type's */
export const infoboxOf = (point: Pick<PointObject, 'label' | 'infobox'>): Infobox => point.infobox ?? defaultInfobox(point.label)
