import { isSafeLink } from '@map/shared/rich-text-policy'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, type Editor, type Extensions, type JSONContent } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'

type Props = {
  /** The document the editor starts with: TipTap's JSON or HTML. It is not followed afterwards: the editor owns the text while it is open */
  content: JSONContent | string
  /** Shown, grey, while the document is empty */
  placeholder?: string
  /** Screen-reader name of the text area */
  label?: string
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
  /** Image files pasted or dropped into the text (the editor does nothing with them itself); leave out to ignore them */
  onImageFiles?: (files: File[]) => void
  onUpdate?: (editor: Editor) => void
  className?: string
}

/** Links as the server keeps them (shared/rich-text-policy.ts): http, https, mailto; opened in a new tab without the opener */
const LINKS = {
  isAllowedUri: (url: string) => isSafeLink(url),
  HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
} as const

/** Pictures in the text: only stored ones count (the server drops any other address), never inline data */
const IMAGES = Image.configure({ allowBase64: false, HTMLAttributes: { loading: 'lazy' } })

/** Checklists (the note's HTML keeps them as <ul data-type="taskList">; the server's sanitizer allows exactly that markup) */
const TASKS = [TaskList, TaskItem.configure({ nested: true })]

const PLAIN = { heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, code: false, codeBlock: false, horizontalRule: false, dropcursor: false, gapcursor: false, link: false } as const

/** Hands the image files of a paste or drop on, and tells the editor it was handled (true); other pastes and drops go on as usual */
function takeImages(files: FileList | undefined | null, onImageFiles: ((files: File[]) => void) | undefined, event: Event) {
  const images = [...(files ?? [])].filter((f) => f.type.startsWith('image/'))
  if (!onImageFiles || images.length === 0) return false
  event.preventDefault()
  onImageFiles(images)
  return true
}

/**
 * The rich-text editor the app shares (the map's texts, and later the points' descriptions): TipTap with the marks the map
 * knows. It has no toolbar of its own; whoever uses it drives it through the editor it hands out (`onEditor`).
 */
export default function RichTextEditor({ content, placeholder, label, extensions = [], plain = false, autoFocus = false, editable = true, onEditor, onBlur, onImageFiles, onUpdate, className = '' }: Props) {
  // The placeholder can change while the editor lives (a different kind of note): the extension reads it from here
  const placeholderRef = useRef(placeholder)
  const editor = useEditor({
    extensions: [StarterKit.configure(plain ? PLAIN : { link: LINKS }), ...(plain ? [] : [IMAGES, ...TASKS]), TextStyle, Color, FontSize, ...(placeholder === undefined ? [] : [Placeholder.configure({ placeholder: () => placeholderRef.current ?? '' })]), ...extensions],
    content,
    editable,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: label ? { 'aria-label': label } : {},
      handlePaste: (_view, event) => takeImages(event.clipboardData?.files, onImageFiles, event),
      handleDrop: (_view, event) => takeImages(event.dataTransfer?.files, onImageFiles, event),
    },
    onBlur: ({ event }) => onBlur?.(event),
    onUpdate: ({ editor: e }) => onUpdate?.(e),
  })
  useEffect(() => {
    placeholderRef.current = placeholder
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr) // redraws the placeholder
  }, [editor, placeholder])
  useEffect(() => {
    onEditor?.(editor)
    return () => onEditor?.(null)
  }, [editor, onEditor])
  return <EditorContent editor={editor} className={className} />
}
