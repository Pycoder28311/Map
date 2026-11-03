import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { LuCheck, LuMessageSquareText, LuPencil, LuTrash2, LuUndo2, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import { loadMessage, removeMessage, updateMessage, useMessage } from '../messages/messagesStore'
import MessageReplies from './MessageReplies'
import { DAY_MONTH_YEAR } from '../../../lib/dates'


type Props = {
  /** The message's id; null for an old message, whose title and text are in its link (`legacy`) */
  id: number | null
  legacy?: { title: string; content: string }
  /** The words of the text the message is on (its header) */
  words: string
  /** The article it is opened in: a link to another article's message opens nothing */
  articleId: number
  /** The user can edit the article (they can then take a deleted message's link out) */
  canEditArticle: boolean
  /** How far from the text's top it opens: level with the clicked words */
  top: number
  /** Where the text's lines end at the words' height (px from the text box's left): it opens just right of that */
  textRight: number
  /** Where the words are in the text's box (their right edge and middle, px): a discreet line joins them to the panel */
  anchor?: { x: number; y: number }
  onClose: () => void
  /** Opens the Message form on these words */
  onEdit: () => void
  /** Takes the link off its words (the message was deleted) */
  onRemoveLink: () => void
}

/** The card's width, and its gap after the text (px) */
const CARD_WIDTH = 'clamp(12rem, 30%, 19rem)'
const CARD_GAP = 12

/** How far below the card's top its header's middle is (px): where the line from the words reaches the card */
const HEADER_MIDDLE = 26
/** How far under the middle of the words' line the connecting line starts (px): just under the letters */
const UNDER_WORDS = 10

/**
 * The line from the words to the card (Word's comments): a straight blue line from a small blue dot at the end of the words to the card's
 * edge, level with its header. Drawn in the same box as both (the text's), measured once the card is placed; none when the words are under the card
 */
function Connector({ anchor, top, card }: { anchor: { x: number; y: number }; top: number; card: HTMLElement | null }) {
  const [edge, setEdge] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (!card) return
    const measure = () => setEdge(card.offsetLeft)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [card, anchor.x, top])
  if (edge === null || edge - anchor.x < 12) return null
  // From just under the words' end (between two lines of text, never through the words after them)
  const from = { x: anchor.x, y: anchor.y + UNDER_WORDS }
  const to = { x: edge, y: top + HEADER_MIDDLE }
  return (
    <svg aria-hidden className="pointer-events-none absolute start-0 top-0 z-20 size-full overflow-visible">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeWidth={1.5} strokeLinecap="round" className="stroke-blue-500" />
      <circle cx={from.x} cy={from.y} r={3.5} className="fill-blue-500" />
    </svg>
  )
}

/**
 * The panel's frame: a card at the right of the text, level with the words, touching the body's right border (no gap); a line joins it to
 * the words it comes from. Its header is those words (a message's title is not shown). `menu`: the ⋯ with its actions (Edit, Done,
 * Delete), centred with the ✕ on one line
 */
function Frame({ top, textRight, anchor, words, onClose, children, menu }: { top: number; textRight: number; anchor?: Props['anchor']; words: string; onClose: () => void; children: ReactNode; menu?: TreeMenuGroup[] }) {
  const [card, setCard] = useState<HTMLElement | null>(null)
  return (
    <>
      {anchor && <Connector anchor={anchor} top={top} card={card} />}
      <aside
        ref={setCard}
        aria-label={`Message on “${words}”`}
        // Just right of where the text's lines end, a small gap after them; never past the body's right border (the text's box is inside the
        // body's padding, 1rem): with no room there, it goes over the text's right side
        style={{ top, width: CARD_WIDTH, left: `min(${textRight + CARD_GAP}px, calc(100% + 1rem - ${CARD_WIDTH}))` }}
        className="absolute z-30 flex animate-share-pop flex-col gap-2 rounded-(--card-radius) border border-line bg-surface p-3 shadow-xl"
      >
        <div className="flex items-start gap-2">
          <LuMessageSquareText className="mt-1 size-4 shrink-0 text-fg-subtle" />
          <h3 className="min-w-0 flex-1 pt-0.5 text-body break-words text-fg-muted italic">“{words}”</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            {menu && menu.length > 0 && <TreeMenu label={`More: ${words}`} groups={menu} />}
            <IconButton icon={LuX} label="Close" size="sm" onClick={onClose} />
          </div>
        </div>
        {children}
      </aside>
    </>
  )
}

/**
 * A message of the article, opened by clicking its words: a card at the right of the text, level with them, over the text's right side
 * (like the Info box's column). It is read from the server now (once: messagesStore). Its author ("Deleted user" when their account is
 * gone), its date, Done; Edit, Done / Undo and Delete as the server allows; its replies under it (they came with it). One at a time; ✕ or Esc closes it
 */
export default function MessagePanel({ id, legacy, words, articleId, canEditArticle, top, textRight, anchor, onClose, onEdit, onRemoveLink }: Props) {
  const state = useMessage(id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // An old message: what its link holds
  if (id === null || !state) {
    return (
      <Frame top={top} textRight={textRight} anchor={anchor} words={words} onClose={onClose} menu={canEditArticle ? [[{ label: 'Edit', icon: LuPencil, onClick: onEdit }]] : undefined}>
        {legacy?.content && <p className="max-h-80 overflow-y-auto text-body whitespace-pre-wrap text-fg-muted">{legacy.content}</p>}
      </Frame>
    )
  }
  if (state.status === 'loading') {
    return (
      <Frame top={top} textRight={textRight} anchor={anchor} words={words} onClose={onClose}>
        <p className="text-small text-fg-subtle">Loading…</p>
      </Frame>
    )
  }
  if (state.status === 'error') {
    return (
      <Frame top={top} textRight={textRight} anchor={anchor} words={words} onClose={onClose}>
        <p role="alert" className="text-small text-danger">
          {state.error}
        </p>
        <Button variant="secondary" size="sm" className="self-start" onClick={() => loadMessage(id, true)}>
          Try again
        </Button>
      </Frame>
    )
  }
  if (state.status === 'gone' || state.message.articleId !== articleId) {
    return (
      <Frame top={top} textRight={textRight} anchor={anchor} words={words} onClose={onClose}>
        <p className="text-small text-fg-muted">This message was deleted.</p>
        {canEditArticle && (
          <Button variant="secondary" size="sm" className="self-start" onClick={onRemoveLink}>
            Remove the link
          </Button>
        )}
      </Frame>
    )
  }

  const { message } = state
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }
  const remove = () =>
    run(async () => {
      await removeMessage(message.id)
      onRemoveLink()
    })

  return (
    <Frame
      top={top}
      textRight={textRight}
      anchor={anchor}
      words={words}
      onClose={onClose}
      menu={[
        [
          ...(message.can.edit ? [{ label: 'Edit', icon: LuPencil, onClick: onEdit }] : []),
          ...(message.can.done ? [{ label: message.done ? 'Not done' : 'Done', icon: message.done ? LuUndo2 : LuCheck, onClick: () => void run(() => updateMessage(message.id, { done: !message.done })) }] : []),
        ],
        ...(message.can.remove ? [[{ label: 'Delete', icon: LuTrash2, danger: true, onClick: () => void remove() }]] : []),
      ].filter((group) => group.length > 0)}
    >
      <p className="text-small text-fg-subtle">
        {message.author?.name ?? 'Deleted user'} · {DAY_MONTH_YEAR.format(new Date(message.createdAt))}
        {message.done && <span className="ms-1 rounded-full bg-fill px-1.5 text-fg-muted">Done</span>}
      </p>
      {message.content && <p className={`max-h-80 overflow-y-auto text-body whitespace-pre-wrap ${message.done ? 'text-fg-subtle' : 'text-fg-muted'}`}>{message.content}</p>}
      <MessageReplies message={message} />
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </Frame>
  )
}
