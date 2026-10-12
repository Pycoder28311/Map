import { authClient } from '../../lib/auth-client'

/** "Ada Lovelace" → "AL" */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** The signed-in user's picture (or initials) in the navbar. Nothing happens on click yet */
export default function ProfileCircle() {
  const { data: session } = authClient.useSession()
  const user = session?.user
  if (!user) return null
  return (
    <span
      title={user.name}
      className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fill text-small font-medium text-fg-muted ring-1 ring-line"
    >
      {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : initialsOf(user.name || user.email)}
    </span>
  )
}
