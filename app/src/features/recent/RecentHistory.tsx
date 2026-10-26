import { useState, type CSSProperties } from 'react'
import { LuChevronDown, LuHistory } from 'react-icons/lu'
import BarPopout from '../../components/ui/overlays/BarPopout'
import Button from '../../components/ui/buttons/Button'
import RecentList from './RecentList'

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
        <Button
          variant="ghost"
          plain
          icon={LuHistory}
          aria-expanded={open}
          aria-haspopup="dialog"
          // Hovered, it takes the search field's background (--input-bg, styles/fields.css)
          style={{ '--btn-hover-bg': 'var(--input-bg)' } as CSSProperties}
          className="w-56 justify-start"
        >
          <span className="flex-1 text-start">Recent History</span>
          <LuChevronDown className={`size-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </Button>
      }
    >
      <div className="w-80">
        <RecentList place="nav-recent" limit={10} allHref="/dashboard" afterOpen={() => setOpen(false)} />
      </div>
    </BarPopout>
  )
}
