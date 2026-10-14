import { useState, type ReactNode } from 'react'
import { LuShapes } from 'react-icons/lu'
import CheckField from '../../components/ui/fields/CheckField'
import ColourField from '../../components/ui/fields/ColourField'
import RangeField from '../../components/ui/fields/RangeField'
import FillFields from './FillFields'
import { waySample } from './samples'
import ShapeGrid from './ShapeGrid'
import { SHAPE_PARAM, shapeParamDefault } from './shapes'
import StyleSample from './StyleSample'
import type { Fill, ShapeType, Style } from './types'

export type BorderValues = { style: Style; fill: Fill | null; shape: ShapeType | null; param: number }

type Props = {
  value: BorderValues
  /** `commit` false: still moving (preview it) */
  onChange: (patch: Partial<BorderValues>, commit: boolean) => void
  /** The pen offers the Shape way; a drawn border has only its outline to choose (mouse-like or linear) */
  withShape?: boolean
  /** The area's description (a selected border only) */
  description?: string
  onDescription?: (text: string) => void
}

const ROW = 'flex w-full items-center gap-3 rounded-(--field-radius) border px-2 py-1 text-start transition-colors'
const pick = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill')

/** The description box: saves when it loses focus (one undo step) */
function DescriptionBox({ text, onSave }: { text: string; onSave: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="flex flex-col gap-1">
      <span className="text-small text-fg-muted">Description</span>
      <textarea
        id="area-description"
        rows={3}
        value={draft ?? text}
        placeholder="Shown under the name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== text) onSave(draft)
          setDraft(null)
        }}
        className="resize-y rounded-(--field-radius) border border-line-strong bg-surface p-2 text-body outline-none focus-visible:border-fg-subtle"
      />
    </label>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-small text-fg-muted">{title}</h3>
      {children}
    </section>
  )
}

/**
 * The border's controls (map.md): colour and opacity, thickness, the ways to draw it (mouse-like with its softness bar,
 * linear, and in the pen a shape), the inside and, for a drawn area, its description. Shared by a selected border and the pen.
 */
export default function BorderOptions({ value, onChange, withShape = false, description, onDescription }: Props) {
  const { style, fill, shape, param } = value
  const set = (patch: Partial<Style>, commit = true) => onChange({ style: { ...style, ...patch } }, commit)
  const spec = shape ? SHAPE_PARAM[shape] : undefined
  const ways = [
    { id: 'exact', label: 'Mouse-like shape', on: shape === null && style.way === 'exact', pick: () => onChange({ shape: null, style: { ...style, way: 'exact', amount: 0 } }, true) },
    { id: 'straight', label: 'Linear border', on: shape === null && style.way === 'straight', pick: () => onChange({ shape: null, style: { ...style, way: 'straight', amount: 0 } }, true) },
  ] as const

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ColourField label="Colour" value={style.color} onLive={(color) => set({ color }, false)} onCommit={(color) => set({ color })} />
        <RangeField label="Opacity" value={style.opacity} min={1} max={100} suffix="%" onLive={(opacity) => set({ opacity }, false)} onCommit={(opacity) => set({ opacity })} />
        <RangeField label="Thickness" value={style.thickness} min={1} max={40} onLive={(thickness) => set({ thickness }, false)} onCommit={(thickness) => set({ thickness })} />
        <CheckField label="Same width as I zoom" checked={style.fixedWidth} onChange={(fixedWidth) => set({ fixedWidth })} />
      </div>

      <Section title="Way">
        <ul className="flex flex-col gap-1.5">
          {ways.map((way) => (
            <li key={way.id}>
              <button type="button" aria-pressed={way.on} onClick={way.pick} className={`${ROW} ${pick(way.on)}`}>
                <StyleSample object={waySample(way.id, style, 100, 30)} width={100} height={30} />
                <span className="text-body">{way.label}</span>
              </button>
              {way.on && way.id === 'exact' && (
                <div className="mt-1.5 ps-2">
                  <RangeField label="Softness" value={style.amount} min={0} max={100} onLive={(amount) => set({ amount }, false)} onCommit={(amount) => set({ amount })} />
                </div>
              )}
            </li>
          ))}
          {withShape && (
            <li>
              <button
                type="button"
                aria-pressed={shape !== null}
                onClick={() => onChange({ shape: shape ?? 'rect', param: shape ? param : shapeParamDefault('rect'), style: { ...style, way: 'straight', amount: 0 } }, true)}
                className={`${ROW} ${pick(shape !== null)}`}
              >
                <LuShapes className="size-7 shrink-0" />
                <span className="text-body">Shape</span>
              </button>
              {shape && (
                <div className="mt-1.5 flex flex-col gap-2 ps-2">
                  <ShapeGrid value={shape} onPick={(next) => onChange({ shape: next, param: shapeParamDefault(next) }, true)} />
                  {spec && <RangeField label={spec.label} value={param} min={spec.min} max={spec.max} onLive={(next) => onChange({ param: next }, false)} onCommit={(next) => onChange({ param: next }, true)} />}
                </div>
              )}
            </li>
          )}
        </ul>
      </Section>

      <Section title="Inside">
        <FillFields fill={fill} startColor={style.color} onChange={(next, commit) => onChange({ fill: next }, commit)} />
      </Section>

      {onDescription && <DescriptionBox text={description ?? ''} onSave={onDescription} />}
    </div>
  )
}
