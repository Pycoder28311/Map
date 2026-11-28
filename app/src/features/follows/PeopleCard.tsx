import type { Author, FollowItem } from '@map/shared'
import { useState, type FormEvent } from 'react'
import { LuUserMinus, LuUserSearch } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import ErrorText from '../../components/ui/fields/ErrorText'
import TextField from '../../components/ui/fields/TextField'
import { ApiError } from '../../lib/api/client'
import { lookupUser } from '../../lib/api/users'
import Avatar from '../people/Avatar'
import FollowButton from './FollowButton'
import { removeFollower, useFollowCounts, useFollowers, useFollowing } from './followStore'

type Tab = 'followers' | 'following'

/** One person of a list: picture, name, and what can be done (Follow back / Unfollow; on Followers also Remove) */
function PersonRow({ item, tab, onError }: { item: FollowItem; tab: Tab; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <li className="flex min-h-12 items-center gap-3 py-1.5">
      <Avatar person={item.user} size="size-9" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">{item.user.name}</span>
        {item.mutual && <span className="text-small text-fg-subtle">{tab === 'followers' ? 'You follow each other' : 'Follows you'}</span>}
      </div>
      <FollowButton person={item.user} followsMe={tab === 'followers'} onError={onError} />
      {tab === 'followers' && (
        <IconButton
          icon={LuUserMinus}
          label={`Remove ${item.user.name} from your followers`}
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            removeFollower(item.id).catch((e: unknown) => {
              onError(e instanceof Error ? e.message : 'Could not remove them')
              setBusy(false)
            })
          }}
        />
      )}
    </li>
  )
}

const lookupError = (e: unknown) =>
  e instanceof ApiError && e.status === 404 ? 'Nobody with this email.' : e instanceof ApiError && e.status === 429 ? 'Too many searches. Wait a minute.' : 'Could not search. Try again.'

/** Find a person by their exact email, then Follow them */
function FindPeople() {
  const [email, setEmail] = useState('')
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<Author | null>(null)

  const find = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || finding) return
    setFinding(true)
    setError(null)
    setFound(null)
    try {
      setFound(await lookupUser(email))
    } catch (err) {
      setError(lookupError(err))
    } finally {
      setFinding(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form className="flex items-end gap-2" onSubmit={(e) => void find(e)}>
        <TextField label="Find people by email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="min-w-0 flex-1" />
        <Button variant="underline" type="submit" icon={LuUserSearch} disabled={!email.trim() || finding}>
          {finding ? 'Finding…' : 'Find'}
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>
      {found && (
        <div className="flex items-center gap-3 rounded-(--corner-sm) bg-fill px-3 py-2">
          <Avatar person={found} size="size-9" />
          <span className="min-w-0 flex-1 truncate text-body font-medium">{found.name}</span>
          <FollowButton person={found} onError={setError} />
        </div>
      )}
    </div>
  )
}

/**
 * The profile's people (docs/plans/40): tabs Followers · Following with their counts, each a list of people (read when its tab shows),
 * and Find people by email. Only I see my lists (and the people I collaborate with)
 */
export default function PeopleCard() {
  const [tab, setTab] = useState<Tab>('followers')
  const [error, setError] = useState<string | null>(null)
  const counts = useFollowCounts()
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="People" className="flex gap-1 border-b border-line pb-2">
        {(['followers', 'following'] as const).map((t) => (
          <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'primary' : 'underline'} onClick={() => setTab(t)}>
            {t === 'followers' ? 'Followers' : 'Following'}
            {counts && <span className="ms-1.5 text-fg-subtle">{counts[t]}</span>}
          </Button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      {tab === 'followers' ? <Followers onError={setError} /> : <Following onError={setError} />}
      <div className="border-t border-line pt-4">
        <FindPeople />
      </div>
    </div>
  )
}

function Followers({ onError }: { onError: (message: string) => void }) {
  const list = useFollowers()
  return (
    <div role="tabpanel" aria-label="Followers" className="flex flex-col">
      {list.status === 'loading' && list.items.length === 0 && <p className="text-body text-fg-subtle">Loading…</p>}
      {list.status === 'error' && <p className="text-body text-danger">{list.error}</p>}
      {list.status === 'ready' && list.items.length === 0 && <p className="text-body text-fg-subtle">Nobody follows you yet.</p>}
      <ul className="flex max-h-96 flex-col divide-y divide-line overflow-y-auto">
        {list.items.map((item) => (
          <PersonRow key={item.id} item={item} tab="followers" onError={onError} />
        ))}
      </ul>
      {list.cursor && (
        <Button variant="underline" size="sm" className="self-start" disabled={list.status === 'loading'} onClick={() => void list.more()}>
          Show more
        </Button>
      )}
    </div>
  )
}

function Following({ onError }: { onError: (message: string) => void }) {
  const list = useFollowing()
  return (
    <div role="tabpanel" aria-label="Following" className="flex flex-col">
      {list.status === 'loading' && list.items.length === 0 && <p className="text-body text-fg-subtle">Loading…</p>}
      {list.status === 'error' && <p className="text-body text-danger">{list.error}</p>}
      {list.status === 'ready' && list.items.length === 0 && <p className="text-body text-fg-subtle">You don't follow anyone yet. Find people by their email below.</p>}
      <ul className="flex max-h-96 flex-col divide-y divide-line overflow-y-auto">
        {list.items.map((item) => (
          <PersonRow key={item.id} item={item} tab="following" onError={onError} />
        ))}
      </ul>
    </div>
  )
}
