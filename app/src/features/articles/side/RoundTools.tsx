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
}

/** The buttons keep their size; the icon shape inside is bigger (1.5rem) */
const BIG = '[&>svg]:size-6!'

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
 * The round buttons on the article body's left edge, centred on its line, right under the banner (its height, `--banner-h`, set by the body: it follows the banner smoothly) and staying near the view's top while it scrolls: Zoom (first: the
 * article fills the window), Contents, Messages and Notes (their elements open in the left column) one at a time
 */
export default function RoundTools({ zoomed, onZoom, open, onToggle, messages, notes }: Props) {
  return (
    // As tall as the body, on its left line; the column inside stays near the view's top
    <div className="pointer-events-none absolute inset-y-0 start-0 z-30 -translate-x-1/2">
      <div className="pointer-events-auto sticky top-20 mt-[calc(var(--banner-h,11rem)+1rem)] flex flex-col gap-2 transition-[margin] duration-300 ease-out motion-reduce:transition-none">
        <IconButton round className={BIG} icon={zoomed ? LuMinimize2 : LuMaximize2} label={zoomed ? 'Leave the zoom (Esc)' : 'Zoom: the article fills the window'} aria-pressed={zoomed} onClick={onZoom} />
        <IconButton round className={BIG} icon={LuListTree} label="Contents" aria-pressed={open.has('contents')} onClick={() => onToggle('contents')} />
        <span className="relative">
          <IconButton round className={BIG} icon={LuMessagesSquare} label={`Messages (${messages})`} aria-pressed={open.has('messages')} onClick={() => onToggle('messages')} />
          <Count n={messages} />
        </span>
        <span className="relative">
          <IconButton round className={BIG} icon={LuStickyNote} label={`Notes (${notes})`} aria-pressed={open.has('notes')} onClick={() => onToggle('notes')} />
          <Count n={notes} />
        </span>
      </div>
    </div>
  )
}
