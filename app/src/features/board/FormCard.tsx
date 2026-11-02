import type { ReactNode } from 'react'
import { paperEdgePolygon } from '../dashboard/cards/paperEdge'

/** The card's cracked edge: the same kind as the article page's Info box (uneven, a few small cuts), the same every time */
const EDGE = paperEdgePolygon('map-form', 3, 5)

/**
 * The card of the left forms (a point's, an article's): the column's height, its content scrolling inside, with a cracked edge like the
 * article page's Info box. The card clips itself to that edge; its wrapper draws the outline along it and the shadow (.ui-crack)
 */
export default function FormCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ui-crack pointer-events-auto flex min-h-0 flex-1 flex-col">
      <section aria-label={label} style={{ clipPath: EDGE }} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        {children}
      </section>
    </div>
  )
}
