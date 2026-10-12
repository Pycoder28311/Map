import { useDndMonitor } from '@dnd-kit/core'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import SearchInput from '../../components/ui/fields/SearchInput'
import BarPopout from '../../components/ui/overlays/BarPopout'
import { findObject, type MockObject } from '../../mocks/projects'
import { useMockObjects, useMockProjects } from '../../mocks/projectsStore'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import type { PanelDragData } from '../workspace/types'
import { NO_FILTERS, searchObjects, type SearchFilters } from './search'
import SearchPanel from './SearchPanel'

// The filters, and whether they're shown, kept for the session (not saved)
let lastFilters: SearchFilters = NO_FILTERS
let lastFiltersOpen = false

/**
 * The navbar's search field. Focused, its results (with filters) grow out of the bar below it.
 * `/` or Ctrl/⌘+K focuses it; ↑/↓ choose a result, Enter opens it; Esc clears the text, a second
 * Esc closes it. Dragging a result (by its hand) closes it, so what's under it can take the drop.
 */
export default function NavSearch() {
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>(lastFilters)
  const [active, setActive] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(lastFiltersOpen)
  const objects = useMockObjects()
  const projects = useMockProjects()
  const openLayout = useOpenLayout()

  const visible = objects.filter((o) => findObject(o.id))
  const results = searchObjects(visible, query, filters)
  const projectName = (o: MockObject) => (o.parentId ? findObject(o.parentId)?.name : undefined)

  const changeFilters = (next: SearchFilters) => {
    lastFilters = next
    setFilters(next)
    setActive(0)
  }

  const openResult = (o: MockObject) => {
    openLayout(single({ type: o.kind, id: o.id }))
    setOpen(false)
    inputRef.current?.blur()
  }

  // `/` (outside fields) or Ctrl/⌘+K: focus the search
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]')
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // A result dragged by its hand: get out of the way
  useDndMonitor({
    onDragStart: ({ active: a }) => {
      if (String(a.id).startsWith('nav-search:') && (a.data.current as PanelDragData | undefined)) setOpen(false)
    },
  })

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (results.length) setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length)
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      openResult(results[active])
    } else if (e.key === 'Escape' && query) {
      // First Esc clears the text (the popout stays); the next one closes it (BarPopout)
      e.preventDefault()
      setQuery('')
      setActive(0)
    }
  }

  return (
    <BarPopout
      mode="focus"
      // The results right under the field, centred on it (opening the filters grows it to the left)
      align="center"
      anchorRef={resultsRef}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) inputRef.current?.blur()
      }}
      trigger={
        <SearchInput
          ref={inputRef}
          variant="border"
          label="Search"
          placeholder="Search  /"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          className="w-64"
        />
      }
    >
      <SearchPanel
        query={query}
        filters={filters}
        onFilters={changeFilters}
        results={results}
        active={Math.min(active, Math.max(results.length - 1, 0))}
        onActive={setActive}
        onOpen={openResult}
        projects={projects}
        projectName={projectName}
        resultsRef={resultsRef}
        filtersOpen={filtersOpen}
        onFiltersOpen={(next) => {
          lastFiltersOpen = next
          setFiltersOpen(next)
        }}
      />
    </BarPopout>
  )
}
