import { PICK_ROW, pickClass } from '../../../../components/ui/buttons/buttonStyles'
import type { Style } from '../../types'

/** The look of a pickable row in the line sections */
export const ROW = PICK_ROW
export const pick = pickClass

/** What the line sections get: the line's style and a way to change it (`commit` false: still moving, preview it; true: one undo step) */
export type StyleSectionProps = { style: Style; onChange: (style: Style, commit: boolean) => void }

/** The changed style from a patch of it */
export const styleSetter = ({ style, onChange }: StyleSectionProps) => (patch: Partial<Style>, commit = true) => onChange({ ...style, ...patch }, commit)
