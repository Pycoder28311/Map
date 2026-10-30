import type { ShareableName, Visibility } from '@map/shared'
import { useState } from 'react'
import { LuLock, LuLockOpen } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import BarPopover from '../../components/ui/overlays/BarPopover'
import PrivacyPanel from './PrivacyPanel'
import { useSharing } from './sharing'

// The lock's two icons: switching between them draws the icon again, so it turns once as it opens or closes
const Shut = ({ className = '' }: { className?: string }) => <LuLock className={`${className} motion-safe:animate-lock-turn`} />
const Opened = ({ className = '' }: { className?: string }) => <LuLockOpen className={`${className} motion-safe:animate-lock-turn`} />

type Props = {
  /** The row's table and id */
  objectType: ShareableName
  objectId: number
  /** Its visibility as its owner's copy of it says (no read) */
  visibility: Visibility
  /** Its kind, e.g. "article" */
  what: string
}

/**
 * Public / Private, for the owner of a shared row (the article's title line, a note's editor): a lock, closed while private. Clicking it
 * opens the lock (a short turn of it) and a popup under it (PrivacyPanel), which reads the row's people; it closes again when the popup
 * does, unless the row was made public
 */
export default function PrivacyButton({ objectType, objectId, visibility, what }: Props) {
  const sharing = useSharing(objectType, objectId, visibility)
  const [open, setOpen] = useState(false)
  const unlocked = open || sharing.visibility === 'public'
  return (
    // Its own positioned box, so the popup hangs from this button (its right edge on the button's, growing to the left), not from the title line
    <div className="relative z-30">
      <BarPopover
        label={`Who can see this ${what}`}
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
            title={sharing.visibility === 'public' ? 'Public: everyone signed in who has the link can read it' : 'Private: only you and the people you allow'}
            onClick={() => setOpen(!open)}
          >
            {sharing.visibility === 'public' ? 'Public' : 'Private'}
          </Button>
        }
      >
        {open && <PrivacyPanel sharing={sharing} what={what} />}
      </BarPopover>
    </div>
  )
}
