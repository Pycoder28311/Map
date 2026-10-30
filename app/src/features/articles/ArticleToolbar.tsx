import { useEditorState, type Editor } from '@tiptap/react'
import { useRef, useState, type ReactNode } from 'react'
import {
  LuAlignCenter,
  LuAlignJustify,
  LuAlignLeft,
  LuAlignRight,
  LuSquareDashed,
  LuFrame,
  LuAlignVerticalSpaceBetween,
  LuBold,
  LuChevronDown,
  LuX,
  LuCode,
  LuHighlighter,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListChecks,
  LuListOrdered,
  LuMinus,
  LuMoveHorizontal,
  LuOmega,
  LuPilcrow,
  LuPlus,
  LuRedo2,
  LuTable,
  LuUnderline,
  LuUndo2,
} from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import { addSection, paragraphLookOf, setParagraphLook } from '../../components/ui/editors/articleExtensions'
import ColourField from '../../components/ui/fields/ColourField'
import ColourPicker from '../../components/ui/fields/ColourPicker'
import TextField from '../../components/ui/fields/TextField'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import BarPopover from '../../components/ui/overlays/BarPopover'
import Dropdown from '../../components/ui/overlays/Dropdown'
import DropdownField from '../../components/ui/fields/DropdownField'
import { FONTS } from '../board/fonts'
import { insertStructure, STRUCTURE_KINDS, STRUCTURES, type StructureKind } from '../../components/ui/editors/structures'
import MoreFormats from './MoreFormats'
import StructureIcon from './StructureIcon'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import { GROUP_EXAMPLES } from './symbols'
import { useToolbarLevel } from './toolbarLevel'

/** The colours a picker starts on when the text has none of its own */
const TEXT_COLOUR = '#e5e5e5'
const BACKGROUND_COLOUR = '#fde047'

/** The sizes the dropdown inside the size field offers (px); a few have a name, shown faint at the right of the number. The field itself takes MIN_SIZE to MAX_SIZE; the editor's own size is NORMAL_SIZE */
const COMMON_SIZES: { size: number; name?: string }[] = [
  { size: 8, name: 'Tiny' },
  { size: 9, name: 'Tiny' },
  { size: 10, name: 'Tiny' },
  { size: 11, name: 'Small' },
  { size: 12, name: 'Small' },
  { size: 13, name: 'Small' },
  { size: 14, name: 'Medium' },
  { size: 15, name: 'Medium' },
  { size: 16, name: 'Medium' },
  { size: 18, name: 'Medium' },
  { size: 20, name: 'Large' },
  { size: 22, name: 'Large' },
  { size: 24, name: 'Large' },
  { size: 26, name: 'Big' },
  { size: 28, name: 'Big' },
  { size: 32, name: 'XL' },
  { size: 36, name: 'XL' },
  { size: 40, name: 'XXL' },
  { size: 48, name: 'XXL' },
  { size: 56, name: 'Huge' },
  { size: 64, name: 'Huge' },
  { size: 72, name: 'Huge' },
  { size: 96, name: 'Giant' },
  { size: 128, name: 'Giant' },
  { size: 200, name: 'Giant' },
]
const MIN_SIZE = 8
const MAX_SIZE = 200
const NORMAL_SIZE = 16

type ListKind = 'none' | 'bulletList' | 'orderedList' | 'taskList'
const LISTS: { value: ListKind; label: string; icon: PlainIcon }[] = [
  { value: 'none', label: 'No list', icon: LuPilcrow },
  { value: 'bulletList', label: 'Bulleted list', icon: LuList },
  { value: 'orderedList', label: 'Numbered list', icon: LuListOrdered },
  { value: 'taskList', label: 'Checklist', icon: LuListChecks },
]
const TOGGLE_LIST: Record<Exclude<ListKind, 'none'>, (e: Editor) => void> = {
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  orderedList: (e) => e.chain().focus().toggleOrderedList().run(),
  taskList: (e) => e.chain().focus().toggleTaskList().run(),
}

type Align = 'left' | 'center' | 'right' | 'justify'
const ALIGNS: { value: Align; label: string; icon: PlainIcon }[] = [
  { value: 'left', label: 'Align left', icon: LuAlignLeft },
  { value: 'center', label: 'Centre', icon: LuAlignCenter },
  { value: 'right', label: 'Align right', icon: LuAlignRight },
  { value: 'justify', label: 'Justify', icon: LuAlignJustify },
]

type Insert = 'image' | 'table' | 'divider'
const INSERTS: { value: Insert; label: string; icon: PlainIcon }[] = [
  { value: 'image', label: 'Image', icon: LuImage },
  { value: 'table', label: 'Table', icon: LuTable },
  { value: 'divider', label: 'Divider', icon: LuMinus },
]

type Props = {
  editor: Editor | null
  /** Stores a picture and answers its address (Insert ▸ Image) */
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
  /** Whether the second row shows (the ⋯ on the bar's right edge): the page holds it, the link row shows with it too (LinkRow.tsx) */
  secondRow: boolean
  onSecondRowChange: (shown: boolean) => void
  /** The X at the bar's top corner: hides the whole bar (the page shows a button to bring it back) */
  onClose: () => void
  /** The bar's last row, under its own line (the links: LinkRow); nothing while it has nothing to show */
  lastRow?: ReactNode
}

/** A thin line between two groups of buttons (the gap around it is the row's) */
function Separator() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-(--divider-line)" />
}

function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  // Never split: a narrow bar breaks its rows between groups (toolbarLevel.ts, level 3)
  return <div className={`flex shrink-0 items-center gap-base ${className}`}>{children}</div>
}

/**
 * The small element that floats above a control while the pointer rests on it (or it has the focus): its name, and, for the second row's, a
 * sentence on what it does (`text`). For a control that is not one button (a dropdown field): it wraps it
 */
function Tip({ name, text, children }: { name: string; text?: string; children: ReactNode }) {
  return (
    <HoverInfo title={name} text={text} side="top" delay={350}>
      <span className="inline-flex">{children}</span>
    </HoverInfo>
  )
}

/** A button that keeps the caret in the text while it is pressed (`tip`: the sentence its floating element says) */
function ToolButton(props: {
  tip?: string
  icon: PlainIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  bigIcon?: boolean
  iconClassName?: string
}) {
  return (
    <HoverInfo title={props.label} text={props.tip} side="top" delay={350}>
      <IconButton
        icon={props.icon}
        label={props.label}
        size="sm"
        variant={props.active ? 'selected' : 'ghost'}
        aria-pressed={props.active}
        disabled={props.disabled}
        // An icon button's icon is as big as its text (1em): the size is set on the icon itself (`!`: the button's own rule is more specific); the same as the
        // List and Text align buttons have
        className={props.bigIcon ? '[&>svg]:size-6!' : '[&>svg]:size-5!'}
        iconClassName={props.iconClassName}
        onMouseDown={(e) => e.preventDefault()}
        onClick={props.onClick}
      />
    </HoverInfo>
  )
}

/** A button with its name beside the icon, that keeps the caret in the text while it is pressed (`small`: the link row's, LinkRow.tsx) */
export function TextButton(props: {
  /** The sentence its floating element says under its name (left out: just the name) */
  tip?: string
  icon?: PlainIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  filled?: boolean
  big?: boolean
  small?: boolean
}) {
  return (
    <HoverInfo title={props.label} text={props.tip} side="top" delay={350}>
      <Button
        icon={props.icon}
        size={props.small ? 'xs' : 'sm'}
        plain
        filled={props.filled}
        variant={props.active ? 'selected' : 'ghost'}
        aria-pressed={props.active}
        disabled={props.disabled}
        title={props.title}
        // The icon close to the text, the text of a field for all of them; a plain one has the bar's icon size (1.25rem), the big one (Section) a smaller icon (`!` wins over the bar's)
        className={`[--btn-icon-gap:0.25rem]! font-normal! [--btn-font-size:1rem]! [--btn-text:var(--fg)]! [--btn-hover-text:var(--fg)]! ${
          props.small ? '[--btn-icon-size:0.875rem]! [--btn-font-size:0.8125rem]!' : props.big ? '[--btn-icon-size:1rem]!' : '[--btn-icon-size:1.25rem]!'
        }`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={props.onClick}
      >
        {props.label}
      </Button>
    </HoverInfo>
  )
}

/** The font, as the map's text sidebar has it: each name in its own font */
function FontSelect({ editor, font }: { editor: Editor; font: string }) {
  const known = font === '' || FONTS.some((f) => f.stack === font)
  const options = [
    { value: '', label: 'Default font' },
    ...(known ? [] : [{ value: font, label: font }]),
    ...FONTS.map((f) => ({
      value: f.stack,
      label: f.name,
      style: { fontFamily: f.stack },
    })),
  ]
  return (
    <DropdownField
      label="Font"
      width="w-36"
      value={font}
      options={options}
      onChange={(next) => (next ? editor.chain().focus().setFontFamily(next).run() : editor.chain().focus().unsetFontFamily().run())}
    />
  )
}

/** The font size, as the map's text sidebar has it: a number (px) you can type, and the sizes to pick from, many, a few with a name */
function SizeControl({ editor, size }: { editor: Editor; size: number }) {
  // What is typed, until Enter or leaving the input; null: showing the size
  const [typed, setTyped] = useState<string | null>(null)
  const apply = (px: number) => (px === NORMAL_SIZE ? editor.chain().focus().unsetFontSize().run() : editor.chain().focus().setFontSize(`${px}px`).run())
  const commitTyped = () => {
    const n = Math.round(Number(typed))
    setTyped(null)
    if (Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE && n !== size) apply(n)
  }
  return (
    <DropdownField
      label="Font size"
      width="w-16"
      centerOptions
      value={String(Math.round(size))}
      options={COMMON_SIZES.map((z) => ({
        value: String(z.size),
        label: String(z.size),
        hint: z.name,
      }))}
      onChange={(n) => apply(Number(n))}
    >
      <input
        type="number"
        min={MIN_SIZE}
        max={MAX_SIZE}
        value={typed ?? Math.round(size)}
        aria-label="Font size"
        onChange={(e) => {
          const inputType = (e.nativeEvent as InputEvent).inputType
          setTyped(e.target.value)
          // Typing waits for Enter or leaving
          const n = Number(e.target.value)
          if (inputType !== 'insertText' && inputType !== 'deleteContentBackward' && n >= MIN_SIZE && n <= MAX_SIZE) {
            setTyped(null)
            apply(Math.round(n))
          }
        }}
        onBlur={commitTyped}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="box-content h-4 min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 py-sm text-center text-body leading-none outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </DropdownField>
  )
}

/** The weights the Bold dropdown offers, by name */
const WEIGHTS = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra bold', value: '800' },
  { label: 'Black', value: '900' },
]

/** Sets (or, with null, takes off) one look of the text's own style (its weight or slant), keeping the others */
function setTextLook(editor: Editor, key: 'fontWeight' | 'fontStyle', value: string | null) {
  const attrs = editor.getAttributes('textStyle')
  return editor
    .chain()
    .focus()
    .setMark('textStyle', { ...attrs, [key]: value })
    .removeEmptyTextStyle()
}

/** Bold: the button that makes it bold, and the arrow of a dropdown of how bold (100 to 900), like the underline's */
function BoldControl({ editor, bold, weight }: { editor: Editor; bold: boolean; weight: string }) {
  const current = weight || (bold ? '700' : '400')
  const on = bold || (weight !== '' && weight !== '400')
  return (
    <DropdownField
      label="How bold"
      width="w-auto"
      bordered={false}
      options={[
        { value: 'heading:weight', label: 'Weight', heading: true },
        ...WEIGHTS.map((w) => ({
          value: w.value,
          label: w.label,
          hint: w.value,
          checked: w.value === current,
          style: { fontWeight: Number(w.value) },
        })),
      ]}
      // A weight is the text's own, so the bold mark goes (they would mix); Regular takes both off
      onChange={(w) =>
        setTextLook(editor, 'fontWeight', w === '400' ? null : w)
          .unsetBold()
          .run()
      }
    >
      <IconButton
        icon={LuBold}
        label="Bold"
        size="sm"
        variant={on ? 'selected' : 'ghost'}
        aria-pressed={on}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (on ? setTextLook(editor, 'fontWeight', null).unsetBold().run() : editor.chain().focus().toggleBold().run())}
        className="ui-dropfield-icon [&>svg]:size-5!"
      />
    </DropdownField>
  )
}

/** The slants the Italic dropdown offers: the editor's italic, or an oblique one at an angle (how far it leans) */
const SLANTS = [
  { label: 'Slight', value: 'oblique 6deg' },
  { label: 'Normal', value: 'italic' },
  { label: 'Strong', value: 'oblique 20deg' },
]

/** Italic: the button that makes it italic, and the arrow of a dropdown of how much it leans, like the underline's */
function ItalicControl({ editor, italic, slant }: { editor: Editor; italic: boolean; slant: string }) {
  const current = slant || (italic ? 'italic' : '')
  const on = italic || slant !== ''
  return (
    <DropdownField
      label="How slanted"
      width="w-auto"
      bordered={false}
      options={[
        { value: 'heading:slant', label: 'Slant', heading: true },
        ...SLANTS.map((z) => ({
          value: z.value,
          label: z.label,
          checked: z.value === current,
          style: { fontStyle: z.value },
        })),
      ]}
      // Normal is the editor's own italic; an oblique one is the text's own style, so the italic mark goes (they would mix)
      onChange={(z) => (z === 'italic' ? setTextLook(editor, 'fontStyle', null).setItalic().run() : setTextLook(editor, 'fontStyle', z).unsetItalic().run())}
    >
      <IconButton
        icon={LuItalic}
        label="Italic"
        size="sm"
        variant={on ? 'selected' : 'ghost'}
        aria-pressed={on}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (on ? setTextLook(editor, 'fontStyle', null).unsetItalic().run() : editor.chain().focus().toggleItalic().run())}
        className="ui-dropfield-icon [&>svg]:size-5!"
      />
    </DropdownField>
  )
}

/** "rgb(12, 34, 56)" (or rgba) as "#0c2238" */
function rgbToHex(css: string): string | null {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(css)
  return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : null
}

/** The colour the text at the selection really shows (its own, or the editor's): what the colour icons are drawn in */
function shownTextColour(e: Editor): string {
  try {
    const node = e.view.domAtPos(e.state.selection.from).node
    const el = node instanceof HTMLElement ? node : node.parentElement
    return (el && rgbToHex(getComputedStyle(el).color)) || TEXT_COLOUR
  } catch {
    return TEXT_COLOUR
  }
}

/** The values the paragraph dropdowns offer: padding and letter gap in px, row gap as a multiple of the text size, border width in px (0: none) */
const PADDINGS = [0, 2, 4, 8, 12, 16, 24, 32, 48]
const LETTER_GAPS = [-1, 0, 0.5, 1, 2, 3, 5, 10]
const ROW_GAPS = [1, 1.2, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3]
const BORDER_WIDTHS = [0, 1, 2, 3, 4, 6, 8]
/** The word each value is tagged with in its list, as Bold's and Italic's have (value → word) */
const PADDING_TAGS: Record<number, string> = {
  0: 'None',
  2: 'Tiny',
  4: 'Small',
  8: 'Medium',
  12: 'Big',
  16: 'Large',
  24: 'Extra large',
  32: 'Huge',
  48: 'Giant',
}
const LETTER_GAP_TAGS: Record<number, string> = {
  [-1]: 'Tight',
  0: 'Normal',
  0.5: 'Slight',
  1: 'Small',
  2: 'Medium',
  3: 'Big',
  5: 'Large',
  10: 'Huge',
}
const ROW_GAP_TAGS: Record<number, string> = {
  1: 'Tight',
  1.2: 'Snug',
  1.4: 'Small',
  1.5: 'Normal',
  1.6: 'Medium',
  1.8: 'Big',
  2: 'Large',
  2.5: 'Extra large',
  3: 'Huge',
}
const BORDER_WIDTH_TAGS: Record<number, string> = {
  0: 'None',
  1: 'Hairline',
  2: 'Thin',
  3: 'Medium',
  4: 'Thick',
  6: 'Heavy',
  8: 'Extra heavy',
}
/** A border's colour until one is picked */
const BORDER_COLOUR = '#9ca3af'
const BORDER_LOOK = /^(\d+)px solid (.+)$/
/** The structures the Ω box shows as examples: the first two (power and index); all four are in its popout's Basics */
const BOX_STRUCTURES = STRUCTURE_KINDS.slice(0, 2)

/** The sentence each structure's floating element says */
const STRUCTURE_TIPS: Record<StructureKind, string> = {
  power: 'Writes a base with a small raised power. Type the base, press Tab, then type the power.',
  index: 'Writes a base with a small lowered index. Type the base, press Tab, then type the index.',
  absolute: 'Writes a value between two bars, like |x|. Type the value between them.',
  factorial: 'Writes a value followed by an exclamation mark, like n!. Type the value before it.',
}

/** What a paragraph has when it says nothing about its row gap */
const NORMAL_ROW_GAP = 1.5

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

/**
 * The look of the paragraph the caret is in (padding, letter gap, row gap, border): a dropdown for each, showing its icon and value, the
 * values to pick from in the list, like the underline's. A pick applies at once.
 */
function ParagraphLook({ editor, look }: { editor: Editor; look: Partial<Record<'padding' | 'letterSpacing' | 'lineHeight' | 'border', string>> }) {
  const padding = parseFloat(look.padding ?? '') || 0
  const letterGap = parseFloat(look.letterSpacing ?? '') || 0
  const rowGap = parseFloat(look.lineHeight ?? '') || NORMAL_ROW_GAP
  const border = BORDER_LOOK.exec(look.border ?? '')
  const borderWidth = border ? Number(border[1]) : 0
  const borderColour = border?.[2] ?? BORDER_COLOUR
  const setBorder = (width: number, colour: string) => setParagraphLook(editor, 'border', width > 0 ? `${width}px solid ${colour}` : null)
  const field = { width: 'w-auto', bordered: false } as const
  return (
    <>
      <Tip name="Padding" text="Sets the space between the paragraph’s text and its edge.">
        <DropdownField
          {...field}
          label="Padding"
          display={<Shown icon={LuSquareDashed}>{padding}</Shown>}
          options={PADDINGS.map((n) => ({
            value: String(n),
            label: n ? `${n}px` : 'None',
            hint: PADDING_TAGS[n],
            hintBig: true,
            checked: n === padding,
          }))}
          onChange={(n) => setParagraphLook(editor, 'padding', Number(n) ? `${n}px` : null)}
        />
      </Tip>
      <Tip name="Letter gap" text="Sets the space between each letter of the paragraph.">
        <DropdownField
          {...field}
          label="Letter gap"
          display={<Shown icon={LuMoveHorizontal}>{letterGap}</Shown>}
          options={LETTER_GAPS.map((n) => ({
            value: String(n),
            // The tag is the label, set with the letter gap it stands for; the number is the small hint
            label: LETTER_GAP_TAGS[n],
            hint: `${n}px`,
            style: { letterSpacing: `${n}px` },
            checked: n === letterGap,
          }))}
          onChange={(n) => setParagraphLook(editor, 'letterSpacing', Number(n) ? `${Number(n).toFixed(1)}px` : null)}
        />
      </Tip>
      <Tip name="Row gap" text="Sets the space between the lines of the paragraph.">
        <DropdownField
          {...field}
          label="Row gap"
          display={<Shown icon={LuAlignVerticalSpaceBetween}>{rowGap}</Shown>}
          options={ROW_GAPS.map((n) => ({
            value: String(n),
            label: String(n),
            hint: ROW_GAP_TAGS[n],
            hintBig: true,
            checked: n === rowGap,
          }))}
          onChange={(n) => setParagraphLook(editor, 'lineHeight', Number(n) === NORMAL_ROW_GAP ? null : Number(n).toFixed(1))}
        />
      </Tip>
      <Tip name="Border" text="Draws a line round the paragraph, in the width and colour you pick.">
        <DropdownField
          {...field}
          label="Border"
          display={<Shown icon={LuFrame}>{borderWidth || '–'}</Shown>}
          options={[
            { value: 'heading:width', label: 'Width', heading: true },
            ...BORDER_WIDTHS.map((n) => ({
              value: `width:${n}`,
              label: n ? `${n}px` : 'None',
              hint: BORDER_WIDTH_TAGS[n],
              hintBig: true,
              checked: n === borderWidth,
            })),
          ]}
          onChange={(v) => setBorder(Number(v.slice(6)), borderColour)}
          // The colour: the picker, its own squares under the palette the only ones. A colour picked on a paragraph with no border gives it a 1px one, so the pick shows
          extra={
            <div className="border-t border-line p-2">
              <p className="pb-1 text-small text-fg-subtle">Colour</p>
              <ColourPicker
                key={borderColour}
                value={borderColour}
                onLive={(hex) => setBorder(Math.max(borderWidth, 1), hex)}
                onCommit={(hex) => setBorder(Math.max(borderWidth, 1), hex)}
              />
            </div>
          }
        />
      </Tip>
    </>
  )
}

/** How an underline can be drawn, and the colours it can have ('' is the text's own colour) */
const UNDERLINE_KINDS = ['solid', 'double', 'dotted', 'dashed', 'wavy']

/** Underline: the button that underlines, and the arrow of a dropdown of its kind and colour, in one field like the font size's */
function UnderlineControl({ editor, on, kind, colour }: { editor: Editor; on: boolean; kind: string; colour: string }) {
  const options = [
    // No underline at all
    { value: 'none:', label: 'None', checked: !on },
    { value: 'heading:kind', label: 'Kind', heading: true },
    // Each kind's name is underlined that way
    ...UNDERLINE_KINDS.map((k) => ({
      value: `kind:${k}`,
      label: k[0].toUpperCase() + k.slice(1),
      checked: on && kind === k,
      style: {
        textDecorationLine: 'underline',
        textDecorationStyle: k as 'solid',
        textDecorationThickness: '2px',
        textUnderlineOffset: '4px',
      },
    })),
    { value: 'heading:colour', label: 'Colour', heading: true },
    // Any other colour: the picker under the list (its squares are the only ones)
    {
      value: 'colour:',
      label: 'Same as the text',
      checked: on && colour === '',
    },
  ]
  // A pick sets that part of the underline (and underlines the selection if it is not yet), keeping the other: solid and the text's colour are left unwritten
  const pick = (value: string) => {
    const [part, picked] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)]
    if (part === 'none') return void editor.chain().focus().unsetUnderline().run()
    const next = {
      textDecorationColor: colour || null,
      textDecorationStyle: kind === 'solid' ? null : kind,
    }
    if (part === 'kind') next.textDecorationStyle = picked === 'solid' ? null : picked
    else next.textDecorationColor = picked || null
    editor.chain().focus().setMark('underline', next).run()
  }
  // Any colour: the picker the colour buttons have, at the end of the list
  const setColour = (hex: string, final: boolean) => {
    const chain = final ? editor.chain().focus() : editor.chain()
    chain
      .setMark('underline', {
        textDecorationColor: hex,
        textDecorationStyle: kind === 'solid' ? null : kind,
      })
      .run()
  }
  return (
    <DropdownField
      label="Underline kind and colour"
      width="w-auto"
      bordered={false}
      options={options}
      onChange={pick}
      extra={
        <div className="border-t border-line p-2">
          <ColourPicker key={colour} value={colour || TEXT_COLOUR} onLive={(hex) => setColour(hex, false)} onCommit={(hex) => setColour(hex, true)} />
        </div>
      }
    >
      <IconButton
        label="Underline"
        size="sm"
        variant={on ? 'selected' : 'ghost'}
        aria-pressed={on}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="ui-dropfield-icon [&>svg]:size-5!"
      >
        {/* The icon is drawn in the underline's own colour while the text has one */}
        <LuUnderline style={colour ? { color: colour } : undefined} />
      </IconButton>
    </DropdownField>
  )
}

/**
 * The article's toolbar, a row of buttons that drive its editor (`editor`, from the text field's onEditor): undo / redo,
 * the text (font and size, as the map's text sidebar has them, bold, italic, underline with a dropdown of its kind and colour, the text colour as a coloured A and the background colour), lists, the alignments one next to the other,
 * next to the alignments with no space: Media (an image icon and its name; it opens the image, table and divider choice) and Link (a link icon and its name) together, with no gap and a line before them.
 */
export default function ArticleToolbar({ editor, onUploadImage, onUploadError, secondRow, onSecondRowChange, onClose, lastRow }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const style = e.getAttributes('textStyle') as {
        fontFamily?: string
        fontSize?: string
        color?: string
        backgroundColor?: string
        fontWeight?: string
        fontStyle?: string
      }
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        weight: style.fontWeight ?? '',
        slant: style.fontStyle ?? '',
        font: style.fontFamily ?? '',
        size: style.fontSize ?? '',
        colour: style.color ?? TEXT_COLOUR,
        shownColour: style.color ?? shownTextColour(e),
        colourSet: style.color ?? '',
        background: style.backgroundColor ?? BACKGROUND_COLOUR,
        backgroundSet: style.backgroundColor ?? '',
        underline: e.isActive('underline'),
        look: paragraphLookOf(e),
        code: e.isActive('code'),
        underlineColour: (e.getAttributes('underline').textDecorationColor as string | undefined) ?? '',
        underlineKind: (e.getAttributes('underline').textDecorationStyle as string | undefined) ?? 'solid',
        list: (LISTS.find((l) => l.value !== 'none' && e.isActive(l.value))?.value ?? 'none') as ListKind,
        align: (ALIGNS.find((a) => e.isActive({ textAlign: a.value }))?.value ?? 'left') as Align,
        link: e.isActive('link'),
        href: (e.getAttributes('link').href as string | undefined) ?? '',
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      }
    },
  })
  const [more, setMore] = useState(false)
  const [linking, setLinking] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [href, setHref] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  // How narrow the bar is (toolbarLevel.ts): what folds into dropdowns and what moves to the second row
  const [level, bar] = useToolbarLevel()

  if (!editor || !state) return null

  const insertImages = async (files: File[]) => {
    for (const file of files) {
      try {
        const src = await onUploadImage(file)
        editor
          .chain()
          .focus()
          .setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') })
          .run()
      } catch (error) {
        onUploadError(error)
      }
    }
  }
  const insert = (what: Insert) => {
    if (what === 'image') picker.current?.click()
    else if (what === 'table') editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    else editor.chain().focus().setHorizontalRule().run()
  }
  const applyLink = () => {
    const url = href.trim()
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    else editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinking(false)
  }

  const colours = (
    <Group>
      <Tip name="Text colour" text={level >= 2 ? 'Changes the colour of the selected text.' : undefined}>
        <ColourField
          label="Text colour"
          letter="A"
          value={state.colour}
          shown={state.shownColour}
          onLive={(hex) => editor.chain().setColor(hex).run()}
          onCommit={(hex) => editor.chain().focus().setColor(hex).run()}
        />
      </Tip>
      <Tip name="Background colour" text={level >= 2 ? 'Paints a colour behind the selected text, like a highlighter.' : undefined}>
        <ColourField
          label="Background colour"
          icon={LuHighlighter}
          value={state.background}
          // No background on the text: no colour bar under the icon
          shown={state.backgroundSet || 'transparent'}
          onLive={(hex) => editor.chain().setBackgroundColor(hex).run()}
          onCommit={(hex) => editor.chain().focus().setBackgroundColor(hex).run()}
        />
      </Tip>
    </Group>
  )
  // The Ω popout: Basics (the structures, superscript, subscript), SVGs, Mathematical, Others
  const omegaPopout = (trigger: ReactNode) => (
    <BarPopover label="Structures, shapes, maths and other characters" open={more} align="end" wide onOpenChange={setMore} trigger={trigger}>
      <MoreFormats editor={editor} />
    </BarPopover>
  )
  // Level 3 (a phone): the rows wrap between their groups, into as many rows as they need
  const rowClass = level >= 3 ? 'flex flex-wrap items-center gap-base' : 'flex flex-nowrap items-center gap-base overflow-x-auto'

  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label="Article formatting"
      // Every icon one size, 1.25rem: the buttons' own (a button sets its size from its text) and the colour fields'
      className="relative flex flex-col gap-base rounded-(--card-radius) border border-line bg-surface p-base shadow-sm [--btn-icon-size:1.25rem] [&_button]:[--btn-icon-size:1.25rem]"
    >
      {/* The X: its centre on the bar's top right corner; it hides the whole bar */}
      <div className="absolute end-0 top-0 z-20 translate-x-1/2 -translate-y-1/2 border border-line bg-surface shadow-md">
        <ToolButton icon={LuX} label="Close the edit bar" onClick={onClose} />
      </div>
      {/* The first row: it scrolls sideways when it is too wide, until the bar is narrow enough to wrap it (level 3) */}
      <div className={rowClass}>
        <Group>
          <ToolButton icon={LuUndo2} label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
          <ToolButton icon={LuRedo2} label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
        </Group>
        <Separator />
        <Group>
          <Tip name="Font">
            <FontSelect editor={editor} font={state.font} />
          </Tip>
          <Tip name="Font size">
            <SizeControl editor={editor} size={parseFloat(state.size) || NORMAL_SIZE} />
          </Tip>
          <Tip name="Bold">
            <BoldControl editor={editor} bold={state.bold} weight={state.weight} />
          </Tip>
          <Tip name="Italic">
            <ItalicControl editor={editor} italic={state.italic} slant={state.slant} />
          </Tip>
          <Tip name="Underline">
            <UnderlineControl editor={editor} on={state.underline} kind={state.underlineKind} colour={state.underlineColour} />
          </Tip>
        </Group>
        {/* The colours, until the bar is narrow (level 2): then they are in the second row */}
        {level < 2 && (
          <>
            <Separator />
            {colours}
          </>
        )}
        <Separator />
        <Group>
          <Tip name="List">
            <Dropdown
              label="List"
            center
              triggerIcon={LISTS.find((l) => l.value === state.list)?.icon ?? LuList}
              className="[&>svg]:size-5!"
              value={state.list}
              options={LISTS}
              onChange={(list) => {
                if (list !== 'none') TOGGLE_LIST[list](editor)
                else if (state.list !== 'none') TOGGLE_LIST[state.list](editor)
              }}
            />
          </Tip>
          {/* The alignments one next to the other, the current one pressed; one dropdown on a narrower bar (level 1) */}
          {level >= 1 ? (
            <Tip name="Align">
              <Dropdown
                label="Align"
              center
                triggerIcon={ALIGNS.find((a) => a.value === state.align)?.icon ?? LuAlignLeft}
                className="[&>svg]:size-5!"
                value={state.align}
                options={ALIGNS}
                onChange={(align) => editor.chain().focus().setTextAlign(align).run()}
              />
            </Tip>
          ) : (
            ALIGNS.map((a) => (
              <ToolButton
                key={a.value}
                icon={a.icon}
                label={a.label}
                active={state.align === a.value}
                onClick={() => editor.chain().focus().setTextAlign(a.value).run()}
              />
            ))
          )}
        </Group>
        {/* A line, then Media and Link together with no space between them; the row's gap is on both sides of the line */}
        <Separator />
        <div className="flex shrink-0 items-center">
          <BarPopover
            label="Insert"
            open={inserting}
            onOpenChange={setInserting}
            trigger={
              <TextButton icon={LuImage} label="Media" title="Insert: image, table, divider" active={inserting} onClick={() => setInserting((open) => !open)} />
            }
          >
            <div className="flex flex-col gap-0.5">
              {INSERTS.map((i) => (
                <Button
                  key={i.value}
                  variant="ghost"
                  size="sm"
                  icon={i.icon}
                  className="w-full justify-start"
                  onClick={() => {
                    setInserting(false)
                    insert(i.value)
                  }}
                >
                  {i.label}
                </Button>
              ))}
            </div>
          </BarPopover>
          <BarPopover
            label="Link"
            open={linking}
            onOpenChange={setLinking}
            trigger={
              <TextButton
                icon={LuLink}
                label="Link"
                big
                active={state.link}
                onClick={() => {
                  setHref(state.href)
                  setLinking((open) => !open)
                }}
              />
            }
          >
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                applyLink()
              }}
            >
              <TextField label="Link address" placeholder="https://…" value={href} onChange={(e) => setHref(e.target.value)} autoFocus />
              <div className="flex justify-end gap-2">
                {state.link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().extendMarkRange('link').unsetLink().run()
                      setLinking(false)
                    }}
                  >
                    Remove
                  </Button>
                )}
                <Button type="submit" size="sm">
                  Apply
                </Button>
              </div>
            </form>
          </BarPopover>
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              void insertImages([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </div>
        {/* More: shows and hides the second row. Text like Media and Link's, but muted (not white), a line before it like the row's others, the
            arrow at its right: it turns to point right while the second row is open */}
        <div className="ms-auto flex shrink-0 items-center gap-base">
          <Separator />
          <HoverInfo title={secondRow ? 'Hide the second row' : 'Show the second row'} side="top" delay={350}>
            <Button
              variant="ghost"
              size="sm"
              plain
              aria-expanded={secondRow}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSecondRowChange(!secondRow)}
              className="font-normal! [--btn-font-size:1rem]! [--btn-hover-text:var(--fg)]! [--btn-text:var(--fg-muted)]!"
            >
              More
              <LuChevronDown
                aria-hidden
                className={`ms-1 size-5 transition-transform duration-200 motion-reduce:transition-none ${secondRow ? '-rotate-90' : ''}`}
              />
            </Button>
          </HoverInfo>
        </div>
      </div>
      {/* The second row: the colours when the bar is narrow (shown even with the ⋯ closed), then, while the ⋯ has it open, Code at the left,
          the paragraph's dropdowns, Section and the Ω box at the right */}
      {(secondRow || level >= 2) && (
        <div className="flex flex-wrap items-center gap-lg">
          {level >= 2 && colours}
          {level >= 2 && secondRow && <Separator />}
          {secondRow && (
            <>
              {/* Add section, then Code (both with their background, no line between them), at the left */}
              <TextButton
                tip="Adds a new section at the end of the article: a heading and an empty paragraph."
                icon={LuPlus}
                label="Add section"
                big
                filled
                onClick={() => addSection(editor)}
              />
              <TextButton
                tip="Shows the selected text as code, in a fixed-width font with a background."
                icon={LuCode}
                label="Code"
                big
                filled
                active={state.code}
                onClick={() => editor.chain().focus().toggleCode().run()}
              />
              <Separator />
              <Group className="gap-lg!">
                <ParagraphLook editor={editor} look={state.look} />
              </Group>
              {/* The Ω box at the right end of the row */}
              <Group className="ms-auto gap-lg!">
                <Separator />
                {level >= 1 ? (
                  // A narrow bar: no examples, only the Ω that opens them all
                  omegaPopout(
                    <HoverInfo
                      title="Characters"
                      text="Opens the structures, shapes, maths symbols and other characters to put in the text."
                      side="top"
                      delay={350}
                    >
                      <IconButton
                        icon={LuOmega}
                        label="Structures, shapes, maths and other characters"
                        size="sm"
                        variant={more ? 'selected' : 'ghost'}
                        aria-expanded={more}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setMore((open) => !open)}
                        className="[&>svg]:size-5!"
                      />
                    </HoverInfo>,
                  )
                ) : (
                  // The examples (Word-like structures with places to fill), a line, and the square arrow that opens the popout
                  <div role="group" aria-label="Maths structures" className="flex items-center rounded-(--field-radius) border border-line-strong">
                    {BOX_STRUCTURES.map((kind) => (
                      <HoverInfo key={kind} title={STRUCTURES[kind].label} text={STRUCTURE_TIPS[kind]} side="top" delay={350}>
                        <IconButton label={STRUCTURES[kind].label} onMouseDown={(e) => e.preventDefault()} onClick={() => insertStructure(editor, kind)}>
                          <StructureIcon kind={kind} />
                        </IconButton>
                      </HoverInfo>
                    ))}
                    {/* The first character of each other group (SVGs, Mathematical, Others) */}
                    {GROUP_EXAMPLES.map((char) => (
                      <HoverInfo key={char} title={`Insert ${char}`} text={`Puts ${char} in the text where the cursor is.`} side="top" delay={350}>
                        <IconButton
                          label={`Insert ${char}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => editor.chain().focus().insertContent(char).run()}
                        >
                          <span aria-hidden className="text-[1.1rem] leading-none">
                            {char}
                          </span>
                        </IconButton>
                      </HoverInfo>
                    ))}
                    <span aria-hidden className="w-px self-stretch bg-line-strong" />
                    {omegaPopout(
                      <HoverInfo title="More characters" text="Opens all the structures, shapes, maths symbols and other characters." side="top" delay={350}>
                        <IconButton
                          icon={LuChevronDown}
                          label="More structures, shapes, maths and other characters"
                          variant={more ? 'selected' : 'ghost'}
                          aria-expanded={more}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setMore((open) => !open)}
                        />
                      </HoverInfo>,
                    )}
                  </div>
                )}
              </Group>
            </>
          )}
        </div>
      )}
      {lastRow}
    </div>
  )
}
