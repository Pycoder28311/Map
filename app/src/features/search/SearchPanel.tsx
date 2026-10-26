import type { RefObject } from 'react'
import { LuHand, LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { useObjectDrag } from '../drag/objectDrag'
import { kindEntry, SEARCH_KINDS } from './kinds'
import { hasFilters, type SearchFilters, type SearchResult } from './search'
import Button from '../../components/ui/buttons/Button'

// Full class strings so Tailwind can detect them at build time.
const HEADING = 'text-small font-medium uppercase tracking-wide text-fg-subtle'
const CHECK = 'flex cursor-pointer items-center gap-2 rounded-(--btn-close-radius) px-1.5 py-1 text-body hover-fill'
const SEGMENT = 'flex-1 cursor-pointer rounded-(--corner-sm) px-2 py-0.5 text-small transition-colors'

type Props = {
  query: string
  filters: SearchFilters
  onFilters: (filters: SearchFilters) => void
  results: SearchResult[]
  /** The result chosen with ↑/↓ (Enter opens it) */
  active: number
  onActive: (index: number) => void
  onOpen: (result: SearchResult) => void
  /** The filters column is shown (Open Filters) */
  filtersOpen: boolean
  onFiltersOpen: (open: boolean) => void
  /** The results' part: the popout keeps it centred under the field (BarPopout's anchor) */
  resultsRef: RefObject<HTMLDivElement | null>
}

/**
 * What grows out of the navbar's search field: the results, and (Open Filters) the filters on their
 * left, beyond a thin line (Type: include or exclude kinds; Parent Project). Each result opens on click, and its hand drags it like
 * any object (onto panes, sidebar rows, link nodes, the trash).
 */
export default function SearchPanel({
  query,
  filters,
  onFilters,
  results,
  active,
  onActive,
  onOpen,
  filtersOpen,
  onFiltersOpen,
  resultsRef,
}: Props) {
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  const chips = [
    ...filters.types.map((k) => ({
      key: `t:${k}`,
      label: `${filters.typeMode === 'exclude' ? 'Not ' : ''}${kindEntry(k)?.label ?? k}`,
      remove: () => onFilters({ ...filters, types: filters.types.filter((x) => x !== k) }),
    })),
  ]

  return (
    <div className="flex">
      {/* Filters (Open Filters), then a thin line: they slide out to the left (the popout is held by
          its right edge, so the results stay where they are) */}
      <div
        inert={!filtersOpen}
        className={`grid transition-[grid-template-columns,opacity] duration-(--popout-duration) ease-out motion-reduce:transition-none ${
          filtersOpen ? 'grid-cols-[1fr]' : 'grid-cols-[0fr] opacity-0'
        }`}
      >
        <div className="flex min-w-0 justify-end gap-3 overflow-hidden pe-3">
          <div className="flex w-40 shrink-0 flex-col gap-3 py-1">
            <fieldset className="flex flex-col gap-1">
              <legend className={`${HEADING} mb-1`}>Type</legend>
              <div className="mb-1 flex rounded-(--btn-close-radius) bg-fill p-0.5" role="radiogroup" aria-label="Type filter">
                {(['include', 'exclude'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={filters.typeMode === mode}
                    onClick={() => onFilters({ ...filters, typeMode: mode })}
                    className={`${SEGMENT} ${filters.typeMode === mode ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                  >
                    {mode === 'include' ? 'Include' : 'Exclude'}
                  </button>
                ))}
              </div>
              {SEARCH_KINDS.map(({ kind, label, icon: Icon }) => {
                return (
                  <label key={kind} className={CHECK}>
                    <input
                      type="checkbox"
                      checked={filters.types.includes(kind)}
                      onChange={() => onFilters({ ...filters, types: toggle(filters.types, kind) })}
                      className="accent-accent"
                    />
                    <Icon className="size-3.5 text-fg-subtle" />
                    {label}
                  </label>
                )
              })}
            </fieldset>
          </div>

          <div aria-hidden className="w-px shrink-0 self-stretch bg-line" />
        </div>
      </div>

      {/* Results */}
      <div ref={resultsRef} className="flex w-96 shrink-0 flex-col gap-2">
        <div className="flex min-h-7 flex-wrap items-center gap-1">
          <Button
            variant={filtersOpen ? 'selected' : 'ghost'}
            size="sm"
            icon={LuSlidersHorizontal}
            onClick={() => onFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className="me-1"
          >
            {filtersOpen ? 'Close Filters' : 'Open Filters'}
          </Button>
          {hasFilters(filters) ? (
            chips.map((c) => (
              <Button key={c.key} variant="secondary" size="sm" onClick={c.remove} aria-label={`Remove filter ${c.label}`}>
                {c.label}
                <LuX className="size-3" aria-hidden />
              </Button>
            ))
          ) : (
            <span className="text-small text-fg-subtle">All objects</span>
          )}
        </div>
        <ul role="listbox" aria-label="Search results" className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-2 py-6 text-center text-body text-fg-subtle">{query.trim() || hasFilters(filters) ? 'No results' : 'Type to search'}</li>
          ) : (
            results.map((o, i) => (
              <ResultRow
                key={`${o.kind}:${o.id}`}
                result={o}
                active={i === active}
                onHover={() => onActive(i)}
                onOpen={() => onOpen(o)}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

function ResultRow({
  result: object,
  active,
  onHover,
  onOpen,
}: {
  result: SearchResult
  active: boolean
  onHover: () => void
  onOpen: () => void
}) {
  const Icon = kindEntry(object.kind)?.icon ?? SEARCH_KINDS[0].icon
  const description = object.description
  const { setNodeRef, listeners, attributes, isDragging } = useObjectDrag({
    id: `nav-search:${object.kind}:${object.id}`,
    label: object.name,
    panel: { type: object.kind, id: object.id },
    object: { objectId: object.id, kind: object.kind, icon: Icon, source: 'pane' },
  })
  return (
    <li role="option" aria-selected={active} data-share-id={object.id} onPointerEnter={onHover} className={isDragging ? 'opacity-40' : ''}>
      <div className={`flex items-center gap-3 rounded-(--btn-radius) p-1.5 ${active ? 'bg-fill' : ''}`}>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-(--btn-close-radius) bg-fill-strong/60 text-fg-subtle">
            <Icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-medium">{object.name}</span>
            {description && <span className="block truncate text-small text-fg-muted">{description}</span>}
          </span>
        </button>
        {/* The hand: drag the result like any object */}
        <button
          ref={setNodeRef}
          type="button"
          data-drag-handle
          {...listeners}
          {...attributes}
          aria-label={`Drag ${object.name}`}
          title="Drag"
          className="inline-flex shrink-0 cursor-grab items-center justify-center rounded-(--btn-close-radius) p-1.5 text-fg-subtle hover:bg-fill-strong/60 hover:text-fg active:cursor-grabbing"
        >
          <LuHand className="size-4" />
        </button>
      </div>
    </li>
  )
}
