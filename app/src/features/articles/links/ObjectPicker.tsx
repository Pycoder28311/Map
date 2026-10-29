import { useEffect, useRef, useState } from 'react'
import { LuLayers } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import SearchInput from '../../../components/ui/fields/SearchInput'
import { resourceByPanelType } from '../../../resources/registry'
import type { ObjectType } from './linkHref'
import type { ObjectHit } from './objectSearch'
import { pickerKinds, useObjectSearch } from './useObjectSearch'

type Props = {
  /** An object picked */
  onPick: (hit: ObjectHit) => void
  /** Only these kinds (Import: articles); no kind buttons then when it is one */
  only?: ObjectType[]
  /** Left out of the list: `type:id` (the article itself) */
  exclude?: string
  /** The one picked now, shown as chosen */
  chosen?: { type: string; id: string } | null
  /** The list's height (Tailwind class) */
  listHeight?: string
  /** Its search takes the focus when it opens (default) */
  autoFocus?: boolean
  /** Its search field shows (default); false: the owner opens it with a search button of its own (the autolinker's sections) */
  showSearch?: boolean
}

/**
 * A list of the app's objects to pick one: kind buttons on top (All, Article, Map, Object card, Folder, Project), a search, and the
 * rows, read a page at a time (useObjectSearch) as the list is scrolled
 */
export default function ObjectPicker({ onPick, only, exclude, chosen, listHeight = 'max-h-64', autoFocus = true, showSearch = true }: Props) {
  const kinds = pickerKinds().filter((k) => !only || only.includes(k.type))
  const [kind, setKind] = useState<ObjectType | 'all'>(kinds.length === 1 ? kinds[0].type : 'all')
  const [query, setQuery] = useState('')
  const types = kind === 'all' ? kinds.map((k) => k.type) : [kind]
  const search = useObjectSearch(types, query, exclude)
  const end = useRef<HTMLDivElement>(null)

  // The end of the list in sight: the next page
  const loadMore = useRef(search.loadMore)
  useEffect(() => {
    loadMore.current = search.loadMore
  })
  useEffect(() => {
    const el = end.current
    if (!el) return
    const watcher = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore.current())
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {kinds.length > 1 && (
        // One line of kinds, never wrapped: it scrolls sideways when it is too wide
        <div role="group" aria-label="Kind" className="flex shrink-0 flex-nowrap gap-0.5 overflow-x-auto">
          <Button variant={kind === 'all' ? 'selected' : 'ghost'} size="sm" icon={LuLayers} aria-pressed={kind === 'all'} className="shrink-0" onClick={() => setKind('all')}>
            All
          </Button>
          {kinds.map(({ type, resource }) => (
            <Button key={type} variant={kind === type ? 'selected' : 'ghost'} size="sm" icon={resource.ui.icon} aria-pressed={kind === type} className="shrink-0" onClick={() => setKind(type)}>
              {resource.ui.label}
            </Button>
          ))}
        </div>
      )}
      {showSearch && <SearchInput label="Search objects" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={autoFocus} />}
      <div role="listbox" aria-label="Objects" className={`flex flex-col overflow-y-auto ${listHeight}`}>
        {search.hits.map((hit) => {
          const resource = resourceByPanelType(hit.type)
          const picked = chosen?.type === hit.type && chosen.id === hit.id
          return (
            <Button
              key={`${hit.type}:${hit.id}`}
              role="option"
              aria-selected={picked}
              variant={picked ? 'selected' : 'ghost'}
              size="sm"
              plain
              icon={resource?.ui.icon}
              className="w-full shrink-0 justify-start"
              onClick={() => onPick(hit)}
            >
              <span className="min-w-0 flex-1 truncate text-start">
                {hit.title}
                {hit.subtitle && <span className="text-fg-subtle"> · {hit.subtitle}</span>}
              </span>
            </Button>
          )
        })}
        <div ref={end} className="min-h-px" />
        <p className="px-2 py-1 text-small text-fg-subtle" aria-live="polite">
          {search.error ? (
            <span className="text-danger">{search.error}</span>
          ) : search.loading ? (
            'Loading…'
          ) : search.hits.length === 0 && !search.hasMore ? (
            query ? 'Nothing found.' : 'Nothing here yet.'
          ) : search.hasMore && query ? (
            <LinkButton onClick={search.keepSearching}>Keep searching</LinkButton>
          ) : null}
        </p>
      </div>
    </div>
  )
}
