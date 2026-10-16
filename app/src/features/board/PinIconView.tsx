import { PIN_ICON_PATHS } from './pinIcons'
import type { PinIcon } from './types'

/** A pin's small picture as SVG (the canvas paints the same paths) */
export function PinGlyph({ icon, color, className = 'size-5' }: { icon: PinIcon; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill={color}>
      <path d={PIN_ICON_PATHS[icon].path} />
    </svg>
  )
}

/** The pin's picture on a tinted disc, the way the point's modal and card show it */
export default function PinBadge({ icon, color, className = 'size-10' }: { icon: PinIcon; color: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-(--radius-pill) ${className}`} style={{ backgroundColor: `${color}26` }}>
      <PinGlyph icon={icon} color={color} className="size-1/2" />
    </span>
  )
}
