import { useEditorState, type Editor } from '@tiptap/react'
import { LuBold, LuImage, LuItalic, LuList, LuListOrdered, LuStrikethrough, LuUnderline } from 'react-icons/lu'
import IconButton from '../buttons/IconButton'
import type { PlainIcon } from '../icons/IconSlot'

type Format = { label: string; icon: PlainIcon; mark: string; run: (editor: Editor) => void }

const FORMATS: Format[] = [
  { label: 'Bold', icon: LuBold, mark: 'bold', run: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Italic', icon: LuItalic, mark: 'italic', run: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Underline', icon: LuUnderline, mark: 'underline', run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: 'Strikethrough', icon: LuStrikethrough, mark: 'strike', run: (e) => e.chain().focus().toggleStrike().run() },
  { label: 'Bulleted list', icon: LuList, mark: 'bulletList', run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered list', icon: LuListOrdered, mark: 'orderedList', run: (e) => e.chain().focus().toggleOrderedList().run() },
]

/** The sizes offered (px); '' is the editor's own size */
const SIZES = [
  { label: 'Small', value: '13px' },
  { label: 'Normal', value: '' },
  { label: 'Large', value: '20px' },
  { label: 'Huge', value: '28px' },
]

type Props = {
  editor: Editor | null
  /** Which formats to offer, by `mark` name, and 'size' for the size menu (default: all) */
  only?: string[]
  /** Given, an image button is added at the end (it asks the caller to pick and upload a picture) */
  onImage?: () => void
  className?: string
}

/** Format buttons for a RichTextEditor (give it the editor from `onEditor`): the ticked ones show what the caret is in */
export default function RichTextToolbar({ editor, only, onImage, className = '' }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: FORMATS.filter((f) => e?.isActive(f.mark)).map((f) => f.mark),
      size: (e?.getAttributes('textStyle').fontSize as string | undefined) ?? '',
    }),
  })
  if (!editor) return null
  const active = state?.active
  const offers = (name: string) => !only || only.includes(name)
  return (
    <div role="toolbar" aria-label="Formatting" className={`flex items-center gap-0.5 ${className}`}>
      {FORMATS.filter((f) => offers(f.mark)).map((f) => (
        <IconButton
          key={f.mark}
          icon={f.icon}
          label={f.label}
          variant={active?.includes(f.mark) ? 'selected' : 'ghost'}
          aria-pressed={active?.includes(f.mark)}
          // Keeps the caret in the text while a button is pressed
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => f.run(editor)}
        />
      ))}
      {onImage && <IconButton icon={LuImage} label="Insert image" onMouseDown={(e) => e.preventDefault()} onClick={onImage} />}
      {offers('size') && (
        <select
          aria-label="Text size"
          title="Text size"
          value={SIZES.some((z) => z.value === state?.size) ? state?.size : ''}
          onChange={(e) => {
            const chain = editor.chain().focus()
            if (e.target.value) chain.setFontSize(e.target.value).run()
            else chain.unsetFontSize().run()
          }}
          className="h-8 cursor-pointer rounded-(--btn-radius) bg-transparent px-1.5 text-small text-fg hover-fill focus-visible:outline-2 focus-visible:outline-accent"
        >
          {SIZES.map((z) => (
            <option key={z.label} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
