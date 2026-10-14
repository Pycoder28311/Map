import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, type Editor, type Extensions, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

type Props = {
  /** The document (TipTap's JSON) the editor starts with. It is not followed afterwards: the editor owns the text while it is open */
  content: JSONContent
  /** Added to the base set (bold, italic, underline, strike, colour, font size): what a caller needs more, e.g. lists */
  extensions?: Extensions
  /** Leave out the block formats of StarterKit (headings, lists, quotes, code): for text that is only lines of words */
  plain?: boolean
  autoFocus?: boolean
  /** false: shows the document and nothing can be typed */
  editable?: boolean
  /** Called with the editor once it exists, and with null when it goes (so other controls can drive it) */
  onEditor?: (editor: Editor | null) => void
  onBlur?: (event: FocusEvent) => void
  onUpdate?: (editor: Editor) => void
  className?: string
}

const PLAIN = { heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, code: false, codeBlock: false, horizontalRule: false, dropcursor: false, gapcursor: false, link: false } as const

/**
 * The rich-text editor the app shares (the map's texts, and later the points' descriptions): TipTap with the marks the map
 * knows. It has no toolbar of its own; whoever uses it drives it through the editor it hands out (`onEditor`).
 */
export default function RichTextEditor({ content, extensions = [], plain = false, autoFocus = false, editable = true, onEditor, onBlur, onUpdate, className = '' }: Props) {
  const editor = useEditor({
    extensions: [StarterKit.configure(plain ? PLAIN : {}), TextStyle, Color, FontSize, ...extensions],
    content,
    editable,
    autofocus: autoFocus ? 'end' : false,
    onBlur: ({ event }) => onBlur?.(event),
    onUpdate: ({ editor: e }) => onUpdate?.(e),
  })
  useEffect(() => {
    onEditor?.(editor)
    return () => onEditor?.(null)
  }, [editor, onEditor])
  return <EditorContent editor={editor} className={className} />
}
