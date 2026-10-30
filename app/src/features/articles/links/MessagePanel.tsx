import { useEffect, useState, type ReactNode } from 'react'
import { LuCheck, LuMessageSquareText, LuPencil, LuTrash2, LuUndo2, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
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
  onClose: () => void
  /** Opens the Message form on these words */
  onEdit: () => void
  /** Takes the link off its words (the message was deleted) */
  onRemoveLink: () => void
}

/** The panel's frame: a card at the right of the text, level with the words */
function Frame({ top, title, onClose, children, tools }: { top: number; title: string; onClose: () => void; children: ReactNode; tools?: ReactNode }) {
  return (
    <aside
      aria-label={`Message: ${title}`}
      style={{ top }}
      className="absolute end-0 z-30 flex w-[clamp(12rem,35%,18rem)] animate-share-pop flex-col gap-2 rounded-(--card-radius) border border-line bg-surface p-3 shadow-xl"
    >
      <div className="flex items-start gap-2">
        <LuMessageSquareText className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <h3 className="min-w-0 flex-1 text-body font-medium break-words">{title}</h3>
        {tools}
        <IconButton icon={LuX} label="Close" size="sm" onClick={onClose} />
      </div>
      {children}
    </aside>
  )
}

/**
 * A message of the article, opened by clicking its words: a card at the right of the text, level with them, over the text's right side
 * (like the Info box's column). It is read from the server now (once: messagesStore). Its author ("Deleted user" when their account is
 * gone), its date, Done; Edit, Done / Undo and Delete as the server allows. One at a time; ✕ or Esc closes it
 */
export default function MessagePanel({ id, legacy, articleId, canEditArticle, top, onClose, onEdit, onRemoveLink }: Props) {
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
      <Frame top={top} title={legacy?.title || 'Message'} onClose={onClose} tools={canEditArticle && <IconButton icon={LuPencil} label="Edit the message" size="sm" onClick={onEdit} />}>
        {legacy?.content && <p className="max-h-80 overflow-y-auto text-body whitespace-pre-wrap text-fg-muted">{legacy.content}</p>}
      </Frame>
    )
  }
  if (state.status === 'loading') {
    return (
      <Frame top={top} title="Message" onClose={onClose}>
        <p className="text-small text-fg-subtle">Loading…</p>
      </Frame>
    )
  }
  if (state.status === 'error') {
    return (
      <Frame top={top} title="Message" onClose={onClose}>
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
      <Frame top={top} title="Message" onClose={onClose}>
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
      tools={
        <>
          {message.can.edit && <IconButton icon={LuPencil} label="Edit the message" size="sm" disabled={busy} onClick={onEdit} />}
          {message.can.done && (
            <IconButton
              icon={message.done ? LuUndo2 : LuCheck}
              label={message.done ? 'Not done' : 'Done'}
              size="sm"
              disabled={busy}
              onClick={() => void run(() => updateMessage(message.id, { done: !message.done }))}
            />
          )}
          {message.can.remove && <IconButton icon={LuTrash2} label="Delete the message" size="sm" disabled={busy} onClick={() => void remove()} />}
        </>
      }
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
