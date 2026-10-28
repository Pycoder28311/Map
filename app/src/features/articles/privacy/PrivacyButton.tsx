import { useState } from 'react'
import { LuLock, LuLockOpen } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import PrivacyModal from './PrivacyModal'
import { useArticlePrivacy } from './privacyStore'

// The lock's two icons: switching between them draws the icon again, so it turns once as it opens or closes
const Shut = ({ className = '' }: { className?: string }) => <LuLock className={`${className} motion-safe:animate-lock-turn`} />
const Opened = ({ className = '' }: { className?: string }) => <LuLockOpen className={`${className} motion-safe:animate-lock-turn`} />

/**
 * Public / Private, in the article's title line (where Info was): a lock, closed while private. Clicking it opens the lock (a short
 * turn of it) and the privacy modal; it closes again when the modal does, unless the article was made public
 */
export default function PrivacyButton({ articleId }: { articleId: string }) {
  const [privacy, setPrivacy] = useArticlePrivacy(articleId)
  const [open, setOpen] = useState(false)
  const unlocked = open || privacy.visibility === 'public'
  return (
    <>
      <Button
        variant={open ? 'selected' : 'ghost'}
        size="sm"
        plain
        icon={unlocked ? Opened : Shut}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={privacy.visibility === 'public' ? 'Public: anyone with the link can see it' : 'Private: only you and the people you allow'}
        onClick={() => setOpen(true)}
      >
        {privacy.visibility === 'public' ? 'Public' : 'Private'}
      </Button>
      <PrivacyModal open={open} onClose={() => setOpen(false)} privacy={privacy} onChange={setPrivacy} />
    </>
  )
}
