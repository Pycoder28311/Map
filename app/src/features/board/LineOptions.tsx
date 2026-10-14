import { useState, type ReactNode } from 'react'
import { LuChevronDown, LuShapes } from 'react-icons/lu'
import CheckField from '../../components/ui/fields/CheckField'
import ColourField from '../../components/ui/fields/ColourField'
import RangeField from '../../components/ui/fields/RangeField'
import { ARROW_HEADS, ARROW_LABEL, defaultArrowSize } from './arrows'
import { WAY_AMOUNT } from './drawLine'
import { armSample, headSample, typeSample, waySample } from './samples'
import StyleSample from './StyleSample'
import { DRAWING_WAYS, LINE_TYPES, type Style } from './types'

type Props = {
  style: Style
  /** A shape's outline has no arrows and no drawing way */
  kind: 'line' | 'shape'
  /** `commit` false: still moving (preview it); true: a finished change (one undo step) */
  onChange: (style: Style, commit: boolean) => void
  /** The pen only: a "Shape" element in the drawing-way grid (selected when `shapeActive`) */
  onShape?: () => void
  shapeActive?: boolean
  /** The pen only: a way was picked, so the pen draws lines again */
  onLine?: () => void
  /** Shown right under the drawing-way grid (the pen's shape grid) */
  afterWays?: ReactNode
}

const TYPE_LABEL: Record<Style['type'], string> = { solid: 'Continuous line', dashed: 'Distinguished line', double: 'Two parallel lines', diagonal: 'Diagonal distinguished' }
const WAY_LABEL: Record<Style['way'], string> = { exact: 'Exact mouse line', rounded: 'Rounded', straight: 'Straight line', corners: 'Edge corners' }
/** What gap and part start at when a type is picked and has none */
const TYPE_DEFAULT: Record<Style['type'], { gap: number; part: number }> = { solid: { gap: 0, part: 0 }, dashed: { gap: 8, part: 12 }, double: { gap: 6, part: 0 }, diagonal: { gap: 8, part: 6 } }

const ROW = 'flex w-full items-center rounded-(--field-radius) border px-2 py-1 transition-colors'
const pick = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill')

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-small text-fg-muted">{title}</h3>
      {children}
    </section>
  )
}

/**
 * The line's controls (map.md): colour and opacity, the four types (all visible, a sub-bar under the picked one), the
 * arrows, the four drawing ways, same width as I zoom and the thickness. Shared by a selected line, a shape's outline and the pen.
 */
export default function LineOptions({ style, kind, onChange, onShape, shapeActive = false, onLine, afterWays }: Props) {
  const [headsOpen, setHeadsOpen] = useState(false)
  const set = (patch: Partial<Style>, commit = true) => onChange({ ...style, ...patch }, commit)
  const setArrow = (patch: Partial<Style['arrow']>, commit = true) => set({ arrow: { ...style.arrow, ...patch } }, commit)
  const hasArrow = style.arrow.start || style.arrow.end

  const pickType = (type: Style['type']) => {
    const d = TYPE_DEFAULT[type]
    set({ type, gap: style.gap || d.gap, part: style.part || d.part })
  }
  const pickWay = (way: Style['way']) => {
    onLine?.()
    set({ way, amount: way === style.way ? style.amount : WAY_AMOUNT[way] })
  }
  const toggleArrows = (on: boolean) => setArrow(on ? { end: true, size: style.arrow.size || defaultArrowSize(style.thickness) } : { start: false, end: false })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ColourField label="Colour" value={style.color} onLive={(color) => set({ color }, false)} onCommit={(color) => set({ color })} />
        <RangeField label="Opacity" value={style.opacity} min={1} max={100} suffix="%" onLive={(opacity) => set({ opacity }, false)} onCommit={(opacity) => set({ opacity })} />
      </div>

      <Section title="Type">
        <ul className="flex flex-col gap-1.5">
          {LINE_TYPES.map((type) => (
            <li key={type}>
              <button type="button" aria-pressed={style.type === type} aria-label={TYPE_LABEL[type]} title={TYPE_LABEL[type]} onClick={() => pickType(type)} className={`${ROW} justify-center ${pick(style.type === type)}`}>
                <StyleSample object={typeSample({ ...style, type, ...(style.type === type ? {} : TYPE_DEFAULT[type]) }, 232, 34)} width={232} height={34} />
              </button>
              {style.type === type && type !== 'solid' && (
                <div className="mt-1.5 flex flex-col gap-1.5 ps-2">
                  <RangeField label="Gap size" value={style.gap} min={1} max={60} onLive={(gap) => set({ gap }, false)} onCommit={(gap) => set({ gap })} />
                  {type !== 'double' && <RangeField label="Parts size" value={style.part} min={1} max={60} onLive={(part) => set({ part }, false)} onCommit={(part) => set({ part })} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {kind === 'line' && (
        <Section title="Arrows">
          <CheckField label="Arrow on the line" checked={hasArrow} onChange={toggleArrows} />
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`${ROW} justify-between gap-1 ${pick(style.arrow.start)}`}>
              <StyleSample object={armSample('start', style, 80, 30)} width={80} height={30} />
              <CheckField label="" aria-label="Arrow at the start" checked={style.arrow.start} disabled={!hasArrow} onChange={(start) => setArrow({ start })} />
            </div>
            <div className={`${ROW} justify-between gap-1 ${pick(style.arrow.end)}`}>
              <CheckField label="" aria-label="Arrow at the end" checked={style.arrow.end} disabled={!hasArrow} onChange={(end) => setArrow({ end })} />
              <StyleSample object={armSample('end', style, 80, 30)} width={80} height={30} />
            </div>
          </div>
          <button type="button" aria-expanded={headsOpen} aria-label="Arrow style" onClick={() => setHeadsOpen((o) => !o)} className={`${ROW} justify-between ${pick(false)}`}>
            <StyleSample object={headSample(style.arrow.style, style, 70, 28)} width={70} height={28} />
            <span className="text-small text-fg-muted">{ARROW_LABEL[ARROW_HEADS[style.arrow.style] ?? 'open']}</span>
            <LuChevronDown className={`size-4 transition-transform ${headsOpen ? 'rotate-180' : ''}`} />
          </button>
          {headsOpen && (
            <ul className="grid grid-cols-3 gap-1.5">
              {ARROW_HEADS.map((head, i) => (
                <li key={head}>
                  <button type="button" aria-pressed={style.arrow.style === i} aria-label={ARROW_LABEL[head]} title={ARROW_LABEL[head]} onClick={() => setArrow({ style: i })} className={`${ROW} justify-center ${pick(style.arrow.style === i)}`}>
                    <StyleSample object={headSample(i, style, 60, 28)} width={60} height={28} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasArrow && <RangeField label="Arrow size" value={style.arrow.size} min={4} max={80} onLive={(size) => setArrow({ size }, false)} onCommit={(size) => setArrow({ size })} />}
        </Section>
      )}

      {kind === 'line' && (
        <Section title="Drawing way">
          <ul className="grid grid-cols-2 gap-1.5">
            {DRAWING_WAYS.map((way) => {
              const on = !shapeActive && style.way === way
              return (
                <li key={way}>
                  <button type="button" aria-pressed={on} aria-label={WAY_LABEL[way]} title={WAY_LABEL[way]} onClick={() => pickWay(way)} className={`${ROW} flex-col gap-0.5 ${pick(on)}`}>
                    <StyleSample object={waySample(way, style, 100, 30)} width={100} height={30} />
                    <span className="text-small text-fg-muted">{WAY_LABEL[way]}</span>
                  </button>
                </li>
              )
            })}
            {onShape && (
              <li>
                <button type="button" aria-pressed={shapeActive} aria-label="Shape" title="Shape" onClick={onShape} className={`${ROW} h-full flex-col gap-0.5 ${pick(shapeActive)}`}>
                  <LuShapes className="size-6" />
                  <span className="text-small text-fg-muted">Shape</span>
                </button>
              </li>
            )}
          </ul>
          {!shapeActive && style.way === 'exact' && <RangeField label="Softness" value={style.amount} min={0} max={100} onLive={(amount) => set({ amount }, false)} onCommit={(amount) => set({ amount })} />}
          {!shapeActive && style.way === 'corners' && <RangeField label="Corner degrees" value={style.amount} min={5} max={170} suffix="°" onLive={(amount) => set({ amount }, false)} onCommit={(amount) => set({ amount })} />}
          {afterWays}
        </Section>
      )}

      <div className="flex flex-col gap-2">
        <CheckField label="Same width as I zoom" checked={style.fixedWidth} onChange={(fixedWidth) => set({ fixedWidth })} />
        <RangeField label="Thickness" value={style.thickness} min={kind === 'shape' ? 0 : 1} max={40} onLive={(thickness) => set({ thickness }, false)} onCommit={(thickness) => set({ thickness })} />
      </div>
    </div>
  )
}
