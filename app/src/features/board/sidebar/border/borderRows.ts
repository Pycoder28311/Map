import { PICK_ROW_WIDE, pickClass } from '../../../../components/ui/buttons/buttonStyles'
import type { Fill, ShapeType, Style } from '../../types'

export type BorderValues = { style: Style; fill: Fill | null; shape: ShapeType | null; param: number }

/** What the border sections get: the border's values and a way to change them (`commit` false: still moving, preview it) */
export type BorderSectionProps = { value: BorderValues; onChange: (patch: Partial<BorderValues>, commit: boolean) => void }

export const ROW = PICK_ROW_WIDE
export const pick = pickClass
