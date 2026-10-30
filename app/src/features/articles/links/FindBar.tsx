import { useEditorState, type Editor } from '@tiptap/react'
import { useEffect, useState } from 'react'
import { LuChevronDown, LuChevronUp, LuX } from 'react-icons/lu'
import IconButton from '../../../components/ui/buttons/IconButton'
import { findKey } from './linkExtensions'

/**
 * Search in article (⋯ ▸ Search in article, or Ctrl / ⌘ + F in the text): every place the words are written is highlighted in the text
 * (linkExtensions.ts, FindHighlight), the current one more; Enter / ↓ the next, Shift + Enter / ↑ the one before, Esc closes
 */
export default function FindBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const find = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const s = findKey.getState(e.state)
      return { count: s?.matches.length ?? 0, current: s?.current ?? 0 }
    },
  })

  const set = (meta: { query?: string; current?: number }) => editor.view.dispatch(editor.state.tr.setMeta(findKey, meta))
  // The highlights go when it closes
  useEffect(() => () => void (!editor.isDestroyed && editor.view.dispatch(editor.state.tr.setMeta(findKey, { query: '' }))), [editor])

  /** Shows match `index` (wrapping around): it is scrolled into view */
  const show = (index: number) => {
    if (find.count === 0) return
    const current = (index + find.count) % find.count
    set({ current })
    const match = findKey.getState(editor.state)?.matches[current]
    if (!match) return
    const dom = editor.view.domAtPos(match.from).node
    ;(dom instanceof HTMLElement ? dom : dom.parentElement)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
          set({ query: e.target.value, current: 0 })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            show(find.current + (e.shiftKey ? -1 : 1))
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
      />
      <span className="min-w-14 text-center text-small text-fg-muted" aria-live="polite">
        {query.trim() ? (find.count ? `${find.current + 1} / ${find.count}` : '0 / 0') : ''}
      </span>
      <IconButton icon={LuChevronUp} label="Previous" size="sm" disabled={find.count === 0} onClick={() => show(find.current - 1)} />
      <IconButton icon={LuChevronDown} label="Next" size="sm" disabled={find.count === 0} onClick={() => show(find.current + 1)} />
      <IconButton icon={LuX} label="Close search" size="sm" onClick={onClose} />
    </div>
  )
}
