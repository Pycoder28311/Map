import { useState } from 'react'
import { LuChevronDown, LuHistory } from 'react-icons/lu'
import BarPopout from '../../components/ui/overlays/BarPopout'
import { TREE_ROW_LOOK } from '../../components/ui/rowStyles'
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
        // A sidebar object's look (ui-field-row), as tall as the search field; not a Button, so it is one of the clicked-but-not-buttons
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`${TREE_ROW_LOOK} inline-flex h-(--field-h) w-56 cursor-pointer items-center gap-base px-base text-body`}
        >
          <LuHistory className="size-4 shrink-0" aria-hidden />
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
