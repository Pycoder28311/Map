import { MESSAGE_REPLY_MAX, type Message, type MessageReply } from '@map/shared'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { LuPencil, LuTrash2 } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import TextAreaField from '../../../components/ui/fields/TextAreaField'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import { addReply, loadEarlierReplies, removeReply, updateReply } from '../messages/messagesStore'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** Ctrl / ⌘ + Enter sends the field's form */
const sendOnCtrlEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    e.currentTarget.form?.requestSubmit()
  }
}

/** A text field in a thin box with its button at the right (the reply field, and a reply being edited) */
function ReplyForm({ value, onChange, onSubmit, label, button, busy, onCancel, autoFocus }: { value: string; onChange: (v: string) => void; onSubmit: () => void; label: string; button: string; busy: boolean; onCancel?: () => void; autoFocus?: boolean }) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim() && !busy) onSubmit()
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-(--card-radius) border border-line px-2 py-1">
      <TextAreaField label={label} placeholder={`${label}…`} value={value} maxLength={MESSAGE_REPLY_MAX} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onKeyDown={sendOnCtrlEnter} className="max-h-32 min-w-0 flex-1 py-1" />
      {onCancel && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button variant="secondary" size="sm" type="submit" disabled={!value.trim() || busy}>
        {button}
      </Button>
    </form>
  )
}

/**
 * The replies under a message (docs/plans/37): oldest first, the earlier ones read when "Earlier replies" is pressed (the newest came with
 * the message). Each with its author ("Deleted user"), its date and ⋯ Edit / Delete as the server allows. The article's editors write
 * them in the field under the list
 */
export default function MessageReplies({ message }: { message: Message }) {
  // The server's order is newest first
  const replies = [...(message.replies ?? [])].reverse()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (replies.length === 0 && !message.can.reply) return null

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
  const menuOf = (reply: MessageReply) =>
    [
      reply.can.edit ? [{ label: 'Edit', icon: LuPencil, onClick: () => setEditing({ id: reply.id, text: reply.content }) }] : [],
      reply.can.remove ? [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: () => void run(() => removeReply(message.id, reply.id)) }] : [],
    ].filter((group) => group.length > 0)

  return (
    <section aria-label="Replies" className="flex flex-col gap-2 border-t border-line pt-2">
      {message.repliesCursor && (
        <LinkButton className="self-start" disabled={busy} onClick={() => void run(() => loadEarlierReplies(message.id))}>
          Earlier replies
        </LinkButton>
      )}
      {replies.length > 0 && (
        <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {replies.map((reply) => {
            const menu = menuOf(reply)
            return (
              <li key={reply.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <p className="min-w-0 flex-1 truncate text-small text-fg-subtle">
                    <span className="font-medium text-fg-muted">{reply.author?.name ?? 'Deleted user'}</span> · {DATE.format(new Date(reply.createdAt))}
                  </p>
                  {menu.length > 0 && editing?.id !== reply.id && <TreeMenu label={`More: reply of ${reply.author?.name ?? 'Deleted user'}`} groups={menu} />}
                </div>
                {editing?.id === reply.id ? (
                  <ReplyForm
                    label="Edit reply"
                    button="Save"
                    value={editing.text}
                    onChange={(text) => setEditing({ id: reply.id, text })}
                    busy={busy}
                    autoFocus
                    onCancel={() => setEditing(null)}
                    onSubmit={() => void run(async () => {
                      await updateReply(message.id, reply.id, editing.text.trim())
                      setEditing(null)
                    })}
                  />
                ) : (
                  <p className="text-body break-words whitespace-pre-wrap text-fg-muted">{reply.content}</p>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {message.can.reply && (
        <ReplyForm
          label="Reply"
          button="Reply"
          value={draft}
          onChange={setDraft}
          busy={busy}
          onSubmit={() => void run(async () => {
            await addReply(message.id, draft.trim())
            setDraft('')
          })}
        />
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
