import type { Author } from '@map/shared'
import { useState } from 'react'
import { LuUserCheck, LuUserPlus } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { follow, unfollow, useFollowing, useIsFollowing } from './followStore'

type Props = {
  person: Author
  /** On my followers list: someone who follows me and I don't follow says "Follow back" */
  followsMe?: boolean
  onError?: (message: string) => void
}

/** Follow / Following (hovered: Unfollow) / Follow back, for one person; one request each */
export default function FollowButton({ person, followsMe = false, onError }: Props) {
  useFollowing() // the people I follow are known before the button says anything
  const following = useIsFollowing(person.id)
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      await (following ? unfollow(person.id) : follow(person))
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not change it. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant={following ? 'underline' : 'primary'}
      size="sm"
     
      icon={following ? LuUserCheck : LuUserPlus}
      aria-pressed={following}
      disabled={busy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => void toggle()}
    >
      {following ? (hover ? 'Unfollow' : 'Following') : followsMe ? 'Follow back' : 'Follow'}
    </Button>
  )
}
