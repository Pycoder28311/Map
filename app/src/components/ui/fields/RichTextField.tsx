import { RICH_TEXT_MAX } from '@map/shared/rich-text-policy'
import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import type { Editor, Extensions } from '@tiptap/react'
import { cleanHtml, toHtml } from '../../../features/notes/noteHtml'
import RichTextEditor from '../editors/RichTextEditor'
import RichTextToolbar from '../editors/RichTextToolbar'

type Props = {
  /** The text the field starts with: HTML, or plain text (older notes). Not followed afterwards: the field owns the text while it is open */
  value?: string
  /** Called on every change with the HTML ('' when there are no words) */
  onChange?: (html: string) => void
  placeholder?: string
  /** Screen-reader name */
  label: string
  /** Format buttons above the text (default: none) */
  toolbar?: boolean
  /** Leave out headings, quotes, lists and code */
  plain?: boolean
  /** More than the editor's base set (e.g. the article's formats: editors/articleExtensions.ts). Read once, when the field opens */
  extensions?: Extensions
  autoFocus?: boolean
  /** false: shows the text and nothing can be typed */
  editable?: boolean
  /** The most HTML (characters) the field takes; a change past it is undone. Default: what the server accepts */
  maxLength?: number
  /** Height the text area starts with, as a Tailwind class (default: min-h-32) */
  minHeight?: string
  onBlur?: (event: FocusEvent) => void
  /**
   * Stores one picture and answers with its address. Given, the field takes pictures: an image button in the toolbar, and
   * pasted or dropped image files; each is uploaded and put in the text as an <img>. Left out: no pictures can be added.
   */
  onUploadImage?: (file: File) => Promise<string>
  /** An upload failed (nothing was put in the text) */
  onUploadError?: (error: unknown) => void
  /** Called with the editor once it exists, and with null when it goes: for a toolbar placed elsewhere (RichTextToolbar), or to move the caret */
  onEditor?: (editor: Editor | null) => void
  /** Keys pressed in the text (they bubble up from the editor) */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  /** Classes of the whole field */
  className?: string
}

/** The shape of the text inside: the editor's own element is borderless; headings and lists get their look here */
const TEXT =
  'text-body [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit] [&_p]:min-h-[1lh] [&_h1]:text-title [&_h2]:text-heading [&_h3]:text-heading ' +
  '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-5 [&_ol]:ps-5 [&_blockquote]:border-s-2 [&_blockquote]:border-line [&_blockquote]:ps-3 ' +
  '[&_a]:underline [&_a]:text-accent ' +
  // An underline 2px thick, a little below the letters: its double and wavy kinds can be told from a plain one (the same look as the article toolbar's list of kinds)
  '[&_u]:[text-decoration-thickness:2px] [&_u]:[text-underline-offset:4px] ' +
  '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:border-line [&_th]:border-line [&_td]:p-1.5 [&_th]:p-1.5 [&_th]:bg-fill [&_th]:text-start'

/**
 * A text field that keeps HTML (the app's text-with-formatting field, e.g. a note's text): the shared RichTextEditor in a
 * borderless, theme-looking box, with an optional toolbar. Same use as a textarea: a start `value`, `onChange`, `placeholder`.
 * Safe by default, nothing to set: what it shows is the editor's own parsing of the HTML (tags and attributes it doesn't know are
 * dropped), links are limited to http, https and mailto, and the text is capped at what the server accepts. The server cleans it again on save.
 */
export default function RichTextField({
  value,
  onChange,
  placeholder,
  label,
  toolbar = false,
  plain = false,
  extensions,
  autoFocus = false,
  editable = true,
  maxLength = RICH_TEXT_MAX,
  minHeight = 'min-h-32',
  onBlur,
  onUploadImage,
  onUploadError,
  onEditor,
  onKeyDown,
  className = '',
}: Props) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const track = useCallback(
    (next: Editor | null) => {
      setEditor(next)
      onEditor?.(next)
    },
    [onEditor],
  )
  const picker = useRef<HTMLInputElement>(null)
  const showsToolbar = toolbar && editable && !plain
  const upload = async (files: File[]) => {
    if (!onUploadImage || !editor) return
    for (const file of files) {
      try {
        const src = await onUploadImage(file)
        editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') }).run()
      } catch (error) {
        onUploadError?.(error)
      }
    }
  }
  return (
    // A column only with the toolbar: without it the text is plain blocks, so it can flow around a float beside the field (the article's Info box)
    <div onKeyDown={onKeyDown} className={`${showsToolbar ? 'flex flex-col gap-1' : ''} ${className}`}>
      {showsToolbar && <RichTextToolbar editor={editor} onImage={onUploadImage ? () => picker.current?.click() : undefined} />}
      {onUploadImage && (
        <input
          ref={picker}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            void upload([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      )}
      <RichTextEditor
        content={toHtml(value)}
        placeholder={placeholder}
        label={label}
        plain={plain}
        extensions={extensions}
        autoFocus={autoFocus}
        editable={editable}
        onEditor={track}
        onBlur={onBlur}
        onUpdate={(e) => {
          const html = e.getHTML()
          if (html.length > maxLength) e.commands.undo() // too long for the server: it would reject the save
          else onChange?.(cleanHtml(html))
        }}
        className={`${minHeight} ${TEXT}`}
      />
    </div>
  )
}
