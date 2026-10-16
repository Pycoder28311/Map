import { useState } from 'react'
import { LuAlignCenter, LuAlignJustify, LuAlignLeft, LuAlignRight, LuAlignVerticalSpaceBetween, LuBold, LuEllipsis, LuItalic, LuMoveHorizontal, LuRotateCw, LuScan, LuSquare, LuStrikethrough, LuUnderline } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'
import ColourField from '../../../../components/ui/fields/ColourField'
import type { BoxShape, TextAlign } from '../../types'
import NumberBox, { JOINED } from '../../NumberBox'
import SidebarSection from '../common/SidebarSection'
import type { TextSource } from './textSource'
import { FONTS, WEIGHT_MAX, WEIGHT_MIN, stackOf } from '../../fonts'

export type FontMark = 'italic' | 'underline' | 'strike'

const LINES = [
  { mark: 'underline', icon: LuUnderline, label: 'Underline (Ctrl+U)', name: 'Underline' },
  { mark: 'strike', icon: LuStrikethrough, label: 'Strikethrough', name: 'Strikethrough' },
] as const

const ALIGNS = [
  { id: 'left', icon: LuAlignLeft, label: 'Align left' },
  { id: 'center', icon: LuAlignCenter, label: 'Align centre' },
  { id: 'right', icon: LuAlignRight, label: 'Align right' },
  { id: 'justify', icon: LuAlignJustify, label: 'Justify (a text with a box that wraps)' },
] as const

const FRAMES = [
  { id: 'square', icon: LuSquare, label: 'Square round the text' },
  { id: 'corners', icon: LuScan, label: 'Only the corners of a square' },
] as const


// Mouse down on a button would take the focus from the text being edited
const keep = (e: { preventDefault: () => void }) => e.preventDefault()

/** The font: a big dropdown, each name in its own font */
function FamilyRow({ source }: { source: TextSource }) {
  const font = source.value.font
  const onFont = (font: number) => source.onChange({ font })
  return (
    <>
      <select
        value={font}
        aria-label="Font"
        onChange={(e) => onFont(Number(e.target.value))}
        style={{ fontFamily: stackOf(font) }}
        className="h-11 w-full cursor-pointer rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-heading outline-none focus-visible:border-fg-subtle"
      >
        {FONTS.map((f, i) => (
          <option key={f.name} value={i} style={{ fontFamily: f.stack }}>
            {f.name}
          </option>
        ))}
      </select>
    </>
  )
}

/** Bold with its weight, italic with how it slants, underline and strikethrough each with its line's colour */
function MarksRow({ source }: { source: TextSource }) {
  const { weight, oblique } = source.value
  const { bold, marks } = source.shown
  const lineColors = { underline: source.value.underlineColor ?? source.value.color, strike: source.value.strikeColor ?? source.value.color }
  const onWeight = (weight: number) => source.onChange({ weight })
  const onBold = source.toggleBold
  const onMark = source.toggleMark
  const onOblique = (oblique: boolean) => source.onChange({ oblique })
  const onLineColor = (mark: 'underline' | 'strike', color: string) => source.onChange(mark === 'underline' ? { underlineColor: color } : { strikeColor: color })
  // What is typed in the weight input, until Enter or leaving it; null: showing the weight
  const [typed, setTyped] = useState<string | null>(null)
  const commitTyped = () => {
    const n = Math.round(Number(typed))
    setTyped(null)
    if (Number.isFinite(n) && n >= WEIGHT_MIN && n <= WEIGHT_MAX && n !== weight) onWeight(n)
  }
  return (
    <div className="flex flex-wrap items-stretch justify-between gap-1">
        {/* Bold and its weight are one element: one border, the button's end square against the input */}
        <div className={JOINED}>
          <IconButton icon={LuBold} label="Bold" variant={bold ? 'primary' : 'ghost'} aria-pressed={bold} className="rounded-(--radius-none)! p-1!" onMouseDown={keep} onClick={onBold} />
          <input
            type="number"
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step={100}
            value={typed ?? weight}
            aria-label="Boldness (100 to 900)"
            onChange={(e) => {
              // The arrows are final; typing waits for Enter or leaving
              const inputType = (e.nativeEvent as InputEvent).inputType
              setTyped(e.target.value)
              if (!e.target.dataset.scrubbing && inputType !== 'insertText' && inputType !== 'deleteContentBackward') {
                setTyped(null)
                const n = Math.round(Number(e.target.value))
                if (n >= WEIGHT_MIN && n <= WEIGHT_MAX) onWeight(n)
              }
            }}
            onBlur={commitTyped}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-16 border-0 border-s border-line-strong bg-surface px-2 text-small tabular-nums outline-none"
            />
        </div>
        {/* Italic with how it slants, underline and strikethrough each with its line's colour: one element each */}
        <div className={JOINED}>
          <IconButton icon={LuItalic} label="Italic (Ctrl+I)" variant={marks.italic ? 'primary' : 'ghost'} aria-pressed={marks.italic} className="rounded-(--radius-none)! p-1!" onMouseDown={keep} onClick={() => onMark('italic')} />
          <select
            value={oblique ? 'oblique' : 'italic'}
            aria-label="Italic style"
            onChange={(e) => onOblique(e.target.value === 'oblique')}
            className="cursor-pointer border-0 border-s border-line-strong bg-surface px-0.5 text-small outline-none"
          >
            <option value="italic">Italic</option>
            <option value="oblique">Oblique</option>
          </select>
        </div>
        {LINES.map((m) => (
          <div key={m.mark} className={JOINED}>
            <IconButton icon={m.icon} label={m.label} variant={marks[m.mark] ? 'primary' : 'ghost'} aria-pressed={marks[m.mark]} className="rounded-(--radius-none)! p-1!" onMouseDown={keep} onClick={() => onMark(m.mark)} />
            <span className="flex border-s border-line-strong">
              <ColourField bare label={`${m.name} colour`} value={lineColors[m.mark]} onLive={() => {}} onCommit={(color) => onLineColor(m.mark, color)} />
            </span>
          </div>
        ))}
      </div>
  )
}

/** Alignment, letter spacing, turn, and (behind the arrow) the space between lines and the frames */
function LayoutRows({ source }: { source: TextSource }) {
  const { align, spacing, rotation, lineGap } = source.value
  const frame = source.value.boxed ? source.value.boxShape : null
  const boxColor = source.value.boxColor ?? source.value.color
  const onAlign = (align: TextAlign) => source.onChange({ align })
  const onSpacing = (spacing: number) => source.onChange({ spacing })
  const onRotation = (rotation: number) => source.onChange({ rotation })
  const onLineGap = (lineGap: number) => source.onChange({ lineGap })
  const onFrame = (next: BoxShape | null) => source.onChange(next ? { boxed: true, boxShape: next } : { boxed: false })
  const onBoxColor = (boxColor: string) => source.onChange({ boxColor })
  // Whether the frames row is shown (it opens by itself on a text that already has a frame)
  const [more, setMore] = useState(frame !== null)
  return (
    <>
      {/* Alignment, letter spacing and how far the text is turned; the arrow shows the frames row */}
      <div className="flex flex-wrap items-stretch gap-1">
        <div className={JOINED}>
          {ALIGNS.map((a) => (
            <IconButton key={a.id} icon={a.icon} label={a.label} variant={align === a.id ? 'primary' : 'ghost'} aria-pressed={align === a.id} className="rounded-(--radius-none)! p-1!" onMouseDown={keep} onClick={() => onAlign(a.id)} />
          ))}
        </div>
        <label className={`${JOINED} min-w-20 flex-1`} title="Gap between letters">
          <span className="flex items-center p-1">
            <LuMoveHorizontal aria-hidden className="size-(--btn-icon-size) shrink-0 text-fg-muted" />
          </span>
          <NumberBox value={spacing} min={-10} max={100} label="Gap between letters" onCommit={onSpacing} />
        </label>
        <label className={`${JOINED} min-w-20 flex-1`} title="Turn the text (degrees)">
          <span className="flex items-center p-1">
            <LuRotateCw aria-hidden className="size-(--btn-icon-size) shrink-0 text-fg-muted" />
          </span>
          <NumberBox value={rotation} min={-360} max={360} label="Turn the text, in degrees" onCommit={onRotation} />
        </label>
        <IconButton
          icon={LuEllipsis}
          label={more ? 'Hide these' : 'More: the space between lines and frames'}
          aria-expanded={more}
          onClick={() => setMore(!more)}
          className="p-1!"
        />
      </div>
      {more && (
        <div className="flex items-stretch justify-between gap-1">
          <label className={`${JOINED} min-w-0 flex-1`} title="Space between the lines">
            <span className="flex items-center p-1">
              <LuAlignVerticalSpaceBetween aria-hidden className="size-(--btn-icon-size) shrink-0 text-fg-muted" />
            </span>
            <NumberBox value={lineGap} min={0} max={100} label="Space between the lines" onCommit={onLineGap} />
          </label>
          {FRAMES.map((f) => (
            <div key={f.id} className={JOINED}>
              <IconButton icon={f.icon} label={f.label} variant={frame === f.id ? 'primary' : 'ghost'} aria-pressed={frame === f.id} className="rounded-(--radius-none)! p-1!" onMouseDown={keep} onClick={() => onFrame(frame === f.id ? null : f.id)} />
              <span className="flex border-s border-line-strong">
                <ColourField bare label={`${f.label} colour`} value={boxColor} onLive={() => {}} onCommit={onBoxColor} />
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/** The text sidebar's Font section */
export default function TextFontSection({ source }: { source: TextSource }) {
  return (
    <SidebarSection id="font" title="Font">
      <FamilyRow source={source} />
      <MarksRow source={source} />
      <LayoutRows source={source} />
    </SidebarSection>
  )
}
