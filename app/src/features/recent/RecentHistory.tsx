import { useState } from 'react'
import { LuChevronDown, LuHistory } from 'react-icons/lu'
import BarPopout from '../../components/ui/overlays/BarPopout'
import RecentList from './RecentList'

// Full class strings so Tailwind can detect them at build time.
const PILL =
  'inline-flex w-56 cursor-pointer items-center gap-2 rounded-full bg-surface-muted px-4 py-1.5 text-body text-fg-muted ' +
  'transition-colors hover:bg-fill hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/**
 * The navbar's centre: a "Recent History" pill; a click opens what was opened lately (the last 10,
 * "Show all" on the Dashboard) in a popout growing out of the bar. Opening a row closes it.
 */
export default function RecentHistory() {
  const [open, setOpen] = useState(false)
  return (
    <BarPopout
      mode="click"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type="button" aria-expanded={open} aria-haspopup="dialog" className={PILL}>
          <LuHistory className="size-(--btn-icon-size) shrink-0" aria-hidden />
          <span className="flex-1 text-start">Recent History</span>
          <LuChevronDown className={`size-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      }
    >
      <div className="w-80">
        <RecentList place="nav-recent" limit={10} allHref="/dashboard" afterOpen={() => setOpen(false)} />
      </div>
    </BarPopout>
  )
}
