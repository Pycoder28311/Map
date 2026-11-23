import { LuUser } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'

/** The signed-in user's picture (or a person icon) in the navbar: a link to their profile page */
export default function ProfileCircle() {
  const { data: session } = authClient.useSession()
  const user = session?.user
  if (!user) return null
  return (
    <Link
      to="/profile"
      title={`${user.name}: profile`}
      aria-label="Your profile"
      className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-(--corner-sm) bg-fill text-small font-medium text-fg-muted shadow-(--input-outer-shadow) ring-1 ring-line transition hover:ring-fg-subtle focus-visible:outline-2 focus-visible:outline-accent"
    >
      {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : <LuUser aria-hidden className="size-5" />}
    </Link>
  )
}
