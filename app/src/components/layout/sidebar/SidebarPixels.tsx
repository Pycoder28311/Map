import { useEffect, useRef } from 'react'
import { reducedMotion } from '../../ui/tree/dragEffects'
import { BURN_EVENT } from './burnDown'

/** A pseudo-random number in [0, 1) from two small integers: the same every time, so the pixels never change on a re-render */
function random(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Size of one cell (px), and how many columns and rows the pattern has: nothing is drawn above the last row.
 *  The pattern is as wide as the open sidebar (COLUMNS × CELL = 225px: 1px more than its width, which the sidebar clips) and 640px high; smaller cells give a finer grain */
const CELL = 5
const COLUMNS = 45
const ROWS = 128

/**
 * The chance a cell is lit at a fraction `up` (0 at the bottom, 1 at its column's reach) of the way up: 95% at the bottom,
 * falling quickly at first and ever more gently higher up (an exponential), and reaching exactly 0 at the top, so the
 * pattern fades out with no edge. A larger DECAY makes the fall at the bottom steeper.
 */
const DECAY = 4
const density = (up: number) => (0.95 * (Math.exp(-DECAY * up) - Math.exp(-DECAY))) / (1 - Math.exp(-DECAY))

/** 0 in the middle of the width, 1 at the left and right edges */
const sideness = (column: number) => (Math.abs(column - (COLUMNS - 1) / 2) / ((COLUMNS - 1) / 2)) ** 1.2

/** How the orange fades with height (a power of the way up: higher is faster at the bottom, with a long gentle tail) and how
 *  much chance is mixed into each pixel's amount of it (%): a little, so neighbours differ slightly but the gradient stays smooth */
const HEAT_FALL = 4
const HEAT_NOISE = 14

// A cell is lit by chance (density above), never above its column's reach. The reach is the full height at the left and
// right edges and only 40% of it in the middle (ROWS × CELL = 640px), so the sides climb highest. Each lit cell also gets its
// own `heat` (% of the theme's hot colour in it): high at the bottom, fading smoothly to none higher up (HEAT_FALL)
const PIXELS = Array.from({ length: ROWS * COLUMNS }, (_, n) => ({ column: n % COLUMNS, row: Math.floor(n / COLUMNS) })).flatMap(
  ({ column, row }) => {
    const reach = ROWS * (0.4 + 0.6 * sideness(column))
    if (row >= reach || random(column, row) >= density(row / reach)) return []
    const heat = Math.round(Math.min(100, Math.max(0, (1 - row / reach) ** HEAT_FALL * 100 + (random(row, column) - 0.5) * HEAT_NOISE)))
    return [{ column, row, heat, reach }]
  },
)

/** Heat is rounded to steps of this (%), so the cells fall into a few groups that are each drawn as one shape */
const HEAT_STEP = 10

/** The shapes to draw for some cells: for each step of heat, the outlines of its cells, neighbours in a row joined into one rectangle */
const shapesOf = (pixels: typeof PIXELS) => {
  const byHeat = new Map<number, string[]>()
  const rows = new Map<number, { column: number; heat: number }[]>()
  for (const { column, row, heat } of pixels) rows.set(row, [...(rows.get(row) ?? []), { column, heat: Math.round(heat / HEAT_STEP) * HEAT_STEP }])
  for (const [row, cells] of rows) {
    cells.sort((a, b) => a.column - b.column)
    const y = (ROWS - 1 - row) * CELL
    let i = 0
    while (i < cells.length) {
      let end = i
      while (end + 1 < cells.length && cells[end + 1].column === cells[end].column + 1 && cells[end + 1].heat === cells[i].heat) end++
      const width = (end - i + 1) * CELL
      byHeat.set(cells[i].heat, [...(byHeat.get(cells[i].heat) ?? []), `M${cells[i].column * CELL} ${y}h${width}v${CELL}h-${width}z`])
      i = end + 1
    }
  }
  return [...byHeat].map(([heat, paths]) => ({ heat, d: paths.join('') }))
}

const SHAPES = shapesOf(PIXELS)

/** Only the lowest squares catch fire: those within this share of their column's reach, so the flames stay near the bottom */
const FIRE_REACH = 0.3
/** A few more squares that show only in the fire (more particles): this chance (0–1) at the bottom of the flames, thinning out upward */
const FIRE_EXTRA = 0.3
const FIRE_CELLS = (() => {
  const lit = new Set(PIXELS.map(({ column, row }) => column * ROWS + row))
  const extra = Array.from({ length: ROWS * COLUMNS }, (_, n) => ({ column: n % COLUMNS, row: Math.floor(n / COLUMNS) })).flatMap(({ column, row }) => {
    const reach = ROWS * (0.4 + 0.6 * sideness(column))
    const up = row / (reach * FIRE_REACH)
    if (up >= 1 || lit.has(column * ROWS + row) || random(column + 91, row + 37) >= FIRE_EXTRA * (1 - up)) return []
    const heat = Math.round(Math.min(100, Math.max(0, (1 - row / reach) ** HEAT_FALL * 100 + (random(row, column) - 0.5) * HEAT_NOISE)))
    return [{ column, row, heat, reach }]
  })
  return [...PIXELS.filter(({ row, reach }) => row < reach * FIRE_REACH), ...extra]
})()
const FIRE_SHAPES = shapesOf(FIRE_CELLS)

/**
 * Small squares over the bottom of the sidebar, in front of a soft glow, behind its content: dense at the very bottom and most of all at its left and
 * right sides, which also reach higher, thinning out upward until none are left. One SVG, as wide as the open sidebar (the
 * nav clips it in the rail), so none move while it opens. Only a theme that turns it on shows it (--sidebar-pixels-display,
 * styles/tokens.css).
 */
export default function SidebarPixels() {
  const glowRef = useRef<HTMLDivElement>(null)
  const fireRef = useRef<SVGSVGElement>(null)

  // Something burnt at the bottom: the squares catch fire from the lowest up, each flickering on its own, and the glow flares
  useEffect(() => {
    const ignite = () => {
      if (reducedMotion()) return
      fireRef.current?.querySelectorAll('path').forEach((path, i) => {
        const heat = Number(path.dataset.heat)
        // Full colour change only at the lowest squares; higher up every square still changes, but very little
        const strength = 0.1 + 0.9 * (heat / 100) ** 12
        path.animate(
          { opacity: [0, 0.5, 0.25, 0.45, 0.2, 0.35, 0].map((o) => o * strength) },
          { duration: 800 + random(i, 3) * 500, delay: (100 - heat) * 5, easing: 'ease-in-out' },
        )
      })
      glowRef.current?.animate({ opacity: [0, 0.6, 0.4, 0.6, 0.3, 0.45, 0] }, { duration: 1700, easing: 'ease-in-out' })
    }
    window.addEventListener(BURN_EVENT, ignite)
    return () => window.removeEventListener(BURN_EVENT, ignite)
  }, [])

  return (
    <div
      aria-hidden
      style={{ display: 'var(--sidebar-pixels-display)', width: COLUMNS * CELL, height: ROWS * CELL }}
      className="pointer-events-none absolute start-0 bottom-0 -z-10"
    >
      {/* A smooth glow behind the squares (--sidebar-glow): seen through the gaps, so it seems to come from behind them */}
      <div className="absolute inset-0 [background:var(--sidebar-glow)]" />
      <svg width={COLUMNS * CELL} height={ROWS * CELL} shapeRendering="crispEdges" className="absolute inset-0">
        {SHAPES.map(({ heat, d }) => (
          <path key={heat} d={d} fill={`color-mix(in srgb, var(--sidebar-pixel-hot) ${heat}%, var(--sidebar-pixel-color))`} />
        ))}
      </svg>
      {/* The same squares in flame colours, lit only while something burns (BURN_EVENT) */}
      <svg ref={fireRef} width={COLUMNS * CELL} height={ROWS * CELL} shapeRendering="crispEdges" className="absolute inset-0">
        {FIRE_SHAPES.map(({ heat, d }) => (
          <path
            key={heat}
            d={d}
            data-heat={heat}
            opacity={0}
            fill={`color-mix(in srgb, var(--sidebar-fire-hot) ${heat}%, var(--sidebar-fire))`}
          />
        ))}
      </svg>
      <div ref={glowRef} className="absolute inset-0 opacity-0 [background:var(--sidebar-fire-glow)]" />
    </div>
  )
}
