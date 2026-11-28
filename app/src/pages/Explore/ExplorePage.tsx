import type { ExplorableName } from '@map/shared'
import { LuCompass } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import SearchInput from '../../components/ui/fields/SearchInput'
import ExploreCard from '../../features/explore/ExploreCard'
import { useExplore } from '../../features/explore/useExplore'

const TYPES: { type: ExplorableName | undefined; label: string }[] = [
  { type: undefined, label: 'All' },
  { type: 'articles', label: 'Articles' },
  { type: 'maps', label: 'Maps' },
  { type: 'projects', label: 'Projects' },
  { type: 'folders', label: 'Folders' },
]

// No <main> here: AppLayout provides it
/**
 * Explore (docs/plans/41): everyone's public articles, maps, projects and folders, newest first, as the Dashboard's cards with who made
 * them; a search (titles, and the first words of articles and projects) and the kind. The sidebar's Explore row opens it
 */
export default function ExplorePage() {
  const explore = useExplore()
  const loading = explore.status === 'loading'
  return (
    <div className="mx-auto flex max-w-[72rem] flex-col gap-6 px-4 pt-10 pb-24 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
          <LuCompass aria-hidden className="size-7 text-fg-muted" />
          Explore
        </h1>
        <p className="text-body text-fg-muted">What people made public: open one to read it.</p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="w-full max-w-[36rem]">
          <SearchInput
            label="Search public articles, maps, projects and folders"
            placeholder="Search public articles, maps, projects…"
            value={explore.text}
            onChange={(e) => explore.setText(e.target.value)}
            className="w-full"
          />
        </div>
        <div role="radiogroup" aria-label="Kind" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TYPES.map((t) => (
            <Button
              key={t.label}
              role="radio"
              aria-checked={explore.type === t.type}
              variant={explore.type === t.type ? 'primary' : 'underline'}
              size="sm"
             
              className="shrink-0"
              onClick={() => explore.setType(t.type)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {explore.status === 'error' && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-body text-danger">
            {explore.error}
          </p>
          <Button variant="underline" size="sm" onClick={explore.retry}>
            Try again
          </Button>
        </div>
      )}
      {loading && explore.items.length === 0 && <p className="text-body text-fg-subtle">Loading…</p>}
      {explore.status === 'ready' && explore.items.length === 0 && (
        <p className="py-10 text-center text-body text-fg-subtle">{explore.q ? `Nothing public matches “${explore.q}”.` : 'Nothing public yet.'}</p>
      )}

      <ul aria-label="Public objects" aria-busy={loading} className={`grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] justify-items-center gap-x-4 gap-y-8 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {explore.items.map((item) => (
          <ExploreCard key={`${item.type}:${item.id}`} item={item} />
        ))}
      </ul>

      {explore.cursor && (
        <Button variant="underline" className="self-center" disabled={explore.more} onClick={() => void explore.loadMore()}>
          {explore.more ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
