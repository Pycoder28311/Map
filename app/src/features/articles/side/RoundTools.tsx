import { LuListTree, LuMaximize2, LuMessagesSquare, LuMinimize2, LuStickyNote } from 'react-icons/lu'
import IconButton from '../../../components/ui/buttons/IconButton'

/** The elements of the left column the round buttons open */
export type SidePart = 'contents' | 'messages' | 'notes'

type Props = {
  zoomed: boolean
  onZoom: () => void
  /** Which elements are open */
  open: Set<SidePart>
  onToggle: (part: SidePart) => void
  messages: number
  notes: number
  /** The page is narrow: Contents is not shown by itself, so it gets its own button too */
  narrow: boolean
}

/** A count on a round button's corner */
function Count({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <span aria-hidden className="pointer-events-none absolute -end-1 -top-1 min-w-4 rounded-full bg-fg px-1 text-center text-[0.625rem] leading-4 font-medium text-surface">
      {n > 99 ? '99+' : n}
    </span>
  )
}

/**
 * The round buttons on the article body's left edge, centred on its line and in the middle of the view while it scrolls: Zoom (the
 * article fills the window), Messages and Notes (their elements open in the left column under Contents); on a narrow page Contents too
 */
export default function RoundTools({ zoomed, onZoom, open, onToggle, messages, notes, narrow }: Props) {
  return (
    // As tall as the body, on its left line; the column inside stays in the middle of the view
    <div className="pointer-events-none absolute inset-y-0 start-0 z-30 -translate-x-1/2">
      <div className="pointer-events-auto sticky top-[calc(50vh-4.5rem)] mt-24 flex flex-col gap-2">
        <IconButton round icon={zoomed ? LuMinimize2 : LuMaximize2} label={zoomed ? 'Leave the zoom (Esc)' : 'Zoom: the article fills the window'} aria-pressed={zoomed} onClick={onZoom} />
        {narrow && <IconButton round icon={LuListTree} label="Contents" aria-pressed={open.has('contents')} onClick={() => onToggle('contents')} />}
        <span className="relative">
          <IconButton round icon={LuMessagesSquare} label={`Messages (${messages})`} aria-pressed={open.has('messages')} onClick={() => onToggle('messages')} />
          <Count n={messages} />
        </span>
        <span className="relative">
          <IconButton round icon={LuStickyNote} label={`Notes (${notes})`} aria-pressed={open.has('notes')} onClick={() => onToggle('notes')} />
          <Count n={notes} />
        </span>
      </div>
    </div>
  )
}
