import type { Editor } from '@tiptap/react'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { isFirstLine } from '../../../features/notes/editorKeys'
import InputBox from './InputBox'
import RichTextField from './RichTextField'
import RichTextToolbar from '../editors/RichTextToolbar'
import TitleInput, { type TitleSize } from './TitleInput'

/** The text's padding for each size (Tailwind needs the full class strings) */
const TEXT_PAD = { sm: 'px-3 py-2', md: 'px-3 py-2', lg: 'px-4 py-3' } as const

type Props = {
  title: string
  onTitle: (title: string) => void
  /** The text: HTML (rich) or plain text */
  text: string
  onText: (text: string) => void
  /** Rich text (default) or a plain textarea */
  rich?: boolean
  size?: Exclude<TitleSize, 'xl'>
  titlePlaceholder?: string
  textPlaceholder?: string
  /** Screen-reader name of the text */
  textLabel?: string
  /** The format buttons (bold, italic, size) under the text (rich text only) */
  toolbar?: boolean
  /** The text's least height, as a Tailwind class */
  minTextHeight?: string
  /** The cursor starts in the text (default), like the Dashboard's big input */
  autoFocus?: boolean
  /** Open instead of boxed: edge to edge, no border of its own, the background of what it is in (a modal's body). Default: the big input's box */
  flush?: boolean
  /** Classes of the whole field (e.g. `flex-1` to fill a column) */
  className?: string
}

/**
 * The Dashboard's big input as a shared field (its size changes): a title that grows to a heading while the cursor is in it, a thin
 * line, and the text. The cursor starts in the text; ArrowUp on its first line goes up to the title, ArrowDown or Enter in the
 * title down to the text. A click anywhere in it, on its empty part too, puts the cursor at the end of the text. Boxed like the big input, or `flush`.
 */
export default function TitleTextFields({
  title,
  onTitle,
  text,
  onText,
  rich = true,
  size = 'lg',
  titlePlaceholder = 'Title',
  textPlaceholder,
  textLabel = 'Text',
  toolbar = false,
  minTextHeight = 'min-h-20',
  autoFocus = true,
  flush = false,
  className = '',
}: Props) {
  const titleRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const pad = TEXT_PAD[size]

  // Focus the text once it exists (a frame later: a modal places the focus itself when it opens)
  useEffect(() => {
    if (!autoFocus || (rich && !editor)) return
    const frame = requestAnimationFrame(() => (rich ? editor?.commands.focus('start') : areaRef.current?.focus()))
    return () => cancelAnimationFrame(frame)
  }, [autoFocus, rich, editor])

  const toTitle = () => {
    const input = titleRef.current
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }

  const onTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key !== 'ArrowDown' && e.key !== 'Enter') || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    if (rich) editor?.commands.focus('start')
    else {
      areaRef.current?.focus()
      areaRef.current?.setSelectionRange(0, 0)
    }
  }

  // A click on the empty part (under the text, beside the toolbar's end) goes to the text; the title, the toolbar and the text itself keep their own
  const onClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, button, [contenteditable="true"]')) return
    if (rich) editor?.commands.focus('end')
    else {
      const area = areaRef.current
      area?.focus()
      area?.setSelectionRange(area.value.length, area.value.length)
    }
  }

  const Box = flush ? 'div' : InputBox
  return (
    <Box
      {...(flush ? {} : { as: 'div' as const, row: false })}
      onClick={onClick}
      className={`flex min-h-0 cursor-text flex-col ${flush ? '' : 'overflow-hidden'} ${className}`}
    >
      <TitleInput ref={titleRef} size={size} value={title} onChange={(e) => onTitle(e.target.value)} onKeyDown={onTitleKeyDown} placeholder={titlePlaceholder} aria-label="Title" maxLength={200} />
      {/* The gray line between title and text */}
      <div aria-hidden className={`h-px shrink-0 bg-line ${flush ? '' : 'mx-3'}`} />
      {rich ? (
        <>
          <RichTextField
            value={text}
            onChange={onText}
            onEditor={setEditor}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowUp' || e.shiftKey || !isFirstLine(editor)) return
              e.preventDefault()
              toTitle()
            }}
            placeholder={textPlaceholder}
            label={textLabel}
            minHeight={minTextHeight}
            className={`min-h-0 flex-1 overflow-y-auto ${pad}`}
          />
          {toolbar && <RichTextToolbar editor={editor} only={['bold', 'italic', 'size']} className="border-t border-line px-1.5 py-1" />}
        </>
      ) : (
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => {
            const { selectionStart, selectionEnd } = e.currentTarget
            if (e.key === 'ArrowUp' && selectionStart === 0 && selectionEnd === 0) {
              e.preventDefault()
              toTitle()
            }
          }}
          placeholder={textPlaceholder}
          aria-label={textLabel}
          rows={3}
          className={`w-full flex-1 resize-none bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle ${minTextHeight} ${pad}`}
        />
      )}
    </Box>
  )
}
