import { useId } from 'react'
import { PIN_BODY, PIN_HEIGHT, PIN_ICON_PATHS, PIN_WIDTH } from './pinIcons'
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

/** A texture's tile in SVG (6 units in a 24-unit marker), the same as the canvas draws: a darker shade over the colour */
function TextureTile({ texture }: { texture: number }) {
  const ink = { stroke: 'rgba(0, 0, 0, 0.35)', strokeWidth: 0.75, fill: 'none' }
  if (texture === 1) return <path d="M-1.500 1.500 1.500-1.500M0 6 6 0M4.500 7.500 7.500 4.500" {...ink} />
  if (texture === 2) return <path d="M0 6 6 0M0 0 6 6" {...ink} />
  if (texture === 3) return <circle cx={3} cy={3} r={0.8} fill="rgba(0, 0, 0, 0.35)" />
  if (texture === 4) return <path d="M0 0.400H6M0.400 0V6" {...ink} />
  return <path d="M0 3C1.500 0 4.500 6 6 3" {...ink} />
}

/**
 * How a point looks on the map, as SVG (the pin picker's options): the teardrop with its white disc and dot, or the whole shape in the
 * colour with its texture, a white edge and a thin dark line, as the canvas paints it (render.ts)
 */
export function MarkerGlyph({ icon, color, className = 'size-8' }: { icon: PinIcon; color: string; className?: string }) {
  // (a plain id: it goes into url(#…))
  const id = `tex${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  if (icon === 'pin') {
    return (
      <svg viewBox={`-2 -2 ${PIN_WIDTH + 4} ${PIN_HEIGHT + 4}`} aria-hidden className={className}>
        <path d={PIN_BODY} fill={color} />
        <circle cx={PIN_WIDTH / 2} cy={13.500} r={9} fill="#ffffff" />
        <circle cx={PIN_WIDTH / 2} cy={13.500} r={2.400} fill={color} />
      </svg>
    )
  }
  const { path, texture } = PIN_ICON_PATHS[icon]
  return (
    <svg viewBox="-1.500 -1.500 27 27" aria-hidden className={className}>
      {texture ? (
        <defs>
          <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse">
            <TextureTile texture={texture} />
          </pattern>
        </defs>
      ) : null}
      <path d={path} fill="none" stroke="#ffffff" strokeWidth={2.500} strokeLinejoin="round" />
      <path d={path} fill={color} />
      {texture ? <path d={path} fill={`url(#${id})`} /> : null}
      <path d={path} fill="none" stroke="rgba(0, 0, 0, 0.35)" strokeWidth={0.750} strokeLinejoin="round" />
    </svg>
  )
}
