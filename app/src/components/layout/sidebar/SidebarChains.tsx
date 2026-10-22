import { useEffect, useId, useRef } from 'react'
import { useObjectDrop } from '../../../features/drag/objectDrop'
import {
  CHAINS,
  CHAINS_TURNED,
  DRAG_RAMP_MS,
  DRAG_SPEED_FAR,
  DRAG_SPEED_NEAR,
  DRAG_STILL_AFTER_MS,
  DRAG_STILL_SPEED,
  FADE_BESIDE_ROWS,
  FADE_ENDS,
  FADE_TOP,
  SIDEBAR_WIDTH,
} from './chainsConfig'

// One repeat of the chain, a pixel per character: a ring with a short link joining it to the next ring
const STRAIGHT = [
  '.XXX.',
  'X...X',
  'X...X',
  'X.X.X',
  'X.X.X',
  'X...X',
  '.XXX.',
  '..X..',
  '..X..',
  '..X..',
]

// Turned about 30° to the left, seen from an angle: the same links, each with a darker copy a pixel to the right behind it,
// its thickness (like the side of a block), so the chain looks solid and turned. The chain is a pixel wider for it
const DEPTH = 1

const CHAIN = STRAIGHT
const WIDTH = STRAIGHT[0].length + (CHAINS_TURNED ? DEPTH : 0)

/** The rectangles of one repeat at a pixel size: each run of pixels in a row is one */
const rects = (pixel: number) => {
  const runs = CHAIN.flatMap((row, y) => [...row.matchAll(/X+/g)].map((run) => ({ column: run.index ?? 0, y, length: run[0].length })))
  const draw = (offset: number, opacity: number) =>
    runs.map((run) => ({ x: (run.column + offset) * pixel, y: run.y * pixel, width: run.length * pixel, opacity }))
  // Turned: the dark copy first, the chain itself over it
  return CHAINS_TURNED ? [...draw(DEPTH, 0.45), ...draw(0, 1)] : draw(0, 1)
}

/** The part of the sidebar's height the rows take (px from its top): the chain is fainter there */
export type Band = { top: number; bottom: number }

/**
 * Faint pixel-art chains in the sidebar, as chainsConfig.ts has them (where, how big, how faded), behind everything, the pixels
 * at the bottom (SidebarPixels) included. Along `band`, where the sidebar's rows are, they are fainter (FADE_BESIDE_ROWS): what shows of them
 * between and beside the rows. Wide as the open sidebar, so in the rail only the left chain shows (the nav clips it).
 * The top of them fades out smoothly (FADE_TOP). Only a theme that turns it on shows it (--sidebar-chains-display and --sidebar-chain-color, styles/tokens.css).
 */
export default function SidebarChains({ band }: { band: Band | null }) {
  const id = useId()
  const dragging = useObjectDrop().item !== null
  // Each chain's pattern (to slide it), and where the sliding is: how fast overall (0 to 1), how far each has gone, which way
  const patterns = useRef<(SVGPatternElement | null)[]>([])
  const motion = useRef({ factor: 0, offsets: CHAINS.map(() => 0), directions: CHAINS.map(() => 1) })

  // While an object is dragged the chains slide: up or down, picked at random for each chain at the start of each drag, a
  // little faster the deeper (the more faded) the chain is; full speed while the pointer moves, half while it rests; they ease
  // between speeds, and out when the drag ends
  useEffect(() => {
    const m = motion.current
    if (dragging) m.directions = CHAINS.map(() => (Math.random() < 0.5 ? -1 : 1))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const apply = () =>
      patterns.current.forEach((el, n) => el?.setAttribute('patternTransform', `translate(0 ${m.offsets[n].toFixed(2)})`))
    // Whether the pointer is moving: any movement in the last moments (not how fast)
    let lastMove = performance.now()
    const onMove = () => {
      lastMove = performance.now()
    }
    if (dragging) window.addEventListener('pointermove', onMove)
    let frame = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const target = dragging ? (now - lastMove < DRAG_STILL_AFTER_MS ? 1 : DRAG_STILL_SPEED) : 0
      m.factor += (target - m.factor) * (1 - Math.exp((-dt * 1000) / DRAG_RAMP_MS))
      if (!dragging && m.factor < 0.002) {
        m.factor = 0
        return
      }
      CHAINS.forEach(({ fade, size }, n) => {
        const speed = DRAG_SPEED_NEAR + (DRAG_SPEED_FAR - DRAG_SPEED_NEAR) * fade
        m.offsets[n] = (m.offsets[n] + m.directions[n] * speed * m.factor * dt) % (CHAIN.length * size)
      })
      apply()
      frame = requestAnimationFrame(step)
    }
    if (dragging || m.factor > 0) frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [dragging])
  const fade = `${id}-m`
  const top = `${id}-t`
  // The top fades in along an eased ramp (smoothstep: slow, quicker, slow), as a mask: black is nothing, white is full strength
  const ramp = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ at: t * FADE_TOP, level: Math.round(t * t * (3 - 2 * t) * 255) }))
  // One chain: its tile (a pattern) and the strip it fills
  const chains = CHAINS.map(({ side, edge, size, fade, top, length, offset }, n) => {
    const width = WIDTH * size
    const height = CHAIN.length * size
    const x = side === 'left' ? edge : SIDEBAR_WIDTH - edge - width
    return {
      pattern: (
        <pattern key={n} ref={(el) => { patterns.current[n] = el }} id={`${id}-${n}`} x={x} y={offset} width={width} height={height} patternUnits="userSpaceOnUse">
          {rects(size).map((r) => (
            <rect key={`${r.opacity}:${r.x}:${r.y}`} x={r.x} y={r.y} width={r.width} height={size} opacity={r.opacity} />
          ))}
        </pattern>
      ),
      // A strip that stops short of an end of the sidebar fades out there (a mask: a gradient along the strip)
      end: (
        <g key={n}>
          <linearGradient id={`${id}-g${n}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top > 0 ? 'black' : 'white'} />
            <stop offset={top > 0 ? FADE_ENDS : 0} stopColor="white" />
            <stop offset={top + length < 100 ? 1 - FADE_ENDS : 1} stopColor="white" />
            <stop offset="1" stopColor={top + length < 100 ? 'black' : 'white'} />
          </linearGradient>
          <mask id={`${id}-e${n}`}>
            <rect x={x} y={`${top}%`} width={width} height={`${length}%`} fill={`url(#${id}-g${n})`} />
          </mask>
        </g>
      ),
      strip: (
        <rect
          key={n}
          x={x}
          y={`${top}%`}
          width={width}
          height={`${length}%`}
          fill={`url(#${id}-${n})`}
          opacity={1 - fade}
          mask={`url(#${id}-e${n})`}
        />
      ),
    }
  })
  const rowsGray = Math.round((1 - FADE_BESIDE_ROWS) * 255)
  return (
    <svg
      aria-hidden
      shapeRendering="crispEdges"
      style={{ display: 'var(--sidebar-chains-display)', color: 'var(--sidebar-chain-color)', width: SIDEBAR_WIDTH }}
      className="pointer-events-none absolute inset-y-0 start-0 -z-20 h-full"
      fill="currentColor"
    >
      <defs>
        {chains.map((c) => c.pattern)}
        {chains.map((c) => c.end)}
        <linearGradient id={`${top}-g`} x1="0" y1="0" x2="0" y2="1">
          {FADE_TOP > 0 ? ramp.map(({ at, level }) => <stop key={at} offset={at} stopColor={`rgb(${level} ${level} ${level})`} />) : <stop offset="0" stopColor="white" />}
          <stop offset={FADE_TOP} stopColor="white" />
        </linearGradient>
        <mask id={top}>
          <rect width="100%" height="100%" fill={`url(#${top}-g)`} />
        </mask>
        {/* White: full strength; the band is a gray: fainter */}
        <mask id={fade}>
          <rect width="100%" height="100%" fill="white" />
          {band && <rect y={band.top} width="100%" height={band.bottom - band.top} fill={`rgb(${rowsGray} ${rowsGray} ${rowsGray})`} />}
        </mask>
      </defs>
      <g mask={`url(#${top})`}>
        <g mask={`url(#${fade})`}>{chains.map((c) => c.strip)}</g>
      </g>
    </svg>
  )
}
