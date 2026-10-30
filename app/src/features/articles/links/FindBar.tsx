import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { LuChevronDown, LuChevronUp, LuX } from 'react-icons/lu'
import IconButton from '../../../components/ui/buttons/IconButton'
import { useTextState, type ArticleText } from '../text/articleText'
import { findMatches } from './find'
import { findKey } from './linkExtensions'

/** The static text's highlights (CSS Custom Highlight API), where the browser has them: the matches and the current one */
const HIGHLIGHTS = { all: 'article-find', current: 'article-find-current' } as const
const highlights = typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : null

/**
 * Search in article (⋯ ▸ Search in article, or Ctrl / ⌘ + F in the text): every place the words are written is highlighted, the current
 * one more, in the whole text: by the editor in its window (linkExtensions.ts, FindHighlight), by the browser in the static parts.
 * Enter / ↓ the next, Shift + Enter / ↑ the one before, Esc closes
 */
export default function FindBar({ text, onClose }: { text: ArticleText; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [current, setCurrent] = useState(0)
  const doc = useTextState(text, (d) => d)
  // (the static parts are drawn again after a reset: their highlights too)
  const version = useSyncExternalStore(text.subscribe, text.getVersion)
  const matches = useMemo(() => findMatches(doc, query), [doc, query])
  const count = matches.length
  const at = count === 0 ? 0 : Math.min(current, count - 1)

  useEffect(() => {
    // In the window: the editor's decorations, in its own positions
    const editor = text.editor
    if (editor && !editor.isDestroyed) {
      const inWindow: { from: number; to: number }[] = []
      let currentInWindow = -1
      matches.forEach((m, i) => {
        const from = text.toEditor(m.from)
        const to = text.toEditor(m.to)
        if (from === null || to === null) return
        if (i === at) currentInWindow = inWindow.length
        inWindow.push({ from, to })
      })
      editor.view.dispatch(editor.state.tr.setMeta(findKey, { matches: inWindow, current: currentInWindow }))
    }
    // Elsewhere: the browser's highlights over the static text
    if (highlights) {
      const all = new Highlight()
      const now = new Highlight()
      matches.forEach((m, i) => {
        if (text.toEditor(m.from) !== null) return
        const range = text.staticRange(m.from, m.to)
        if (range) (i === at ? now : all).add(range)
      })
      highlights.set(HIGHLIGHTS.all, all)
      highlights.set(HIGHLIGHTS.current, now)
    }
  }, [text, matches, at, version])

  // The highlights go when it closes
  useEffect(
    () => () => {
      const editor = text.editor
      if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(findKey, { matches: [], current: -1 }))
      highlights?.delete(HIGHLIGHTS.all)
      highlights?.delete(HIGHLIGHTS.current)
    },
    [text],
  )

  /** Shows match `index` (wrapping around): it is scrolled into view */
  const show = (index: number) => {
    if (count === 0) return
    const next = (index + count) % count
    setCurrent(next)
    text.scrollTo(matches[next].from)
  }

  return (
    // A plain input in a row with nothing behind it: no background, no border, no shadow of its own
    <div role="search" className="flex items-center gap-1">
      <input
        type="search"
        aria-label="Search in article"
        placeholder="Search in article"
        value={query}
        className="min-w-0 flex-1 border border-line bg-transparent px-2 py-1 text-body outline-none placeholder:text-fg-subtle focus:border-accent"
        autoFocus
        onChange={(e) => {
          setQuery(e.target.value)
          setCurrent(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            show(at + (e.shiftKey ? -1 : 1))
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
      />
      <span className="min-w-14 text-center text-small text-fg-muted" aria-live="polite">
        {query.trim() ? (count ? `${at + 1} / ${count}` : '0 / 0') : ''}
      </span>
      <IconButton icon={LuChevronUp} label="Previous" size="sm" disabled={count === 0} onClick={() => show(at - 1)} />
      <IconButton icon={LuChevronDown} label="Next" size="sm" disabled={count === 0} onClick={() => show(at + 1)} />
      <IconButton icon={LuX} label="Close search" size="sm" onClick={onClose} />
    </div>
  )
}
