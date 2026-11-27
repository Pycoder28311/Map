import { useEffect, useRef } from 'react'
import { LIMITS, PAINT_ID, TEXT_SIZES, isShape, type ShapeItem, type TextItem } from '../model/types'
import { flatten } from '../model/raster'
import { mirrorShape } from '../model/mirror'
import { textLayout } from '../model/raster'
import { EDIT_TEXT_EVENT, takeEdit } from '../board/tools'
import { begin, commit, end, getState, live, selected, setSettings, useStore, withAdded, withMoved, withoutItem, withShape, select } from '../store/store'
import { Choice, ColorField, NumberField, Section, Toggle } from './fields'

const ALIGNS = [
  { value: 'left' as const, label: 'Left' },
  { value: 'center' as const, label: 'Centre' },
  { value: 'right' as const, label: 'Right' },
]
const SIZES = TEXT_SIZES.map((s) => ({ value: s, label: `${s}×` }))

/** What the current tool draws with: its own settings, and the mirror */
function ToolSettings() {
  const tool = useStore((s) => s.tool)
  const s = useStore((st) => st.settings)
  const shapes = tool === 'rect' || tool === 'stepped' || tool === 'ellipse'
  return (
    <Section title="Tool">
      {(tool === 'brush' || tool === 'eraser') && (
        <>
          <NumberField label="Size" value={s.brushSize} min={1} max={LIMITS.brushMax} suffix="units" onChange={(brushSize) => setSettings({ brushSize })} />
          <Choice label="Shape" value={s.brushShape} options={[{ value: 'square', label: 'Square' }, { value: 'round', label: 'Round' }]} onChange={(brushShape) => setSettings({ brushShape })} />
          <p className="hint">Shift + click: a straight stroke from the last one.</p>
        </>
      )}
      {shapes && (
        <>
          <Toggle label="Border (main colour)" checked={s.border} onChange={(border) => setSettings({ border })} />
          <NumberField label="Border thickness" value={s.borderThickness} min={1} max={LIMITS.thicknessMax} suffix="units" disabled={!s.border} onChange={(borderThickness) => setSettings({ borderThickness })} />
          <Toggle label="Fill (second colour)" checked={s.fill} onChange={(fill) => setSettings({ fill })} />
          {tool === 'stepped' && <NumberField label="Corner steps" value={s.steps} min={1} max={LIMITS.stepsMax} suffix="units" onChange={(steps) => setSettings({ steps })} />}
          <p className="hint">Drag from corner to corner. Shift: a square or a circle.</p>
        </>
      )}
      {tool === 'line' && (
        <>
          <NumberField label="Thickness" value={s.lineThickness} min={1} max={LIMITS.thicknessMax} suffix="units" onChange={(lineThickness) => setSettings({ lineThickness })} />
          <p className="hint">Shift: straight across, down, or at 45°.</p>
        </>
      )}
      {tool === 'text' && (
        <>
          <Choice label="Size" value={s.textSize} options={SIZES} onChange={(textSize) => setSettings({ textSize })} />
          <NumberField label="Letter spacing" value={s.letterSpacing} min={0} max={LIMITS.spacingMax} suffix="units" onChange={(letterSpacing) => setSettings({ letterSpacing })} />
          <NumberField label="Line spacing" value={s.lineSpacing} min={0} max={LIMITS.spacingMax} suffix="units" onChange={(lineSpacing) => setSettings({ lineSpacing })} />
          <Choice label="Align" value={s.align} options={ALIGNS} onChange={(align) => setSettings({ align })} />
          <Toggle label="Outline (second colour)" checked={s.outline} onChange={(outline) => setSettings({ outline })} />
          <Toggle label="Shadow" checked={s.shadow} onChange={(shadow) => setSettings({ shadow })} />
          {s.shadow && (
            <div className="row">
              <ColorField label="Shadow colour" value={s.shadowColor} onChange={(shadowColor) => setSettings({ shadowColor })} />
              <NumberField label="x" value={s.shadowDx} min={-LIMITS.shadowMax} max={LIMITS.shadowMax} onChange={(shadowDx) => setSettings({ shadowDx })} />
              <NumberField label="y" value={s.shadowDy} min={-LIMITS.shadowMax} max={LIMITS.shadowMax} onChange={(shadowDy) => setSettings({ shadowDy })} />
            </div>
          )}
          <p className="hint">Click to place a text, then type it in Selection. Double-click a text to edit it.</p>
        </>
      )}
      {tool === 'fill' && <p className="hint">Fills the area that looks the same colour, on the paint layer.</p>}
      {tool === 'eyedropper' && <p className="hint">Click a colour to make it the main colour (or hold Alt with any tool).</p>}
      {tool === 'select' && <p className="hint">Click an object; drag it or its handles. Arrows: 1 unit (Shift: 10). Delete, Ctrl+D duplicate, [ ] order.</p>}
      <div className="mirror">
        <span>Mirror</span>
        <Toggle label="Left ↔ right" checked={s.mirror.x} onChange={(x) => setSettings({ mirror: { ...s.mirror, x } })} />
        <Toggle label="Top ↔ bottom" checked={s.mirror.y} onChange={(y) => setSettings({ mirror: { ...s.mirror, y } })} />
      </div>
      <p className="hint">With a mirror on, the brush, the eraser, the fill and new shapes and texts are drawn on the other side too.</p>
    </Section>
  )
}

/** One change of the selected shape: one undo step */
const change = (item: ShapeItem, patch: Partial<ShapeItem>) => commit(withShape(getState().drawing, { ...item, ...patch } as ShapeItem))

/** The text field of a selected text: typing is one undo step from focus to blur */
function TextInput({ item }: { item: TextItem }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const focus = () => {
      if (!takeEdit()) return
      // After the press that placed it has finished (its mouse-down would move the focus back to the page)
      window.setTimeout(() => {
        ref.current?.focus()
        ref.current?.select()
      }, 0)
    }
    // A text just placed: its field did not exist when it asked
    focus()
    window.addEventListener(EDIT_TEXT_EVENT, focus)
    return () => window.removeEventListener(EDIT_TEXT_EVENT, focus)
  }, [])
  return (
    <label className="field">
      <span>Text</span>
      <textarea
        ref={ref}
        rows={3}
        value={item.text}
        onFocus={begin}
        onBlur={end}
        onKeyDown={(e) => {
          if (e.key === 'Escape') ref.current?.blur()
        }}
        onChange={(e) => {
          const current = selected(getState())
          if (current?.kind === 'text') live(withShape(getState().drawing, { ...current, text: e.target.value }))
        }}
      />
    </label>
  )
}

/** The selected object's numbers and settings, all editable; its order, mirror copy, duplicate and delete */
function SelectionPanel() {
  const item = useStore(selected)
  const d = useStore((s) => s.drawing)
  if (!item) return null
  const index = d.items.findIndex((i) => i.id === item.id)
  const actions = (
    <div className="actions">
      <button type="button" title="Send back ([)" disabled={index <= 0} onClick={() => commit(withMoved(d, item.id, -1))}>
        Back
      </button>
      <button type="button" title="Bring forward (])" disabled={index >= d.items.length - 1} onClick={() => commit(withMoved(d, item.id, 1))}>
        Forward
      </button>
    </div>
  )
  if (item.id === PAINT_ID)
    return (
      <Section title="Paint layer" actions={actions}>
        <p className="hint">What the brush, the eraser and the fill paint on. Its place in the order: {index + 1} of {d.items.length}.</p>
      </Section>
    )
  if (!isShape(item)) return null
  const mirrorCopy = (axis: 'x' | 'y') => {
    const t = item.kind === 'text' ? textLayout(item) : { w: 0, h: 0 }
    const copy = mirrorShape(item, axis, d.width, d.height, t.w, t.h)
    commit(withAdded(d, [copy]))
    select(copy.id)
  }
  const title = { rect: item.kind === 'rect' && item.steps > 0 ? 'Stepped rectangle' : 'Rectangle', ellipse: 'Ellipse', line: 'Line', text: 'Text' }[item.kind]
  return (
    <Section title={title} actions={actions}>
      {(item.kind === 'rect' || item.kind === 'ellipse') && (
        <>
          <div className="row">
            <NumberField label="x" value={item.x} min={0} max={d.width - 1} onChange={(x) => change(item, { x })} />
            <NumberField label="y" value={item.y} min={0} max={d.height - 1} onChange={(y) => change(item, { y })} />
            <NumberField label="w" value={item.w} min={1} max={d.width} onChange={(w) => change(item, { w })} />
            <NumberField label="h" value={item.h} min={1} max={d.height} onChange={(h) => change(item, { h })} />
          </div>
          <div className="row">
            <ColorField label="Border" value={item.border.color} onChange={(color) => change(item, { border: { ...item.border, color } })} />
            <NumberField label="Thickness" value={item.border.thickness} min={0} max={LIMITS.thicknessMax} onChange={(thickness) => change(item, { border: { ...item.border, thickness } })} />
          </div>
          <div className="row">
            <Toggle label="Fill" checked={item.fill !== null} onChange={(on) => change(item, { fill: on ? getState().settings.second : null })} />
            {item.fill !== null && <ColorField label="Fill colour" value={item.fill} onChange={(fill) => change(item, { fill })} />}
          </div>
          {item.kind === 'rect' && <NumberField label="Corner steps" value={item.steps} min={0} max={LIMITS.stepsMax} suffix="units" onChange={(steps) => change(item, { steps })} />}
        </>
      )}
      {item.kind === 'line' && (
        <>
          <div className="row">
            <NumberField label="x1" value={item.x1} min={0} max={d.width - 1} onChange={(x1) => change(item, { x1 })} />
            <NumberField label="y1" value={item.y1} min={0} max={d.height - 1} onChange={(y1) => change(item, { y1 })} />
            <NumberField label="x2" value={item.x2} min={0} max={d.width - 1} onChange={(x2) => change(item, { x2 })} />
            <NumberField label="y2" value={item.y2} min={0} max={d.height - 1} onChange={(y2) => change(item, { y2 })} />
          </div>
          <div className="row">
            <ColorField label="Colour" value={item.color} onChange={(color) => change(item, { color })} />
            <NumberField label="Thickness" value={item.thickness} min={1} max={LIMITS.thicknessMax} onChange={(thickness) => change(item, { thickness })} />
          </div>
        </>
      )}
      {item.kind === 'text' && (
        <>
          <TextInput item={item} />
          <div className="row">
            <NumberField label="x" value={item.x} min={0} max={d.width - 1} onChange={(x) => change(item, { x })} />
            <NumberField label="y" value={item.y} min={0} max={d.height - 1} onChange={(y) => change(item, { y })} />
          </div>
          <Choice label="Size" value={item.size} options={SIZES} onChange={(size) => change(item, { size })} />
          <ColorField label="Colour" value={item.color} onChange={(color) => change(item, { color })} />
          <div className="row">
            <NumberField label="Letter spacing" value={item.letterSpacing} min={0} max={LIMITS.spacingMax} onChange={(letterSpacing) => change(item, { letterSpacing })} />
            <NumberField label="Line spacing" value={item.lineSpacing} min={0} max={LIMITS.spacingMax} onChange={(lineSpacing) => change(item, { lineSpacing })} />
          </div>
          <Choice label="Align" value={item.align} options={ALIGNS} onChange={(align) => change(item, { align })} />
          <div className="row">
            <Toggle label="Outline" checked={item.outline !== null} onChange={(on) => change(item, { outline: on ? getState().settings.second : null })} />
            {item.outline !== null && <ColorField label="Outline colour" value={item.outline} onChange={(outline) => change(item, { outline })} />}
          </div>
          <div className="row">
            <Toggle label="Shadow" checked={item.shadow !== null} onChange={(on) => change(item, { shadow: on ? { color: '#000000', dx: 1, dy: 1 } : null })} />
            {item.shadow && (
              <>
                <ColorField label="Shadow colour" value={item.shadow.color} onChange={(color) => change(item, { shadow: { ...item.shadow!, color } })} />
                <NumberField label="x" value={item.shadow.dx} min={-LIMITS.shadowMax} max={LIMITS.shadowMax} onChange={(dx) => change(item, { shadow: { ...item.shadow!, dx } })} />
                <NumberField label="y" value={item.shadow.dy} min={-LIMITS.shadowMax} max={LIMITS.shadowMax} onChange={(dy) => change(item, { shadow: { ...item.shadow!, dy } })} />
              </>
            )}
          </div>
        </>
      )}
      <div className="actions wrap">
        <button type="button" title="A copy mirrored left ↔ right across the board's middle" onClick={() => mirrorCopy('x')}>
          Mirror copy ↔
        </button>
        <button type="button" title="A copy mirrored top ↔ bottom across the board's middle" onClick={() => mirrorCopy('y')}>
          Mirror copy ↕
        </button>
        <button type="button" className="danger" title="Delete" onClick={() => commit(withoutItem(d, item.id))}>
          Delete
        </button>
      </div>
    </Section>
  )
}

/** A starting set of colours: the Map app's dark fantasy ones */
const STARTER = [
  '#000000', '#140f0c', '#2b211a', '#4a3a2c', '#6b5236', '#8a6420', '#a89068', '#d8c59a', '#eadbb4', '#ffffff',
  '#3a1a12', '#6b1f1a', '#b8382b', '#e0563f', '#f08a24', '#ffd35a', '#f2d27a', '#d6a640', '#1d3b2a', '#2f6b3f',
  '#5aa34a', '#8fd16a', '#16323f', '#22303d', '#4a6478', '#4fc3f7', '#2a2a40', '#4b3b6b', '#8b7cf6', '#d5dbe3',
]

/** The main and second colours (swap with X), the starting set, and the colours the drawing uses */
function Palette() {
  const s = useStore((st) => st.settings)
  const d = useStore((st) => st.drawing)
  const used = [...new Set(flatten(d).filter((c): c is string => c !== null))]
  const swatch = (color: string) => (
    <button
      key={color}
      type="button"
      className={`swatch ${color === s.main ? 'main' : color === s.second ? 'second' : ''}`}
      style={{ background: color }}
      title={`${color} (click: main, right-click: second)`}
      onClick={() => setSettings({ main: color })}
      onContextMenu={(e) => {
        e.preventDefault()
        setSettings({ second: color })
      }}
    />
  )
  return (
    <Section title="Colours">
      <div className="row">
        <ColorField label="Main" value={s.main} onChange={(main) => setSettings({ main })} />
        <ColorField label="Second" value={s.second} onChange={(second) => setSettings({ second })} />
        <button type="button" className="swap" title="Swap (X)" onClick={() => setSettings({ main: s.second, second: s.main })}>
          ⇄
        </button>
      </div>
      <div className="swatches">{STARTER.map(swatch)}</div>
      <h3>
        In this drawing <span className={used.length > 62 ? 'over' : ''}>{used.length} / 62</span>
      </h3>
      <div className="swatches">{used.length ? used.map(swatch) : <p className="hint">Nothing drawn yet.</p>}</div>
    </Section>
  )
}

export default function SidePanel() {
  return (
    <aside className="side">
      <SelectionPanel />
      <ToolSettings />
      <Palette />
    </aside>
  )
}
