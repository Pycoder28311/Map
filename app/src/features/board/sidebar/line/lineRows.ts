import type { Style } from '../../types'

/** The look of a pickable row in the line sections */
export const ROW = 'flex w-full items-center rounded-(--field-radius) border px-2 py-1 transition-colors'
export const pick = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill')

/** What the line sections get: the line's style and a way to change it (`commit` false: still moving, preview it; true: one undo step) */
export type StyleSectionProps = { style: Style; onChange: (style: Style, commit: boolean) => void }

/** The changed style from a patch of it */
export const styleSetter = ({ style, onChange }: StyleSectionProps) => (patch: Partial<Style>, commit = true) => onChange({ ...style, ...patch }, commit)
