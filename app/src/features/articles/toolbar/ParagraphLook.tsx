import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { LuAlignVerticalSpaceBetween, LuFrame, LuMoveHorizontal, LuSquareDashed } from 'react-icons/lu'
import { setParagraphLook, type ParagraphLook as LookKey } from '../../../components/ui/editors/articleExtensions'
import ColourPicker from '../../../components/ui/fields/ColourPicker'
import type { DropdownFieldOption } from '../../../components/ui/fields/DropdownField'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import { BORDER_LOOK, BORDER_WIDTHS, DEFAULT_COLOURS, LETTER_GAPS, NORMAL_ROW_GAP, PADDINGS, ROW_GAPS, type TaggedValue } from './toolbarConfig'
import { TOOLBAR_TIPS } from './toolbarTexts'
import ToolbarDropdown from './ToolbarDropdown'

type Look = Partial<Record<LookKey, string>>

/** What a paragraph dropdown shows: its icon (as Word's paragraph dialogs have them) with the value small at its lower right, so the button stays narrow */
function Shown({ icon: Icon, children }: { icon: PlainIcon; children: ReactNode }) {
  return (
    <span className="relative flex">
      <Icon className="size-5 shrink-0" />
      {/* On a small pill, so it reads over the icon's lines */}
      <span className="absolute -end-1.5 -bottom-1.5 rounded-full bg-fill-strong px-[3px] py-px text-[0.625rem] leading-none font-medium tabular-nums">
        {children}
      </span>
    </span>
  )
}

/** A paragraph dropdown that is a list of numbers: its look (`key`), what it reads, how each value is listed and what a pick writes */
type NumberLook = {
  key: Exclude<LookKey, 'border'>
  name: string
  tip: string
  icon: PlainIcon
  values: TaggedValue[]
  /** The value the paragraph has now */
  read: (look: Look) => number
  /** A value's entry in the list */
  option: (value: TaggedValue, current: number) => DropdownFieldOption
  /** What is written for a picked value (null: nothing, the paragraph's normal) */
  write: (value: number) => string | null
}

const NUMBER_LOOKS: NumberLook[] = [
  {
    key: 'padding',
    name: 'Padding',
    tip: TOOLBAR_TIPS.padding,
    icon: LuSquareDashed,
    values: PADDINGS,
    read: (look) => parseFloat(look.padding ?? '') || 0,
    option: ({ value: n, tag }, current) => ({ value: String(n), label: n ? `${n}px` : 'None', hint: tag, hintBig: true, checked: n === current }),
    write: (n) => (n ? `${n}px` : null),
  },
  {
    key: 'letterSpacing',
    name: 'Letter gap',
    tip: TOOLBAR_TIPS.letterGap,
    icon: LuMoveHorizontal,
    values: LETTER_GAPS,
    read: (look) => parseFloat(look.letterSpacing ?? '') || 0,
    // The tag is the label, set with the letter gap it stands for; the number is the small hint
    option: ({ value: n, tag }, current) => ({ value: String(n), label: tag, hint: `${n}px`, style: { letterSpacing: `${n}px` }, checked: n === current }),
    write: (n) => (n ? `${n.toFixed(1)}px` : null),
  },
  {
    key: 'lineHeight',
    name: 'Row gap',
    tip: TOOLBAR_TIPS.rowGap,
    icon: LuAlignVerticalSpaceBetween,
    values: ROW_GAPS,
    read: (look) => parseFloat(look.lineHeight ?? '') || NORMAL_ROW_GAP,
    option: ({ value: n, tag }, current) => ({ value: String(n), label: String(n), hint: tag, hintBig: true, checked: n === current }),
    write: (n) => (n === NORMAL_ROW_GAP ? null : n.toFixed(1)),
  },
]

/** Border: its width from the list, its colour from the picker under it. A colour picked on a paragraph with no border gives it a 1px one, so the pick shows */
function BorderLook({ editor, look }: { editor: Editor; look: Look }) {
  const border = BORDER_LOOK.exec(look.border ?? '')
  const width = border ? Number(border[1]) : 0
  const colour = border?.[2] ?? DEFAULT_COLOURS.border
  const setBorder = (w: number, c: string) => setParagraphLook(editor, 'border', w > 0 ? `${w}px solid ${c}` : null)
  return (
    <ToolbarDropdown
      kind="split"
      name="Border"
      tip={TOOLBAR_TIPS.border}
      label="Border"
      display={<Shown icon={LuFrame}>{width || '–'}</Shown>}
      options={[
        { value: 'heading:width', label: 'Width', heading: true },
        ...BORDER_WIDTHS.map(({ value: n, tag }) => ({
          value: `width:${n}`,
          label: n ? `${n}px` : 'None',
          hint: tag,
          hintBig: true,
          checked: n === width,
        })),
      ]}
      onChange={(v) => setBorder(Number(v.slice(6)), colour)}
      // The colour: the picker, its own squares under the palette the only ones
      extra={
        <div className="border-t border-line p-2">
          <p className="pb-1 text-small text-fg-subtle">Colour</p>
          <ColourPicker key={colour} value={colour} onLive={(hex) => setBorder(Math.max(width, 1), hex)} onCommit={(hex) => setBorder(Math.max(width, 1), hex)} />
        </div>
      }
    />
  )
}

/**
 * The look of the paragraph the caret is in (padding, letter gap, row gap, border): a dropdown for each, showing its icon and value, the
 * values to pick from in the list, like the underline's. A pick applies at once.
 */
export default function ParagraphLook({ editor, look }: { editor: Editor; look: Look }) {
  return (
    <>
      {NUMBER_LOOKS.map((d) => {
        const current = d.read(look)
        return (
          <ToolbarDropdown
            key={d.key}
            kind="split"
            name={d.name}
            tip={d.tip}
            label={d.name}
            display={<Shown icon={d.icon}>{current}</Shown>}
            options={d.values.map((v) => d.option(v, current))}
            onChange={(n) => setParagraphLook(editor, d.key, d.write(Number(n)))}
          />
        )
      })}
      <BorderLook editor={editor} look={look} />
    </>
  )
}
