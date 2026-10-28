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
  LuEllipsis,
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
import MoreFormats from './MoreFormats'
import { SymbolRow } from './SymbolPanel'
import { COMMON_SYMBOLS } from './symbols'

/** The colours a picker starts on when the text has none of its own */
const TEXT_COLOUR = '#e5e5e5'
const BACKGROUND_COLOUR = '#fde047'

/** The sizes the dropdown inside the size field offers (px); a few have a name, shown faint at the right of the number. The field itself takes MIN_SIZE to MAX_SIZE; the editor's own size is NORMAL_SIZE */
const COMMON_SIZES: { size: number; name?: string }[] = [
  { size: 8 },
  { size: 9 },
  { size: 10 },
  { size: 11 },
  { size: 12, name: 'Small' },
  { size: 13 },
  { size: 14 },
  { size: 15 },
  { size: 16, name: 'Medium' },
  { size: 18 },
  { size: 20 },
  { size: 22 },
  { size: 24, name: 'Large' },
  { size: 26 },
  { size: 28 },
  { size: 32, name: 'XL' },
  { size: 36 },
  { size: 40 },
  { size: 48 },
  { size: 56 },
  { size: 64 },
  { size: 72 },
  { size: 96 },
  { size: 128 },
  { size: 200 },
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
}

/** A thin line between two groups of buttons (the gap around it is the row's) */
function Separator() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-(--divider-line)" />
}

function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-base ${className}`}>{children}</div>
}

/** A button that keeps the caret in the text while it is pressed */
function ToolButton(props: {
  icon: PlainIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  bigIcon?: boolean
  iconClassName?: string
}) {
  return (
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
  )
}

/** A button with its name beside the icon, that keeps the caret in the text while it is pressed */
function TextButton(props: {
  icon?: PlainIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  filled?: boolean
  big?: boolean
}) {
  return (
    <Button
      icon={props.icon}
      size="sm"
      plain
      filled={props.filled}
      variant={props.active ? 'selected' : 'ghost'}
      aria-pressed={props.active}
      disabled={props.disabled}
      title={props.title}
      // The icon close to the text, the text of a field for all of them; a plain one has the bar's icon size (1.25rem), the big one (Section) a smaller icon (`!` wins over the bar's)
      className={`[--btn-icon-gap:0.25rem]! font-normal! [--btn-font-size:1rem]! [--btn-text:var(--fg)]! [--btn-hover-text:var(--fg)]! ${
        props.big ? '[--btn-icon-size:1rem]!' : '[--btn-icon-size:1.25rem]!'
      }`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
    >
      {props.label}
    </Button>
  )
}

/** The font, as the map's text sidebar has it: each name in its own font */
function FontSelect({ editor, font }: { editor: Editor; font: string }) {
  const known = font === '' || FONTS.some((f) => f.stack === font)
  const options = [
    { value: '', label: 'Default font' },
    ...(known ? [] : [{ value: font, label: font }]),
    ...FONTS.map((f) => ({ value: f.stack, label: f.name, style: { fontFamily: f.stack } })),
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
      options={COMMON_SIZES.map((z) => ({ value: String(z.size), label: String(z.size), hint: z.name }))}
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
        ...WEIGHTS.map((w) => ({ value: w.value, label: w.label, hint: w.value, checked: w.value === current, style: { fontWeight: Number(w.value) } })),
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
        ...SLANTS.map((z) => ({ value: z.value, label: z.label, checked: z.value === current, style: { fontStyle: z.value } })),
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

/** The values the paragraph dropdowns offer: padding and letter gap in px, row gap as a multiple of the text size, border width in px (0: none) */
const PADDINGS = [0, 2, 4, 8, 12, 16, 24, 32, 48]
const LETTER_GAPS = [-1, 0, 0.5, 1, 2, 3, 5, 10]
const ROW_GAPS = [1, 1.2, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3]
const BORDER_WIDTHS = [0, 1, 2, 3, 4, 6, 8]
const BORDER_COLOURS = [
  { label: 'Gray', value: '#9ca3af' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
]
const BORDER_LOOK = /^(\d+)px solid (.+)$/
/** What a paragraph has when it says nothing about its row gap */
const NORMAL_ROW_GAP = 1.5

/** What a paragraph dropdown shows: its icon (as Word's paragraph dialogs have them) with the value small at its lower right, so the button stays narrow */
function Shown({ icon: Icon, children }: { icon: PlainIcon; children: ReactNode }) {
  return (
    <span className="relative flex">
      <Icon className="size-5 shrink-0" />
      <span className="absolute -end-1 -bottom-1 text-[0.625rem] leading-none font-medium tabular-nums">{children}</span>
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
  const borderColour = border?.[2] ?? BORDER_COLOURS[0].value
  const setBorder = (width: number, colour: string) => setParagraphLook(editor, 'border', width > 0 ? `${width}px solid ${colour}` : null)
  const field = { width: 'w-auto', bordered: false } as const
  return (
    <>
      <DropdownField
        {...field}
        label="Padding"
        display={<Shown icon={LuSquareDashed}>{padding}</Shown>}
        options={PADDINGS.map((n) => ({ value: String(n), label: n ? `${n}px` : 'None', checked: n === padding }))}
        onChange={(n) => setParagraphLook(editor, 'padding', Number(n) ? `${n}px` : null)}
      />
      <DropdownField
        {...field}
        label="Letter gap"
        display={<Shown icon={LuMoveHorizontal}>{letterGap}</Shown>}
        options={LETTER_GAPS.map((n) => ({ value: String(n), label: `${n}px`, checked: n === letterGap }))}
        onChange={(n) => setParagraphLook(editor, 'letterSpacing', Number(n) ? `${Number(n).toFixed(1)}px` : null)}
      />
      <DropdownField
        {...field}
        label="Row gap"
        display={<Shown icon={LuAlignVerticalSpaceBetween}>{rowGap}</Shown>}
        options={ROW_GAPS.map((n) => ({ value: String(n), label: String(n), hint: n === NORMAL_ROW_GAP ? 'Normal' : undefined, checked: n === rowGap }))}
        onChange={(n) => setParagraphLook(editor, 'lineHeight', Number(n) === NORMAL_ROW_GAP ? null : Number(n).toFixed(1))}
      />
      <DropdownField
        {...field}
        label="Border"
        display={<Shown icon={LuFrame}>{borderWidth || '–'}</Shown>}
        options={[
          { value: 'heading:width', label: 'Width', heading: true },
          ...BORDER_WIDTHS.map((n) => ({ value: `width:${n}`, label: n ? `${n}px` : 'None', checked: n === borderWidth })),
          { value: 'heading:colour', label: 'Colour', heading: true },
          ...BORDER_COLOURS.map((c) => ({ value: `colour:${c.value}`, label: c.label, swatch: c.value, squares: true, checked: c.value === borderColour })),
        ]}
        // A colour picked on a paragraph with no border gives it a 1px one, so the pick shows
        onChange={(v) => (v.startsWith('width:') ? setBorder(Number(v.slice(6)), borderColour) : setBorder(Math.max(borderWidth, 1), v.slice(7)))}
      />
    </>
  )
}

/** How an underline can be drawn, and the colours it can have ('' is the text's own colour) */
const UNDERLINE_KINDS = ['solid', 'double', 'dotted', 'dashed', 'wavy']
const UNDERLINE_COLOURS = [
  { label: 'Same as the text', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'White', value: '#ffffff' },
]

/** Underline: the button that underlines, and the arrow of a dropdown of its kind and colour, in one field like the font size's */
function UnderlineControl({ editor, on, kind, colour }: { editor: Editor; on: boolean; kind: string; colour: string }) {
  const options = [
    { value: 'heading:kind', label: 'Kind', heading: true },
    // Each kind's name is underlined that way
    ...UNDERLINE_KINDS.map((k) => ({
      value: `kind:${k}`,
      label: k[0].toUpperCase() + k.slice(1),
      checked: kind === k,
      style: { textDecorationLine: 'underline', textDecorationStyle: k as 'solid', textDecorationThickness: '2px', textUnderlineOffset: '4px' },
    })),
    { value: 'heading:colour', label: 'Colour', heading: true },
    ...UNDERLINE_COLOURS.map((c) => ({ value: `colour:${c.value}`, label: c.label, swatch: c.value, squares: true, checked: colour === c.value })),
  ]
  // A pick sets that part of the underline (and underlines the selection if it is not yet), keeping the other: solid and the text's colour are left unwritten
  const pick = (value: string) => {
    const [part, picked] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)]
    const next = { textDecorationColor: colour || null, textDecorationStyle: kind === 'solid' ? null : kind }
    if (part === 'kind') next.textDecorationStyle = picked === 'solid' ? null : picked
    else next.textDecorationColor = picked || null
    editor.chain().focus().setMark('underline', next).run()
  }
  // Any colour: the picker the colour buttons have, at the end of the list
  const setColour = (hex: string, final: boolean) => {
    const chain = final ? editor.chain().focus() : editor.chain()
    chain.setMark('underline', { textDecorationColor: hex, textDecorationStyle: kind === 'solid' ? null : kind }).run()
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
        icon={LuUnderline}
        label="Underline"
        size="sm"
        variant={on ? 'selected' : 'ghost'}
        aria-pressed={on}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="ui-dropfield-icon [&>svg]:size-5!"
      />
    </DropdownField>
  )
}

/**
 * The article's toolbar, a row of buttons that drive its editor (`editor`, from the text field's onEditor): undo / redo,
 * the text (font and size, as the map's text sidebar has them, bold, italic, underline with a dropdown of its kind and colour, the text colour as a coloured A and the background colour), lists, the alignments one next to the other,
 * next to the alignments with no space: Media (an image icon and its name; it opens the image, table and divider choice) and Link (a link icon and its name) together, with no gap and a line before them.
 */
export default function ArticleToolbar({ editor, onUploadImage, onUploadError }: Props) {
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
  // Whether the second row shows
  const [secondRow, setSecondRow] = useState(true)
  const [linking, setLinking] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [href, setHref] = useState('')
  const picker = useRef<HTMLInputElement>(null)

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

  return (
    <div
      role="toolbar"
      aria-label="Article formatting"
      // Every icon one size, 1.25rem: the buttons' own (a button sets its size from its text) and the colour fields'
      className="relative flex flex-col gap-base rounded-(--card-radius) border border-line bg-surface p-base shadow-sm [--btn-icon-size:1.25rem] [&_button]:[--btn-icon-size:1.25rem]"
    >
      {/* Floats on the bar's right edge, its centre on it, level with the first row: it shows and hides the second row */}
      <div className="absolute end-0 top-5 z-20 translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface shadow-md">
        <ToolButton
          icon={LuEllipsis}
          label={secondRow ? 'Hide the second row' : 'Show the second row'}
          active={secondRow}
          bigIcon
          onClick={() => setSecondRow((shown) => !shown)}
        />
      </div>
      {/* The first row never wraps (Media and Link stay in it): when it is too wide for the bar it scrolls sideways */}
      <div className="flex flex-nowrap items-center gap-base overflow-x-auto">
        <Group>
          <ToolButton icon={LuUndo2} label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
          <ToolButton icon={LuRedo2} label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
        </Group>
        <Separator />
        <Group>
          <FontSelect editor={editor} font={state.font} />
          <SizeControl editor={editor} size={parseFloat(state.size) || NORMAL_SIZE} />
          <BoldControl editor={editor} bold={state.bold} weight={state.weight} />
          <ItalicControl editor={editor} italic={state.italic} slant={state.slant} />
          <UnderlineControl editor={editor} on={state.underline} kind={state.underlineKind} colour={state.underlineColour} />
          <Separator />
          <ColourField
            label="Text colour"
            letter="A"
            value={state.colour}
            onLive={(hex) => editor.chain().setColor(hex).run()}
            onCommit={(hex) => editor.chain().focus().setColor(hex).run()}
          />
          <ColourField
            label="Background colour"
            icon={LuHighlighter}
            value={state.background}
            onLive={(hex) => editor.chain().setBackgroundColor(hex).run()}
            onCommit={(hex) => editor.chain().focus().setBackgroundColor(hex).run()}
          />
        </Group>
        <Separator />
        <Group>
          <Dropdown
            label="List"
            triggerIcon={LISTS.find((l) => l.value === state.list)?.icon ?? LuList}
            className="[&>svg]:size-5!"
            value={state.list}
            options={LISTS}
            onChange={(list) => {
              if (list !== 'none') TOGGLE_LIST[list](editor)
              else if (state.list !== 'none') TOGGLE_LIST[state.list](editor)
            }}
          />
          {/* The alignments one next to the other, the current one pressed */}
          {ALIGNS.map((a) => (
            <ToolButton
              key={a.value}
              icon={a.icon}
              label={a.label}
              active={state.align === a.value}
              onClick={() => editor.chain().focus().setTextAlign(a.value).run()}
            />
          ))}
        </Group>
        {/* Next to the alignments with no space: the row's gap is taken back */}
        <div className="-ms-base flex items-center">
          <Separator />
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
      </div>
      {/* The second row: Code (its name, like Section's) at the left, the paragraph's dropdowns, then at the right Section (a + and the letters of the font field), a box of the most common strange characters with the Ω button at its end (its popout: the power up and the index below, and many more characters, in sections) (the floating ⋯ on the bar's right edge shows and hides it) */}
      {secondRow && (
        <div className="flex flex-wrap items-center gap-base">
          {/* Code, with its name like Section's, at the left */}
          <TextButton icon={LuCode} label="Code" big active={state.code} onClick={() => editor.chain().focus().toggleCode().run()} />
          <Separator />
          <Group>
            <ParagraphLook editor={editor} look={state.look} />
          </Group>
          {/* Section, and the strange characters at the right end of the row: the most common ones in a box with a border, the Ω button at its end opens all of them */}
          <Group className="ms-auto">
            <Separator />
            <TextButton icon={LuPlus} label="Section" big onClick={() => addSection(editor)} />
            <div role="group" aria-label="Common characters" className="flex flex-wrap items-center rounded-(--field-radius) border border-line-strong">
              <SymbolRow editor={editor} symbols={COMMON_SYMBOLS} />
              <BarPopover
                label="Strange characters, power up and index below"
                open={more}
                align="end"
                wide
                onOpenChange={setMore}
                trigger={<ToolButton icon={LuOmega} label="More characters, power up and index below" active={more} onClick={() => setMore((open) => !open)} />}
              >
                <MoreFormats editor={editor} />
              </BarPopover>
            </div>
          </Group>
        </div>
      )}
    </div>
  )
}
