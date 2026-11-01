// The types a point can have and what each one's pin looks like by default. Pure (pointLabels.test.ts).
import type { PinIcon, PointLabel } from './types'

export const POINT_DEFAULT = { label: 'none', icon: 'pin', color: '#dc2626' } as const satisfies { label: PointLabel; icon: PinIcon; color: string }

export const LABELS: { id: PointLabel; name: string; icon: PinIcon; color: string }[] = [
  // No type: the default, with no rows of its own in its Info box
  { id: 'none', name: 'None', icon: 'pin', color: POINT_DEFAULT.color },
  { id: 'area', name: 'Area', icon: 'pin', color: POINT_DEFAULT.color },
  { id: 'city', name: 'City', icon: 'city', color: '#2563eb' },
  { id: 'store', name: 'Store', icon: 'home', color: '#d97706' },
  { id: 'nature', name: 'Nature spot', icon: 'tree', color: '#16a34a' },
  { id: 'structure', name: 'Structure', icon: 'building', color: '#78716c' },
]

export const labelName = (id: PointLabel) => LABELS.find((l) => l.id === id)?.name ?? 'None'

/** The icon and colour a type starts with */
export const defaultsOf = (id: PointLabel) => {
  const l = LABELS.find((x) => x.id === id) ?? LABELS[0]
  return { icon: l.icon, color: l.color }
}
