import type { Fill, ShapeType, Style } from '../../types'

export type BorderValues = { style: Style; fill: Fill | null; shape: ShapeType | null; param: number }

/** What the border sections get: the border's values and a way to change them (`commit` false: still moving, preview it) */
export type BorderSectionProps = { value: BorderValues; onChange: (patch: Partial<BorderValues>, commit: boolean) => void }

export const ROW = 'flex w-full items-center gap-3 rounded-(--field-radius) border px-2 py-1 text-start transition-colors'
export const pick = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill')
