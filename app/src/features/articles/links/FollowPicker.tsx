import { useState } from 'react'
import { LuFolderOpen, LuUsers } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import SearchInput from '../../../components/ui/fields/SearchInput'
import TextField from '../../../components/ui/fields/TextField'
import { usePeople } from '../../people/mockPeople'
import { FollowButton, PersonAvatar } from '../../people/PersonCard'
import { FormActions } from './LinkForms'
import { isWebUrl, LIMITS, type ArticleLink } from './linkHref'

type Props = {
  /** A person or a project picked */
  onPick: (link: Extract<ArticleLink, { kind: 'person' | 'project-url' }>) => void
  /** What is picked now, shown as chosen (the autolinker, a link being changed) */
  chosen?: ArticleLink | null
  onRemove?: () => void
  /** Its first field takes the focus when it opens (default) */
  autoFocus?: boolean
}

/**
 * Follow: the followers to send the reader to (a person: clicking the words shows them, with Follow), or the address of someone else's
 * project. The people are made up for now (mockPeople.ts)
 */
export default function FollowPicker({ onPick, chosen, onRemove, autoFocus = true }: Props) {
  const [tab, setTab] = useState<'people' | 'project'>(chosen?.kind === 'project-url' ? 'project' : 'people')
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState(chosen?.kind === 'project-url' ? chosen.url : '')
  const { people, loading } = usePeople(query)
  const validUrl = isWebUrl(url.trim())

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="tablist" aria-label="Follow" className="flex shrink-0 flex-nowrap gap-0.5">
        <Button role="tab" aria-selected={tab === 'people'} variant={tab === 'people' ? 'selected' : 'ghost'} size="sm" icon={LuUsers} onClick={() => setTab('people')}>
          Followers
        </Button>
        <Button role="tab" aria-selected={tab === 'project'} variant={tab === 'project' ? 'selected' : 'ghost'} size="sm" icon={LuFolderOpen} onClick={() => setTab('project')}>
          Project URL
        </Button>
      </div>
      {tab === 'people' ? (
        <>
          <SearchInput label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={autoFocus} />
          <div role="listbox" aria-label="People" className="flex max-h-64 flex-col overflow-y-auto">
            {people.map((person) => {
              const picked = chosen?.kind === 'person' && chosen.personId === person.id
              return (
                <div key={person.id} className="flex items-center gap-1">
                  <Button
                    role="option"
                    aria-selected={picked}
                    variant={picked ? 'selected' : 'ghost'}
                    size="sm"
                    className="min-w-0 flex-1 justify-start"
                    onClick={() => onPick({ kind: 'person', personId: person.id })}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <PersonAvatar person={person} size="size-6" />
                      <span className="truncate">{person.name}</span>
                      <span className="truncate text-fg-subtle">@{person.handle}</span>
                    </span>
                  </Button>
                  <FollowButton person={person} />
                </div>
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
