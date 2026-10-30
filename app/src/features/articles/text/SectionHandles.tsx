import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { LuGripVertical } from 'react-icons/lu'
import { RICH_TEXT_CLASSES } from '../../../components/ui/fields/RichTextField'
import { scrollParent, type ArticleText } from './articleText'
import { dropIndex, dropLineY } from './sectionDrag'
import { textNodes } from './staticDom'

/** How far the pointer moves before a press becomes a drag (px) */
const DRAG_START = 4
/** How near the scrolling element's top or bottom the pointer scrolls it while dragging (px), and how far a step goes */
const SCROLL_EDGE = 48
const SCROLL_STEP = 14

type Shown = { index: number; top: number }
type Drag = { from: number; startY: number; dragging: boolean; to: number; line: number; grab: number }

/** The middle of a section's first line, from the top of `box` (its first words' line; an element with none: its own top) */
function firstLine(el: HTMLElement, box: HTMLElement): number {
  const origin = box.getBoundingClientRect().top
  const words = [...textNodes(el)].find((t) => t.data.trim())
  if (words) {
    const range = document.createRange()
    range.setStart(words, 0)
    range.setEnd(words, Math.min(1, words.data.length))
    const line = range.getClientRects()[0]
    if (line) return (line.top + line.bottom) / 2 - origin
  }
  const rect = el.getBoundingClientRect()
  return rect.top + Math.min(rect.height / 2, 12) - origin
}

/**
 * The ⠿ beside the first line of the section under the pointer (an editor's page): dragged, it moves the section (a line shows where it
 * goes, a faint copy follows the pointer); clicked, it selects the section (Delete takes it away). It is on the page only, never in the text.
 * `box`: the element around the text it is placed in (positioned)
 */
export default function SectionHandles({ text, box }: { text: ArticleText; box: RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState<Shown | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const handle = useRef<HTMLButtonElement>(null)

  // Follows the pointer over the text; typing hides it
  useEffect(() => {
    const el = box.current
    if (!el) return
    const move = (e: globalThis.PointerEvent) => {
      if (drag || e.buttons) return
      if (handle.current?.contains(e.target as Node)) return
      const section = text.sectionOf(e.target as Element)
      if (!section) return
      setShown((old) => {
        const top = firstLine(section.el, el)
        return old && old.index === section.index && Math.abs(old.top - top) < 1 ? old : { index: section.index, top }
      })
    }
    const leave = () => !drag && setShown(null)
    const typing = () => setShown(null)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('keydown', typing)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('keydown', typing)
    }
  }, [box, text, drag])

  /** The sections' places now (they move as the page scrolls) */
  const rects = () => {
    const count = text.doc().childCount
    return Array.from({ length: count }, (_, i) => text.sectionElement(i)?.getBoundingClientRect() ?? { top: 0, bottom: 0 })
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!shown || e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const el = text.sectionElement(shown.index)
    setDrag({ from: shown.index, startY: e.clientY, dragging: false, to: shown.index, line: 0, grab: e.clientY - (el?.getBoundingClientRect().top ?? e.clientY) })
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = box.current
    if (!drag || !el) return
    if (!drag.dragging && Math.abs(e.clientY - drag.startY) < DRAG_START) return
    const origin = el.getBoundingClientRect().top
    if (!drag.dragging) {
      // The faint copy of the section
      const section = text.sectionElement(drag.from)
      if (section && ghost.current) {
        const copy = section.cloneNode(true) as HTMLElement
        copy.removeAttribute('data-section')
        ghost.current.style.width = `${section.getBoundingClientRect().width}px`
        ghost.current.replaceChildren(copy)
      }
    }
    const all = rects()
    const to = dropIndex(e.clientY, all)
    setDrag({ ...drag, dragging: true, to, line: dropLineY(to, all) - origin })
    if (ghost.current) ghost.current.style.top = `${e.clientY - origin - drag.grab}px`
    // Near the scrolling element's edges, it scrolls
    const scroller = scrollParent(el)
    const area = scroller === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect()
    if (e.clientY < area.top + SCROLL_EDGE) scroller.scrollTop -= SCROLL_STEP
    else if (e.clientY > area.bottom - SCROLL_EDGE) scroller.scrollTop += SCROLL_STEP
  }

  const onPointerUp = () => {
    if (!drag) return
    if (drag.dragging) text.moveSection(drag.from, drag.to)
    else text.selectSection(drag.from)
    ghost.current?.replaceChildren()
    setDrag(null)
    setShown(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!shown || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const to = e.key === 'ArrowUp' ? shown.index - 1 : shown.index + 2
    if (to < 0 || to > text.doc().childCount) return
    text.moveSection(shown.index, to)
    setShown(null)
  }

  return (
    <>
      {shown && (
        // A drag handle, not a button of the bar (buttons.test.ts ALLOWED)
        <button
          ref={handle}
          type="button"
          aria-label="Move section (drag, or Alt + ↑ / ↓); click to select it"
          title="Drag to move · Click to select"
          style={{ top: shown.top }}
          className={`absolute -start-9 z-10 flex h-6 w-5 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-(--corner-sm) text-fg-subtle hover-fill hover:text-fg ${drag?.dragging ? 'cursor-grabbing' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            ghost.current?.replaceChildren()
            setDrag(null)
          }}
          onKeyDown={onKeyDown}
        >
          <LuGripVertical aria-hidden className="size-4" />
        </button>
      )}
      {drag?.dragging && <div aria-hidden style={{ top: drag.line }} className="pointer-events-none absolute inset-x-0 z-20 h-0.5 -translate-y-1/2 rounded-full bg-accent" />}
      <div ref={ghost} aria-hidden className={`article-static pointer-events-none absolute start-0 z-20 max-h-48 overflow-hidden opacity-50 ${RICH_TEXT_CLASSES} ${drag?.dragging ? '' : 'hidden'}`} />
    </>
  )
}
