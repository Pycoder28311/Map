import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import Button from '../../components/ui/buttons/Button'
import RichTextToolbar from '../../components/ui/editors/RichTextToolbar'
import RichTextField from '../../components/ui/fields/RichTextField'
import PixelSprite from '../../components/ui/pixelart/PixelSprite'
import { useResourceActions } from '../../lib/resource/hooks'
import { resourcesWith } from '../../resources/registry'
import { isFirstLine } from './editorKeys'

// Full class strings so Tailwind can detect them at build time.
const ANIMATE = 'duration-200 ease-out motion-reduce:transition-none'
// A row that grows from nothing (the title on top, the footer below): its grid row goes 0fr → 1fr
const GROW = `grid transition-[grid-template-rows,opacity] ${ANIMATE}`
// Starts once the bottom part has grown (its duration, in ANIMATE)
const AFTER_GROW = 'delay-200'
// What the input makes: the resource with the quickCreate surface (the notes)
const QUICK = resourcesWith('quickCreate')[0]
const FIELD = 'w-full resize-none bg-transparent px-4 text-fg outline-none placeholder:text-fg-subtle'

/**
 * The wide "Take a note…" input (Dashboard). Clicked, it comes in front with a subtle shadow and a
 * title field grows on top of it, in the same white card, under a thin gray line. The text stays
 * exactly where it was: the card grows upward (title) and downward (Create) over the page, which
 * keeps the folded card's place, so nothing around it moves. ArrowUp on the
 * text's first line moves to the title; the title grows to heading size while focused or filled.
 * Opening, Create slides in at the bottom right, with the format buttons on the left. Create (or Ctrl/⌘+Enter) makes the note
 * on the server (and says so if it could not); a click outside or Esc folds the card back, keeping the draft.
 */
export default function QuickCreate() {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const titleBoxRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  // The text is HTML ('' when it has no words); `drafts` starts a fresh editor after Create
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState(0)
  const [editor, setEditor] = useState<Editor | null>(null)
  const { create: createNote } = useResourceActions(QUICK)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleFocused, setTitleFocused] = useState(false)
  // The folded card's height (the place it keeps in the page) and the title's (how far the card moves up)
  const [size, setSize] = useState({ folded: 0, title: 0 })

  const canCreate = title.trim() !== '' || text !== ''
  const bigTitle = titleFocused || title !== ''

  // Open: a press anywhere outside folds it back (the dropdown's menu is inside it in the DOM)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Measured once: both are fixed (folded, the text shows one line; the title's height never changes)
  useLayoutEffect(() => {
    setSize({
      folded: cardRef.current?.offsetHeight ?? 0,
      title: titleBoxRef.current?.scrollHeight ?? 0,
    })
  }, [])

  const fold = () => {
    setOpen(false)
    const active = document.activeElement
    if (active instanceof HTMLElement && rootRef.current?.contains(active)) active.blur()
  }

  const create = async () => {
    if (!canCreate || busy) return
    setBusy(true)
    setError(null)
    try {
      await createNote({ title: title.trim(), content: text })
      setTitle('')
      setText('')
      setDrafts((n) => n + 1)
      fold()
    } catch (e) {
      // The draft stays, so nothing typed is lost
      setError(e instanceof Error ? e.message : 'Could not create the note.')
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void create()
    } else if (e.key === 'Escape' && !rootRef.current?.querySelector(':popover-open, [aria-haspopup="menu"][aria-expanded="true"]')) {
      // (Esc in an open menu only closes the menu)
      fold()
    }
  }

  const onEditor = useCallback((next: Editor | null) => {
    editorRef.current = next
    setEditor(next)
  }, [])

  // ArrowUp on the text's first line: to the title, caret at its end
  const onTextKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' || e.shiftKey || !isFirstLine(editorRef.current)) return
    e.preventDefault()
    const input = titleRef.current
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }

  // ArrowDown or Enter in the title: to the text, caret at its start
  const onTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key !== 'ArrowDown' && e.key !== 'Enter') || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    editorRef.current?.commands.focus('start')
  }

  return (
    // Keeps the folded card's place in the page; the open card lies over what's around it
    <div ref={rootRef} style={{ height: size.folded || undefined }} className={`relative ${open ? 'z-30' : ''}`}>
      <div
        ref={cardRef}
        // Only a field opens it (the text or the title): the Note / Article button, and its menu, don't
        onFocus={(e) => {
          if (e.target instanceof HTMLInputElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) setOpen(true)
        }}
        // Tabbing out folds it too
        onBlur={(e) => {
          if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
        }}
        onKeyDown={onKeyDown}
        // Open: moved up by the title's height while the title grows (same timing), so the text stays put
        style={open ? { boxShadow: 'var(--lift-shadow)', transform: `translateY(${-size.title}px)` } : undefined}
        // overflow-hidden: Create slides in from beyond the right edge
      className={`absolute inset-x-0 top-0 flex flex-col rounded-(--card-radius) border border-line bg-surface transition-[box-shadow,transform] ${ANIMATE} ${
        // Open: clips Create sliding in from the right. Folded: nothing
        open ? 'overflow-hidden' : ''
      }`}
      >
        {/* The title, growing on top; out of the tab order while folded */}
        <div className={`${GROW} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0'}`} inert={!open}>
          <div ref={titleBoxRef} className="min-h-0 overflow-hidden">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              onKeyDown={onTitleKeyDown}
              placeholder="Title"
              aria-label="Title"
              className={`${FIELD} h-12 transition-[font-size,line-height] ${ANIMATE} ${bigTitle ? 'text-heading font-semibold' : 'text-body'}`}
            />
            {/* The gray line between title and text */}
            <div aria-hidden className="mx-4 h-px bg-line" />
          </div>
        </div>

        {/* A faint pixel-art papyrus floating in the card's background, at its right. Opening, it
            unrolls downward: the ribbon comes off, and the sheet with its bottom roll drops out from under the
            top roll. It keeps the text row's place while the card grows upward (same timing as the card's move) */}
        <div
          aria-hidden
          style={{ top: open ? 8 + size.title : 8 }}
          className={`pointer-events-none absolute end-6 h-[78px] w-[54px] opacity-25 transition-[top] ${ANIMATE}`}
        >
          <div className="size-full motion-reduce:animate-none animate-float">
            {/* The sheet and the bottom roll: out of sight above while rolled, clipped by this box */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className={`absolute end-0 top-3.5 transition-transform duration-700 ease-out motion-reduce:transition-none ${open ? '' : '-translate-y-full'}`}
              >
                <PixelSprite name="scrollDrop" scale={2} />
              </div>
            </div>
            {/* The roll on top: tied while folded, untied once open */}
            <div className={`absolute end-0 top-0 transition-opacity duration-200 motion-reduce:transition-none ${open ? 'opacity-0' : ''}`}>
              <PixelSprite name="scroll" scale={2} />
            </div>
            <div className={`absolute end-0 top-0 transition-opacity duration-200 motion-reduce:transition-none ${open ? '' : 'opacity-0'}`}>
              <PixelSprite name="scrollRoll" scale={2} />
            </div>
          </div>
        </div>

        {/* Folded, the text shows its first line only ; open, it grows with its lines */}
        <div className={`${FIELD} py-3 text-body`}>
          <div className={`min-h-[1lh] ${open ? 'max-h-[50vh] overflow-y-auto' : 'max-h-[1lh] overflow-hidden'}`}>
            <RichTextField
              key={drafts}
              value={text}
              onChange={setText}
              onEditor={onEditor}
              onKeyDown={onTextKeyDown}
              placeholder="Take a note…"
              label="Text"
              minHeight="min-h-0"
            />
          </div>
        </div>

        {open && error && (
          <p role="alert" className="px-4 pb-1 text-small text-danger">
            {error}
          </p>
        )}

        {/* The bottom part, growing below (Create lies over it) */}
        <div className={`${GROW} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="h-11" />
          </div>
        </div>

        {/* The format buttons, at the bottom left of the open card */}
        <div inert={!open} className={`absolute bottom-1 left-2 transition-opacity ${ANIMATE} ${open ? `opacity-100 ${AFTER_GROW}` : 'opacity-0'}`}>
          <RichTextToolbar editor={editor} only={['bold', 'italic', 'size']} />
        </div>

        <div
          inert={!open}
          className={`absolute right-1 bottom-1 ${
            open ? `translate-x-0 opacity-100 transition-[translate,opacity] ${ANIMATE} ${AFTER_GROW}` : 'translate-x-[calc(100%+1rem)] opacity-0'
          }`}
        >
          <Button onClick={() => void create()} disabled={!canCreate || busy} title="Create (Ctrl+Enter)">
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
