// Making pins and changing their label. Pure (drawPoint.test.ts).
import type { Patch } from './changes'
import type { Draft } from './changes'
import { defaultsOf } from './pointLabels'
import type { PointObject, PointLabel, Point } from './types'
import type { PointPen } from './pen'

/** A pin at `tip`, looking like the pen says */
export const newPoint = (tip: Point, pen: PointPen): Draft => ({ kind: 'point', name: '', links: [], anchor: { x: Math.round(tip.x), y: Math.round(tip.y) }, ...pen })

/** A new label: the icon and colour change with it unless they were set by hand (they are not the old label's own) */
export function labelPatch(o: Pick<PointObject, 'label' | 'icon' | 'color'>, label: PointLabel): Patch {
  const was = defaultsOf(o.label)
  const next = defaultsOf(label)
  return { label, ...(o.icon === was.icon ? { icon: next.icon } : {}), ...(o.color.toLowerCase() === was.color ? { color: next.color } : {}) }
}
