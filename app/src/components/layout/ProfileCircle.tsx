import { useState, type ComponentType, type ReactNode } from 'react'
import { LuCreditCard, LuInbox, LuLogOut, LuMessageSquareText, LuShare2, LuUser, LuUsers } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { useFollowCounts } from '../../features/follows/followStore'
import { usePendingCount } from '../../features/inbox/inboxStore'
import Avatar from '../../features/people/Avatar'
import SharePanel from '../../features/share/SharePanel'
import { startSharing, stopSharing, useShareState } from '../../features/share/shareStore'
import { authClient } from '../../lib/auth-client'
import Button from '../ui/buttons/Button'
import IconButton from '../ui/buttons/IconButton'
import Divider from '../ui/Divider'
import BarPopout from '../ui/overlays/BarPopout'

/** The menu's rows: less room at their sides than a button's (styles/buttons.css --btn-pad-x) */
const ROW_PAD = '[--btn-pad-x:0.375rem]'

/** A small faint tag at a row's right end: a count, a plan, "Soon" */
function Tag({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <span
      className={`ms-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] leading-5 font-semibold ${alert ? 'bg-danger text-white' : 'bg-fill text-fg-muted'}`}
    >
      {children}
    </span>
  )
}

type Item = { label: string; icon: ComponentType<{ className?: string }>; onClick?: () => void; tag?: ReactNode; disabled?: boolean; title?: string }

/** One row of the menu: icon, label and its tag, the whole width */
function MenuRow({ label, icon, onClick, tag, disabled, title }: Item) {
  return (
    <Button variant="ghost" plain icon={icon} disabled={disabled} title={title} className={`w-full justify-start ${ROW_PAD}`} onClick={onClick}>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{label}</span>
        {tag}
      </span>
    </Button>
  )
}

/**
 * The menu under the navbar's profile picture: View profile first (the picture big, the name big, "View profile" under it), a line, then
 * Inbox (with how many invitations wait), Followers, Share, Feedback and the billing plan, a line, and Log out. It grows out of the bar
 * like the navbar's other popouts (BarPopout), stuck to its right end
 */
function ProfileMenu({ user, onClose }: { user: { id: string; name: string; email: string; image?: string | null }; onClose: () => void }) {
  const navigate = useNavigate()
  const pending = usePendingCount()
  const counts = useFollowCounts()
  const [signingOut, setSigningOut] = useState(false)
  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  const items: Item[] = [
    { label: 'Inbox', icon: LuInbox, onClick: () => go('/inbox'), tag: pending > 0 ? <Tag alert>{pending > 99 ? '99+' : pending}</Tag> : null },
    { label: 'Followers', icon: LuUsers, onClick: () => go('/profile#people'), tag: counts ? <Tag>{counts.followers}</Tag> : null },
    {
      label: 'Share',
      icon: LuShare2,
      onClick: () => {
        onClose()
        startSharing()
      },
    },
    // Not made yet
    { label: 'Feedback', icon: LuMessageSquareText, disabled: true, title: 'Send feedback (soon)', tag: <Tag>Soon</Tag> },
    { label: 'Billing plan', icon: LuCreditCard, disabled: true, title: 'Plans and billing (soon)', tag: <Tag>Free</Tag> },
  ]

  const signOut = async () => {
    setSigningOut(true)
    await authClient.signOut()
    onClose()
    navigate('/sign-in', { replace: true })
  }

  return (
    <nav aria-label="Your account" className="flex w-72 flex-col p-1">
      {/* View profile: the picture and the name big, the action small under the name */}
      <Button variant="ghost" plain className={`w-full justify-start ${ROW_PAD}`} onClick={() => go('/profile')}>
        <span className="flex min-w-0 flex-1 items-center gap-3 py-1 text-start">
          <Avatar person={{ id: user.id, name: user.name, image: user.image ?? null }} size="size-12" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-heading font-semibold text-fg">{user.name}</span>
            <span className="truncate text-small font-normal text-fg-subtle">View profile</span>
          </span>
        </span>
      </Button>
      <Divider />
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <MenuRow key={item.label} {...item} />
        ))}
      </div>
      <Divider />
      <MenuRow label={signingOut ? 'Logging out…' : 'Log out'} icon={LuLogOut} disabled={signingOut} onClick={() => void signOut()} />
    </nav>
  )
}

/** The signed-in user's picture (or a person icon) in the navbar, with a red dot while invitations wait: a click opens their menu (ProfileMenu) */
export default function ProfileCircle() {
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const pending = usePendingCount()
  // Sharing (the menu's Share): the popout shows "Choose what to share", then the ways to share; closing it ends share mode
  const sharing = useShareState().phase !== 'idle'
  const user = session?.user
  if (!user) return null
  const shown = open || sharing
  return (
    <BarPopout
      mode="click"
      stick="end"
      open={shown}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) stopSharing()
      }}
      trigger={
        <span className="relative inline-flex">
          <IconButton label={pending > 0 ? `Your account: ${pending} invitations waiting` : 'Your account'} aria-haspopup="menu" aria-expanded={shown} variant={shown ? 'selected' : 'ghost'}>
            <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fill text-fg-muted ring-1 ring-line">
              {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : <LuUser aria-hidden className="size-5" />}
            </span>
          </IconButton>
          {/* Invitations waiting (the Inbox is in the menu) */}
          {pending > 0 && <span aria-hidden className="pointer-events-none absolute top-1 right-1 size-2.5 rounded-full bg-danger ring-2 ring-surface" />}
        </span>
      }
    >
      {sharing ? <SharePanel /> : open && <ProfileMenu user={user} onClose={() => setOpen(false)} />}
    </BarPopout>
  )
}
