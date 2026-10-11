// The "falls into an icon" effect for any drop target: a folder row's icon, the trash bin, a link node…
// Each marks its icon with data-drop-icon (its drop key); the lid opens there (useLidOpen(key)).
import { swallow } from '../tree/swallow'

/** The element of a drop target's icon (data-drop-icon), if it's on screen */
export const dropIconOf = (dropKey: string) => document.querySelector(`[data-drop-icon="${CSS.escape(dropKey)}"]`)

/**
 * `source` (the floating copy, or e.g. a row archived from its menu) falls into the icon of `dropKey`:
 * its lid opens, it arcs in and shrinks, the icon gulps, sparks fly. Call it right before the data
 * changes. `lifted`: the source is a lifted (tilted) copy
 */
export function fallInto(source: Element | null, dropKey: string, { lifted = false } = {}) {
  const to = dropIconOf(dropKey)
  if (source && to) swallow({ source, to, lidKey: dropKey, lifted })
}
