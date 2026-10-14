// The labels a point can have and what each one pins look like by default. Pure (pointLabels.test.ts).
import type { PinIcon, PointLabel } from './types'

export const POINT_DEFAULT = { label: 'other', icon: 'pin', color: '#dc2626' } as const satisfies { label: PointLabel; icon: PinIcon; color: string }

export const LABELS: { id: PointLabel; name: string; icon: PinIcon; color: string }[] = [
  { id: 'city', name: 'City', icon: 'city', color: '#2563eb' },
  { id: 'country', name: 'Country', icon: 'flag', color: '#7c3aed' },
  { id: 'mountain', name: 'Mountain', icon: 'mountain', color: '#78716c' },
  { id: 'sea', name: 'Sea', icon: 'water', color: '#0891b2' },
  { id: 'river', name: 'River', icon: 'water', color: '#0284c7' },
  { id: 'lake', name: 'Lake', icon: 'water', color: '#0ea5e9' },
  { id: 'island', name: 'Island', icon: 'tree', color: '#16a34a' },
  { id: 'organization', name: 'Organization', icon: 'building', color: '#d97706' },
  { id: 'other', name: 'Other', icon: 'pin', color: POINT_DEFAULT.color },
]

export const labelName = (id: PointLabel) => LABELS.find((l) => l.id === id)?.name ?? 'Other'

/** The icon and colour a label starts with */
export const defaultsOf = (id: PointLabel) => {
  const l = LABELS.find((x) => x.id === id) ?? LABELS[LABELS.length - 1]
  return { icon: l.icon, color: l.color }
}
