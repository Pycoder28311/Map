import type { Editor } from '@tiptap/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hoverInfoPosition, type HoverInfoPlace } from '../../../components/ui/overlays/hoverInfoPosition'
import { useTimeout } from '../../../lib/useTimeout'
import { fromHref, type ArticleLink } from './linkHref'
import LinkPreview from './LinkPreview'

/** How long the pointer rests on a link before its card opens, and how long the card stays once it has left (to reach the card) */
const OPEN_MS = 350
const CLOSE_MS = 200

type Shown = { link: ArticleLink; words: string; el: HTMLElement }

/**
 * The card above a hovered link of the article (LinkPreview): its picture and the start of its text. The pointer can move onto it (a
 * person's card has Follow). In the top layer, so nothing clips it; it goes below the link when there is no room above. Closes on
 * leaving, scrolling, Esc, typing and pressing in the text
 */
export default function LinkHoverCard({ editor }: { editor: Editor }) {
  const [shown, setShown] = useState<Shown | null>(null)
  const [place, setPlace] = useState<HoverInfoPlace | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const { set: later, clear: cancel } = useTimeout()
  const current = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dom = editor.view.dom
    const hide = () => {
      cancel()
      current.current = null
      setShown(null)
      setPlace(null)
    }
    const linkOf = (target: EventTarget | null) => {
      const el = (target as HTMLElement | null)?.closest?.<HTMLAnchorElement>('a')
      return el && dom.contains(el) ? el : null
    }
    const over = (e: PointerEvent) => {
      const el = linkOf(e.target)
      if (!el || e.buttons) return
      if (el === current.current) return cancel()
      const link = fromHref(el.getAttribute('href'))
      if (!link || link.kind === 'anchor') return
      later(() => {
        current.current = el
        setPlace(null)
        setShown({ link, words: el.textContent ?? '', el })
      }, OPEN_MS)
    }
    const out = (e: PointerEvent) => {
      if (!linkOf(e.target) || linkOf(e.relatedTarget) === current.current) return
      later(hide, CLOSE_MS)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    dom.addEventListener('pointerover', over)
    dom.addEventListener('pointerout', out)
    dom.addEventListener('pointerdown', hide)
    dom.addEventListener('keydown', hide)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      dom.removeEventListener('pointerover', over)
      dom.removeEventListener('pointerout', out)
      dom.removeEventListener('pointerdown', hide)
      dom.removeEventListener('keydown', hide)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [editor, later, cancel])

  // Placed once it is measured, before it is painted; measured again when its content grows (a picture loaded)
  useLayoutEffect(() => {
    const el = card.current
    if (!shown || !el) return
    if (!el.matches(':popover-open')) el.showPopover()
    const measure = () => {
      const box = el.getBoundingClientRect()
      setPlace(hoverInfoPosition(shown.el.getBoundingClientRect(), { width: box.width, height: box.height }, { width: window.innerWidth, height: window.innerHeight }, 'top'))
    }
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [shown])

  if (!shown) return null
  return (
    <div
      ref={card}
      popover="manual"
      role="tooltip"
      style={{ left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? 'visible' : 'hidden' }}
      className="fixed inset-auto m-0 w-max max-w-72 overflow-visible rounded-(--card-radius) border border-line bg-surface p-3 text-fg shadow-xl"
      onPointerEnter={() => cancel()}
      onPointerLeave={() =>
        later(() => {
          current.current = null
          setShown(null)
        }, CLOSE_MS)
      }
    >
      <LinkPreview link={shown.link} editor={editor} words={shown.words} />
    </div>
  )
}
