import { LuExternalLink, LuUserCheck, LuUserPlus } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { placeholderArt } from '../objects/placeholderArt'
import { initialsOf, useFollowing, type Person } from './mockPeople'

/** A person's round picture: their initials on a colour made from their id */
export function PersonAvatar({ person, size = 'size-8' }: { person: Person; size?: string }) {
  return (
    <span aria-hidden style={placeholderArt(person.id)} className={`inline-flex shrink-0 items-center justify-center rounded-full text-small font-medium text-fg ${size}`}>
      {initialsOf(person)}
    </span>
  )
}

/** Follow / Following, for one person */
export function FollowButton({ person }: { person: Person }) {
  const [following, setFollowing] = useFollowing(person.id)
  return (
    <Button
      variant={following ? 'ghost' : 'primary'}
      size="sm"
      icon={following ? LuUserCheck : LuUserPlus}
      aria-pressed={following}
      onClick={() => setFollowing(!following)}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}

/** A person: picture, name, about them, their followers and projects, and Follow */
export default function PersonCard({ person }: { person: Person }) {
  const [following] = useFollowing(person.id)
  return (
    <div className="flex w-64 max-w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <PersonAvatar person={person} size="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{person.name}</p>
          <p className="truncate text-small text-fg-subtle">
            @{person.handle} · {person.followers + (following ? 1 : 0)} followers
          </p>
        </div>
      </div>
      <p className="text-small text-fg-muted">{person.bio}</p>
      {person.projects.length > 0 && (
        <div className="flex flex-col items-start">
          {person.projects.map((p) => (
            <Button key={p.url} variant="text" size="sm" icon={LuExternalLink} onClick={() => window.open(p.url, '_blank', 'noopener,noreferrer')}>
              {p.title}
            </Button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <FollowButton person={person} />
      </div>
    </div>
  )
}
