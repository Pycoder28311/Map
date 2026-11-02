import { LuUser } from 'react-icons/lu'
import { authClient } from '../../lib/auth-client'

/** The signed-in user's picture (or a person icon) in the navbar. Nothing happens on click yet */
export default function ProfileCircle() {
  const { data: session } = authClient.useSession()
  const user = session?.user
  if (!user) return null
  return (
    <span
      title={user.name}
      className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-(--corner-sm) bg-fill text-small font-medium text-fg-muted shadow-(--input-outer-shadow) ring-1 ring-line"
    >
      {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : <LuUser aria-hidden className="size-5" />}
    </span>
  )
}
