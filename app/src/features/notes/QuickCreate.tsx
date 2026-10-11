import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { LuFileText, LuStickyNote } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import Dropdown, { type DropdownOption } from '../../components/ui/overlays/Dropdown'
import { createArticle, createNote } from '../../mocks/projectsStore'

type Kind = 'note' | 'article'

const KINDS: DropdownOption<Kind>[] = [
  { value: 'note', label: 'Note', icon: LuStickyNote },
  { value: 'article', label: 'Article', icon: LuFileText },
]

// The last chosen kind, kept for the session (not across reloads)
let lastKind: Kind = 'note'

// Full class strings so Tailwind can detect them at build time.
const ANIMATE = 'duration-200 ease-out motion-reduce:transition-none'
// A row that grows from nothing (the title on top, the footer below): its grid row goes 0fr → 1fr
const GROW = `grid transition-[grid-template-rows,opacity] ${ANIMATE}`
// Starts once the bottom part has grown (its duration, in ANIMATE)
const AFTER_GROW = 'delay-200'
// The kind button's distance from the card's edges (px): centred in the 44px text row and bottom part
const KIND_INSET = 8
const FIELD = 'w-full resize-none bg-transparent px-4 text-fg outline-none placeholder:text-fg-subtle'

/**
 * The wide "Take a note…" input (Dashboard). Clicked, it comes in front with a subtle shadow and a
 * title field grows on top of it, in the same white card, under a thin gray line. The text stays
 * exactly where it was: the card grows upward (title) and downward (Create) over the page, which
 * keeps the folded card's place, so nothing around it moves. ArrowUp on the
 * text's first line moves to the title; the title grows to heading size while focused or filled.
 * The dropdown on the right chooses Note or Article; opening, it moves down to the bottom part and
 * Create slides in on its right. Create (or Ctrl/⌘+Enter) adds it at the sidebar's top level. A click outside or Esc folds it back, keeping the draft.
 */
export default function QuickCreate() {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLDivElement>(null)
  const titleBoxRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [kind, setKind] = useState<Kind>(lastKind)
  const [titleFocused, setTitleFocused] = useState(false)
  // The folded card's height (the place it keeps in the page), the title's (how far the card moves
  // up) and Create's width (how far it pushes the kind button)
  const [size, setSize] = useState({ folded: 0, title: 0, create: 0 })

  const canCreate = title.trim() !== '' || text.trim() !== ''
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
      create: createRef.current?.offsetWidth ?? 0,
    })
  }, [])

  // The text grows with its lines while open; folded, it shows its first line only
  useLayoutEffect(() => {
    const area = textRef.current
    if (!area) return
    area.style.height = ''
    if (open) area.style.height = `${area.scrollHeight}px`
  }, [text, open])

  const fold = () => {
    setOpen(false)
    const active = document.activeElement
    if (active instanceof HTMLElement && rootRef.current?.contains(active)) active.blur()
  }

  const create = () => {
    if (!canCreate) return
    const name = title.trim() || 'Untitled'
    const body = text.trim() || undefined
    if (kind === 'article') createArticle(name, body)
    else createNote(name, body)
    setTitle('')
    setText('')
    fold()
  }

  const chooseKind = (next: Kind) => {
    lastKind = next
    setKind(next)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      create()
    } else if (e.key === 'Escape' && !rootRef.current?.querySelector(':popover-open')) {
      // (Esc in the open dropdown only closes the dropdown)
      fold()
    }
  }

  // ArrowUp on the text's first line: to the title, caret at its end
  const onTextKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const area = e.currentTarget
    const collapsed = area.selectionStart === area.selectionEnd
    if (e.key !== 'ArrowUp' || e.shiftKey || !collapsed || area.value.slice(0, area.selectionStart).includes('\n')) return
    e.preventDefault()
    const input = titleRef.current
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }

  // ArrowDown or Enter in the title: to the text, caret at its start
  const onTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key !== 'ArrowDown' && e.key !== 'Enter') || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    textRef.current?.focus()
    textRef.current?.setSelectionRange(0, 0)
  }

  return (
    // Keeps the folded card's place in the page; the open card lies over what's around it
    <div ref={rootRef} style={{ height: size.folded || undefined }} className={`relative ${open ? 'z-30' : ''}`}>
      <div
        ref={cardRef}
        onFocus={() => setOpen(true)}
        // Tabbing out folds it too
        onBlur={(e) => {
          if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
        }}
        onKeyDown={onKeyDown}
        // Open: moved up by the title's height while the title grows (same timing), so the text stays put
        style={open ? { boxShadow: 'var(--lift-shadow)', transform: `translateY(${-size.title}px)` } : undefined}
        // overflow-hidden: Create slides in from beyond the right edge
      className={`absolute inset-x-0 top-0 flex flex-col overflow-hidden rounded-(--card-radius) border border-line bg-surface transition-[box-shadow,transform] ${ANIMATE}`}
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

        <textarea
          ref={textRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onTextKeyDown}
          placeholder={kind === 'article' ? 'Write an article…' : 'Take a note…'}
          aria-label="Text"
          // Folded: room on the right for the kind button
          className={`${FIELD} max-h-[50vh] py-3 text-body ${open ? '' : 'overflow-hidden pe-28'}`}
        />

        {/* The bottom part, growing below (Create and the kind button lie over it) */}
        <div className={`${GROW} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="h-11" />
          </div>
        </div>

        {/* The kind button. Folded: in the text's row. Opening: held to the card's bottom, it goes down with
            the bottom part; then Create slides in from the right and pushes it left. Folding: back at once */}
        <div
          style={open ? { bottom: KIND_INSET, right: KIND_INSET + size.create + KIND_INSET } : { top: KIND_INSET, right: KIND_INSET }}
          className={`absolute ${open ? `transition-[right] ${ANIMATE} ${AFTER_GROW}` : ''}`}
        >
          <Dropdown label="Kind" value={kind} options={KINDS} onChange={chooseKind} />
        </div>
        <div
          ref={createRef}
          inert={!open}
          className={`absolute right-2 bottom-1 ${
            open ? `translate-x-0 opacity-100 transition-[translate,opacity] ${ANIMATE} ${AFTER_GROW}` : 'translate-x-[calc(100%+1rem)] opacity-0'
          }`}
        >
          <Button onClick={create} disabled={!canCreate} title="Create (Ctrl+Enter)">
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
