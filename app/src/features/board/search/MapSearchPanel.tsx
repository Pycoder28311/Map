import { useMemo, useState } from 'react'
import Button from '../../../components/ui/buttons/Button'
import SearchInput from '../../../components/ui/fields/SearchInput'
import { useBoard } from '../boardStore'
import { FLOAT } from '../floating'
import { ALL, filtersOf, matchEntries, sameFilter, searchEntries, type SearchFilter } from './mapSearch'
import SearchResult from './SearchResult'

type Props = {
  mapId: string
  /** Moves the map to an object */
  onShow: (id: number) => void
  /** Selects an object to edit it */
  onEdit: (id: number) => void
  onClose: () => void
}

/**
 * The search of the left panel, under the title bar (like Google Maps' top left): the field, the filter tabs, then the results, each a
 * card of its own (no background behind them, the map shows between them). It finds every point and every named line, area and shape
 * (mapSearch.ts). Esc empties the field, then closes the panel
 */
export default function MapSearchPanel({ mapId, onShow, onEdit, onClose }: Props) {
  const board = useBoard(mapId)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>(ALL)
  // The result opened inside the list (one at a time)
  const [openId, setOpenId] = useState<number | null>(null)
  const entries = useMemo(() => searchEntries(board), [board])
  const tabs = filtersOf(entries)
  // A tab whose results are all gone falls back to All
  const current = tabs.some((t) => sameFilter(t.filter, filter)) ? filter : ALL
  const results = matchEntries(entries, query, current)

  const toggle = (id: number) => {
    const next = openId === id ? null : id
    setOpenId(next)
    if (next !== null) onShow(next)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="pointer-events-auto shrink-0">
        <SearchInput
          autoFocus
          label="Search this map"
          placeholder="Search points and places"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            e.preventDefault()
            e.stopPropagation()
            if (query) setQuery('')
            else onClose()
          }}
          className="w-full shadow-lg"
        />
      </div>
      {tabs.length > 1 && (
        // One line of tabs, never wrapped: it scrolls sideways when it is too wide
        <div role="toolbar" aria-label="Filter the results" className="pointer-events-auto -mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1">
          {tabs.map((tab) => {
            const on = sameFilter(tab.filter, current)
            return (
              <span key={tab.name} className={`shrink-0 rounded-(--radius-pill) ${FLOAT}`}>
                <Button variant={on ? 'selected' : 'ghost'} size="sm" plain aria-pressed={on} onClick={() => setFilter(tab.filter)}>
                  {tab.name}
                  <span className="ms-1 text-fg-subtle tabular-nums">{tab.count}</span>
                </Button>
              </span>
            )
          })}
        </div>
      )}
      <p role="status" className="sr-only">
        {results.length === 1 ? '1 result' : `${results.length} results`}
      </p>
      {results.length === 0 ? (
        <p className={`pointer-events-auto p-4 text-body text-fg-muted ${FLOAT}`}>
          {entries.length === 0 ? 'Nothing to find yet: add points, or give a line, an area or a shape a name.' : `Nothing matches “${query.trim()}”.`}
        </p>
      ) : (
        <ul aria-label="Results" className="pointer-events-auto -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1">
          {results.map((entry) => {
            const object = board.objects.find((o) => o.id === entry.id)
            if (!object) return null
            return (
              <SearchResult
                key={entry.id}
                entry={entry}
                object={object}
                open={openId === entry.id}
                onToggle={() => toggle(entry.id)}
                onShow={() => onShow(entry.id)}
                onEdit={() => onEdit(entry.id)}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
