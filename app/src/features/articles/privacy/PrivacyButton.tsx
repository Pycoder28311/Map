import { useState } from 'react'
import { LuLock, LuLockOpen } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import BarPopover from '../../../components/ui/overlays/BarPopover'
import PrivacyPanel from './PrivacyPanel'
import { useArticlePrivacy } from './privacyStore'

// The lock's two icons: switching between them draws the icon again, so it turns once as it opens or closes
const Shut = ({ className = '' }: { className?: string }) => <LuLock className={`${className} motion-safe:animate-lock-turn`} />
const Opened = ({ className = '' }: { className?: string }) => <LuLockOpen className={`${className} motion-safe:animate-lock-turn`} />

/**
 * Public / Private, in the article's title line (where Info was): a lock, closed while private. Clicking it opens the lock (a short
 * turn of it) and a popup under it (PrivacyPanel); it closes again when the popup does, unless the article was made public
 */
export default function PrivacyButton({ articleId }: { articleId: string }) {
  const [privacy, setPrivacy] = useArticlePrivacy(articleId)
  const [open, setOpen] = useState(false)
  const unlocked = open || privacy.visibility === 'public'
  return (
    // Its own positioned box, so the popup hangs from this button (its right edge on the button's, growing to the left), not from the title line
    <div className="relative z-30">
      <BarPopover
        label="Who can see this article"
        open={open}
        onOpenChange={setOpen}
        align="end"
        width="w-72"
        overflow
        trigger={
          <Button
            variant={open ? 'selected' : 'ghost'}
            size="sm"
            plain
            icon={unlocked ? Opened : Shut}
            aria-haspopup="dialog"
            aria-expanded={open}
            title={privacy.visibility === 'public' ? 'Public: anyone with the link can see it' : 'Private: only you and the people you allow'}
            onClick={() => setOpen(!open)}
          >
            {privacy.visibility === 'public' ? 'Public' : 'Private'}
          </Button>
        }
      >
        <PrivacyPanel privacy={privacy} onChange={setPrivacy} />
      </BarPopover>
    </div>
  )
}
