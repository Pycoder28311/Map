import { useEditorState, type Editor } from '@tiptap/react'
import { useRef, useState, type ReactNode } from 'react'
import {
  LuALargeSmall,
  LuAlignCenter,
  LuAlignJustify,
  LuAlignLeft,
  LuAlignRight,
  LuBaseline,
  LuBold,
  LuEllipsis,
  LuHeading,
  LuHighlighter,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListChecks,
  LuListOrdered,
  LuMinus,
  LuOmega,
  LuPilcrow,
  LuPlus,
  LuRedo2,
  LuSigma,
  LuStickyNote,
  LuTable,
  LuType,
  LuUnderline,
  LuUndo2,
} from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import { addSection } from '../../components/ui/editors/articleExtensions'
import { SIZES } from '../../components/ui/editors/RichTextToolbar'
import ColourField from '../../components/ui/fields/ColourField'
import TextField from '../../components/ui/fields/TextField'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import BarPopover from '../../components/ui/overlays/BarPopover'
import Dropdown from '../../components/ui/overlays/Dropdown'
import { FONTS } from '../board/fonts'
import MoreFormats from './MoreFormats'

/** The colours a picker starts on when the text has none of its own */
const TEXT_COLOUR = '#e5e5e5'
const BACKGROUND_COLOUR = '#fde047'

const FONT_OPTIONS = [{ value: '', label: 'Default font' }, ...FONTS.map((f) => ({ value: f.stack, label: f.name }))]
const SIZE_OPTIONS = SIZES.map((z) => ({ value: z.value, label: z.label }))

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

/** The marks shown as pressed buttons */
const MARKS = [
  { mark: 'bold', label: 'Bold', icon: LuBold, run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { mark: 'underline', label: 'Underline', icon: LuUnderline, run: (e: Editor) => e.chain().focus().toggleUnderline().run() },
  { mark: 'italic', label: 'Italic', icon: LuItalic, run: (e: Editor) => e.chain().focus().toggleItalic().run() },
]

type Props = {
  editor: Editor | null
  /** Stores a picture and answers its address (Insert ▸ Image) */
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
}

/** A thin line between two groups of buttons */
function Separator() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-(--divider-line)" />
}

function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-0.5 ${className}`}>{children}</div>
}

/** A button that keeps the caret in the text while it is pressed */
function ToolButton(props: { icon: PlainIcon; label: string; onClick?: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <IconButton
      icon={props.icon}
      label={props.label}
      size="sm"
      variant={props.active ? 'selected' : 'ghost'}
      aria-pressed={props.active}
      disabled={props.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
    />
  )
}

/**
 * The article's toolbar, two rows of icon buttons that drive its editor (`editor`, from the text field's onEditor). Row one: undo / redo,
 * the text (font, size, bold, underline, italic, the colours), lists and alignment, More (MoreFormats), and at the end Symbols and Equation.
 * Row two: Add text from a note, Add section, Link and Insert. Symbols, Equation and Add text from a note are not made yet (disabled).
 */
export default function ArticleToolbar({ editor, onUploadImage, onUploadError }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const style = e.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string; color?: string; backgroundColor?: string }
      return {
        marks: MARKS.filter((m) => e.isActive(m.mark)).map((m) => m.mark),
        font: style.fontFamily ?? '',
        size: style.fontSize ?? '',
        colour: style.color ?? TEXT_COLOUR,
        background: style.backgroundColor ?? BACKGROUND_COLOUR,
        underlineColour: (e.getAttributes('underline').textDecorationColor as string | undefined) ?? TEXT_COLOUR,
        list: (LISTS.find((l) => l.value !== 'none' && e.isActive(l.value))?.value ?? 'none') as ListKind,
        align: ((ALIGNS.find((a) => e.isActive({ textAlign: a.value }))?.value ?? 'left') as Align),
        link: e.isActive('link'),
        href: (e.getAttributes('link').href as string | undefined) ?? '',
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      }
    },
  })
  const [more, setMore] = useState(false)
  const [linking, setLinking] = useState(false)
  const [href, setHref] = useState('')
  const picker = useRef<HTMLInputElement>(null)

  if (!editor || !state) return null

  const insertImages = async (files: File[]) => {
    for (const file of files) {
      try {
        const src = await onUploadImage(file)
        editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') }).run()
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
    <div role="toolbar" aria-label="Article formatting" className="relative flex flex-col gap-1 rounded-(--card-radius) border border-line bg-surface p-1.5 shadow-sm">
      <div className="flex flex-wrap items-center">
        <Group>
          <ToolButton icon={LuUndo2} label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
          <ToolButton icon={LuRedo2} label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
        </Group>
        <Separator />
        <Group>
          <Dropdown
            label="Font"
            triggerIcon={LuType}
            value={state.font}
            options={FONT_OPTIONS.some((f) => f.value === state.font) ? FONT_OPTIONS : [...FONT_OPTIONS, { value: state.font, label: state.font }]}
            onChange={(font) => (font ? editor.chain().focus().setFontFamily(font).run() : editor.chain().focus().unsetFontFamily().run())}
          />
          <Dropdown
            label="Text size"
            triggerIcon={LuALargeSmall}
            value={SIZE_OPTIONS.some((z) => z.value === state.size) ? state.size : ''}
            options={SIZE_OPTIONS}
            onChange={(size) => (size ? editor.chain().focus().setFontSize(size).run() : editor.chain().focus().unsetFontSize().run())}
          />
          {MARKS.map((m) => (
            <ToolButton key={m.mark} icon={m.icon} label={m.label} active={state.marks.includes(m.mark)} onClick={() => m.run(editor)} />
          ))}
          <ColourField
            label="Text colour"
            icon={LuBaseline}
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
          <ColourField
            label="Underline colour"
            icon={LuUnderline}
            value={state.underlineColour}
            onLive={(hex) => editor.chain().setMark('underline', { textDecorationColor: hex }).run()}
            onCommit={(hex) => editor.chain().focus().setMark('underline', { textDecorationColor: hex }).run()}
          />
        </Group>
        <Separator />
        <Group>
          <Dropdown
            label="List"
            triggerIcon={LISTS.find((l) => l.value === state.list)?.icon ?? LuList}
            value={state.list}
            options={LISTS}
            onChange={(list) => {
              if (list !== 'none') TOGGLE_LIST[list](editor)
              else if (state.list !== 'none') TOGGLE_LIST[state.list](editor)
            }}
          />
          <Dropdown
            label="Text align"
            triggerIcon={ALIGNS.find((a) => a.value === state.align)?.icon ?? LuAlignLeft}
            value={state.align}
            options={ALIGNS}
            onChange={(align) => editor.chain().focus().setTextAlign(align).run()}
          />
        </Group>
        <Separator />
        <BarPopover
          label="More formats"
          open={more}
          onOpenChange={setMore}
          trigger={<ToolButton icon={LuEllipsis} label="More formats" active={more} onClick={() => setMore((open) => !open)} />}
        >
          <MoreFormats editor={editor} />
        </BarPopover>
        <Group className="ms-auto">
          <Separator />
          <ToolButton icon={LuOmega} label="Symbols (soon)" disabled />
          <ToolButton icon={LuSigma} label="Equation (soon)" disabled />
        </Group>
      </div>
      <div className="flex flex-wrap items-center border-t border-line pt-1">
        <ToolButton icon={LuStickyNote} label="Add text from a note (soon)" disabled />
        <Separator />
        <ToolButton icon={LuHeading} label="Add section" onClick={() => addSection(editor)} />
        <Separator />
        <BarPopover
          label="Link"
          open={linking}
          onOpenChange={setLinking}
          trigger={
            <ToolButton
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
        <Separator />
        <Dropdown label="Insert" triggerIcon={LuPlus} value={'' as Insert} options={INSERTS} onChange={insert} />
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
  )
}
