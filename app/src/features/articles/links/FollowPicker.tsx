import { useState } from 'react'
import { LuFolderOpen, LuUsers } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import SearchInput from '../../../components/ui/fields/SearchInput'
import TextField from '../../../components/ui/fields/TextField'
import { usePeople } from '../../people/mockPeople'
import { FormActions } from './LinkForms'
import { PICK_ROW } from './pickRow'
import { isWebUrl, LIMITS, type ArticleLink } from './linkHref'

const TABS = [
  { id: 'people', label: 'Followers', icon: LuUsers },
  { id: 'project', label: 'Project URL', icon: LuFolderOpen },
] as const

type Props = {
  /** A person or a project picked */
  onPick: (link: Extract<ArticleLink, { kind: 'person' | 'project-url' }>) => void
  /** What is picked now, shown as chosen (the autolinker, a link being changed) */
  chosen?: ArticleLink | null
  onRemove?: () => void
  /** Its first field takes the focus when it opens (default) */
  autoFocus?: boolean
  /** The people's search field shows (default); false: the owner opens it with a search button of its own */
  showSearch?: boolean
}

/**
 * Follow: the followers to send the reader to (a person: clicking the words shows them, with Follow), or the address of someone else's
 * project. The people are made up for now (mockPeople.ts)
 */
export default function FollowPicker({ onPick, chosen, onRemove, autoFocus = true, showSearch = true }: Props) {
  const [tab, setTab] = useState<'people' | 'project'>(chosen?.kind === 'project-url' ? 'project' : 'people')
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState(chosen?.kind === 'project-url' ? chosen.url : '')
  const { people, loading } = usePeople(query)
  const validUrl = isWebUrl(url.trim())

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Two tabs, as the map's Line and Border sidebars have: the picked one is half as wide again, the width gliding (PointToolButton.tsx) */}
      <div role="tablist" aria-label="Follow" className="flex gap-1">
        {TABS.map((t) => (
          <Button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            variant={tab === t.id ? 'selected' : 'ghost'}
            size="sm"
            plain
            icon={t.icon}
            className={`min-w-0 basis-0 justify-center whitespace-nowrap transition-[flex-grow,background-color,color,padding] duration-200 motion-reduce:transition-none ${tab === t.id ? 'grow-3' : 'grow-2'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {tab === 'people' ? (
        <>
          {showSearch && <SearchInput label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={autoFocus} />}
          <div role="listbox" aria-label="People" className="flex max-h-64 flex-col overflow-y-auto">
            {people.map((person) => {
              const picked = chosen?.kind === 'person' && chosen.personId === person.id
              return (
                <Button
                  key={person.id}
                  role="option"
                  aria-selected={picked}
                  variant={picked ? 'selected' : 'ghost'}
                  size="sm"
                  plain
                  className={PICK_ROW}
                  onClick={() => onPick({ kind: 'person', personId: person.id })}
                >
                  {/* "Follow:" is only a word before the name, not a button */}
                  <span className="min-w-0 truncate text-start">
                    <span className="font-normal text-fg-subtle">Follow:</span> {person.name}
                  </span>
                </Button>
              )
            })}
            <p className="px-2 py-1 text-small text-fg-subtle" aria-live="polite">
              {loading ? 'Loading…' : people.length === 0 ? 'Nobody found.' : null}
            </p>
          </div>
          {onRemove && chosen?.kind === 'person' && (
            <Button variant="ghost" size="sm" className="self-end" onClick={onRemove}>
              Remove
            </Button>
          )}
        </>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (validUrl) onPick({ kind: 'project-url', url: url.trim() })
          }}
        >
          <TextField label="Link to someone's project" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={LIMITS.url} autoFocus={autoFocus} />
          {url.trim() !== '' && !validUrl && <p className="text-small text-danger">Only http and https addresses.</p>}
          <FormActions onRemove={chosen?.kind === 'project-url' ? onRemove : undefined} canApply={validUrl} />
        </form>
      )}
    </div>
  )
}
