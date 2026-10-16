import { useLayoutEffect, useRef, useState } from 'react'
import { SLOTS, type Template } from '../workspace/layout'
import type { Split } from '../workspace/split'
import { labelSpot, slotRect } from './geometry'

// How far out of the tile a label sits (px), and how close to the window's edge it may go
const OUT = 26
const EDGE = 4
// Where the curve meets the pane: this far inside its corner / side (px)
const INSET = 3
// A turned label (see below) starts this far right of where its curve leaves the pane (px)
const RUN = 14

type Props = {
  /** The tile the labels belong to */
  tile: HTMLElement
  template: Template
  split: Split
  /** Each pane's name, in slot order */
  names: string[]
}

type Placed = { name: string; ax: number; ay: number; ex: number; ey: number; dx: number; dy: number; start: boolean }

/**
 * Small floating labels with each pane's name, each joined by a curved line to its part of the
 * tile (e.g. the top-right pane: a label off the tile's top-right corner). In the top layer, since
 * the sidebar clips its content; it never takes the pointer.
 */
export default function LayoutHoverLabels({ tile, template, split, names }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = useState<Placed[]>([])

  // By content: the parent passes new arrays / objects on every render
  const key = `${template} ${split.x} ${split.y} ${split.x2} ${split.y2} ${names.join('\n')}`

  useLayoutEffect(() => {
    const box = tile.getBoundingClientRect()
    setPlaced(
      names.map((name, i) => {
        const spot = labelSpot(slotRect(template, SLOTS[i], split))
        // The anchor: just inside the pane's corner / side
        const ax = box.left + spot.x * box.width - spot.dx * INSET
        const ay = box.top + spot.y * box.height - spot.dy * INSET
        // Left panes: the sidebar is at the window's left edge, so their labels go above / below the
        // tile instead (a pane spanning the height: above); the curve leaves the pane vertically and
        // bends right into the label
        const turn = spot.dx < 0
        const dx = turn ? 0 : spot.dx
        const dy = turn ? spot.dy || -1 : spot.dy
        // The label's near edge: out of the tile in that direction (labels going up/down also lean out)
        const ex = turn ? Math.max(EDGE, ax + RUN) : ax + dx * OUT
        const ey = ay + dy * OUT * 0.8
        return { name, ax, ay, ex, ey, dx, dy, start: turn }
      }),
    )
    ref.current?.showPopover()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile, key])

  return (
    <div
      ref={ref}
      popover="manual"
      aria-hidden
      className="pointer-events-none fixed inset-0 m-0 h-screen w-screen overflow-visible border-0 bg-transparent p-0 animate-[labels-in_150ms_ease-out] motion-reduce:animate-none"
    >
      <svg className="absolute inset-0 size-full overflow-visible">
        {placed.map((p) => (
          <g key={p.name + p.ax}>
            {/* Leaves the pane straight out, then bends towards the label (turned ones: up/down, then right) */}
            <path
              d={
                p.start
                  ? `M ${p.ax} ${p.ay} C ${p.ax} ${p.ay + p.dy * OUT * 0.7}, ${p.ex - RUN} ${p.ey}, ${p.ex} ${p.ey}`
                  : `M ${p.ax} ${p.ay} C ${p.ax + p.dx * OUT * 0.15} ${p.ay + p.dy * OUT * 0.7}, ${p.ex - p.dx * OUT * 0.6} ${p.ey}, ${p.ex} ${p.ey}`
              }
              fill="none"
              stroke="var(--fg)"
              strokeWidth={1.25}
              strokeLinecap="round"
            />
            <circle cx={p.ax} cy={p.ay} r={2} fill="var(--fg)" />
          </g>
        ))}
      </svg>
      {placed.map((p) => (
        <span
          key={p.name + p.ax}
          style={{
            left: Math.max(EDGE, p.ex),
            top: p.ey,
            // Hangs off its end of the curve: right of it going right, left of it going left, centred otherwise
            // (turned ones start at the curve's end, so they stay on screen)
            translate: `${p.dx < 0 ? '-100%' : p.dx > 0 || p.start ? '0' : '-50%'} ${p.dy < 0 ? '-100%' : p.dy > 0 ? '0' : '-50%'}`,
          }}
          className="absolute max-w-40 truncate rounded-(--radius-pill) border border-line bg-surface px-2 py-0.5 text-small text-fg shadow-sm"
        >
          {p.name}
        </span>
      ))}
    </div>
  )
}
