import { useEffect, useState, type ReactNode } from 'react'
import { LuCheck, LuMessageSquareText, LuPencil, LuTrash2, LuUndo2, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import { loadMessage, removeMessage, updateMessage, useMessage } from '../messages/messagesStore'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

type Props = {
  /** The message's id; null for an old message, whose title and text are in its link (`legacy`) */
  id: number | null
  legacy?: { title: string; content: string }
  /** The article it is opened in: a link to another article's message opens nothing */
  articleId: number
  /** The user can edit the article (they can then take a deleted message's link out) */
  canEditArticle: boolean
  /** How far from the text's top it opens: level with the clicked words */
  top: number
  /** Where the words are in the text's box (their right edge and middle, px): a discreet line joins them to the panel */
  anchor?: { x: number; y: number }
  onClose: () => void
  /** Opens the Message form on these words */
  onEdit: () => void
  /** Takes the link off its words (the message was deleted) */
  onRemoveLink: () => void
}

/**
 * The panel's frame: a card at the right of the text, level with the words, touching the body's right border (no gap) and wide; a thin dashed
 * line joins it to the words it comes from. `menu`: the ⋯ with its actions (Edit, Done, Delete)
 */
function Frame({ top, anchor, title, onClose, children, menu }: { top: number; anchor?: Props['anchor']; title: string; onClose: () => void; children: ReactNode; menu?: TreeMenuGroup[] }) {
  return (
    <>
      {anchor && <span aria-hidden style={{ top: anchor.y, left: anchor.x }} className="pointer-events-none absolute -end-4 z-20 border-t border-dashed border-line-strong opacity-70" />}
      <aside
        aria-label={`Message: ${title}`}
        style={{ top }}
        // (the text's box is inside the body's padding: -end-4 reaches the body's border)
        className="absolute -end-4 z-30 flex w-[clamp(14rem,42%,26rem)] animate-share-pop flex-col gap-2 rounded-s-(--card-radius) border border-e-0 border-line bg-surface p-3 shadow-xl"
      >
        <div className="flex items-start gap-2">
          <LuMessageSquareText className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <h3 className="min-w-0 flex-1 text-body font-medium break-words">{title}</h3>
          {menu && menu.length > 0 && <TreeMenu label={`More: ${title}`} groups={menu} />}
          <IconButton icon={LuX} label="Close" size="sm" onClick={onClose} />
        </div>
        {children}
      </aside>
    </>
  )
}

/**
 * A message of the article, opened by clicking its words: a card at the right of the text, level with them, over the text's right side
 * (like the Info box's column). It is read from the server now (once: messagesStore). Its author ("Deleted user" when their account is
 * gone), its date, Done; Edit, Done / Undo and Delete as the server allows. One at a time; ✕ or Esc closes it
 */
export default function MessagePanel({ id, legacy, articleId, canEditArticle, top, anchor, onClose, onEdit, onRemoveLink }: Props) {
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
      <Frame top={top} anchor={anchor} title={legacy?.title || 'Message'} onClose={onClose} menu={canEditArticle ? [[{ label: 'Edit', icon: LuPencil, onClick: onEdit }]] : undefined}>
        {legacy?.content && <p className="max-h-80 overflow-y-auto text-body whitespace-pre-wrap text-fg-muted">{legacy.content}</p>}
      </Frame>
    )
  }
  if (state.status === 'loading') {
    return (
      <Frame top={top} anchor={anchor} title="Message" onClose={onClose}>
        <p className="text-small text-fg-subtle">Loading…</p>
      </Frame>
    )
  }
  if (state.status === 'error') {
    return (
      <Frame top={top} anchor={anchor} title="Message" onClose={onClose}>
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
      <Frame top={top} anchor={anchor} title="Message" onClose={onClose}>
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
      title={message.title || 'Message'}
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
        {message.author?.name ?? 'Deleted user'} · {DATE.format(new Date(message.createdAt))}
        {message.done && <span className="ms-1 rounded-full bg-fill px-1.5 text-fg-muted">Done</span>}
      </p>
      {message.content && <p className={`max-h-80 overflow-y-auto text-body whitespace-pre-wrap ${message.done ? 'text-fg-subtle' : 'text-fg-muted'}`}>{message.content}</p>}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </Frame>
  )
}
