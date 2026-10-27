import { useMemo, type HTMLAttributes } from 'react'
import { paperEdgePolygon } from '../../features/dashboard/cards/paperEdge'

/** How many cuts each side of a sign has, and how deep the deepest goes (px): a little shallower than a map card's (3, 6) and with its own seed, so it is not the same edge */
const SIGN_CUTS = 3
const SIGN_DEPTH = 5

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Makes its edge: the same seed always gives the same edge */
  seed?: string
}

/**
 * A plain sign for a title or a short word: a small plaque as wide as what is inside it, its edge cracked like a map card's (uneven, with small
 * cuts: paperEdge.ts) but with its own, smaller cuts, outlined along that shape (.ui-crack). `className` is for size and layout.
 */
export default function Sign({ seed = 'sign', className = '', children, ...props }: Props) {
  const clip = useMemo(() => paperEdgePolygon(seed, SIGN_CUTS, SIGN_DEPTH), [seed])
  return (
    <div {...props} className={`ui-crack inline-flex max-w-full ${className}`}>
      <div className="flex min-w-0 items-center bg-fill px-6" style={{ clipPath: clip }}>
        {children}
      </div>
    </div>
  )
}
