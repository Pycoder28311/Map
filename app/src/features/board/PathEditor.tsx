import { knobsOf } from './pathEdit'
import type { Junction } from './join'
import type { BorderObject, LineObject } from './types'
import { boardToScreen, type Viewport } from './viewport'

type Props = {
  view: Viewport
  /** The selected line being edited: its points, and the knobs of `active` */
  line: LineObject | BorderObject | null
  active: number | null
  /** A hovered line that is not selected: its points show faintly */
  hovered: LineObject | BorderObject | null
  junction: Junction | null
}

const POINT = 8
const KNOB = 4.5

/** The map's overlay for editing a line: its points, the curve knobs of the active one, and the mark where two lines can join */
export default function PathEditor({ view, line, active, hovered, junction }: Props) {
  const at = (p: { x: number; y: number }) => boardToScreen(view, p)
  const shown = line ?? hovered
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {shown &&
        shown.points.map((p, i) => {
          const s = at(p)
          const on = line !== null && i === active
          return <rect key={i} x={s.x - POINT / 2} y={s.y - POINT / 2} width={POINT} height={POINT} className={`stroke-accent ${on ? 'fill-accent' : 'fill-surface'}`} strokeWidth={1.5} opacity={line ? 1 : 0.55} />
        })}
      {line &&
        active !== null &&
        (() => {
          const knobs = knobsOf(line, active)
          const h = line.handles?.[active]
          if (!knobs || !h) return null
          const centre = at(line.points[active])
          return (
            <>
              {([['in', knobs.in, h.inX || h.inY], ['out', knobs.out, h.outX || h.outY]] as const).map(([side, k, length]) => {
                if (!length) return null
                const s = at(k)
                return (
                  <g key={side}>
                    <line x1={centre.x} y1={centre.y} x2={s.x} y2={s.y} className="stroke-accent" strokeWidth={1} />
                    <circle cx={s.x} cy={s.y} r={KNOB} className="fill-surface stroke-accent" strokeWidth={1.5} />
                  </g>
                )
              })}
            </>
          )
        })()}
      {junction && (() => {
        const s = at(junction.at)
        return <circle cx={s.x} cy={s.y} r={10} className="fill-accent/20 stroke-accent" strokeWidth={2} />
      })()}
    </svg>
  )
}
