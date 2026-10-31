import { COMMENT_DEPTH, COMMENT_MAX, type Comment } from '@map/shared'
import { useState, type FormEvent } from 'react'
import Button from '../../../components/ui/buttons/Button'
import TextAreaField from '../../../components/ui/fields/TextAreaField'
import Modal from '../../../components/ui/overlays/Modal'
import { ApiError } from '../../../lib/api/client'
import type { CommentsStore } from './commentsStore'

/** What the modal writes: a new comment, a reply to one, or a change of one */
export type CommentTarget = { kind: 'new' } | { kind: 'reply'; to: Comment } | { kind: 'edit'; comment: Comment }

const keyOf = (target: CommentTarget) => (target.kind === 'new' ? 'new' : target.kind === 'reply' ? `reply:${target.to.id}` : `edit:${target.comment.id}`)
const nameOf = (comment: Comment) => comment.author?.name ?? 'Deleted user'

/** The text the field opens with: the draft kept, the comment's own text (Edit), or `@name` (a reply to the last level goes beside it) */
function startText(store: CommentsStore, target: CommentTarget) {
  const draft = store.draft(keyOf(target))
  if (draft) return draft
  if (target.kind === 'edit') return target.comment.content
  if (target.kind === 'reply' && target.to.depth >= COMMENT_DEPTH && target.to.author) return `@${target.to.author.name} `
  return ''
}

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return 'Too many comments, wait a minute.'
  if (error instanceof ApiError && error.status === 404) return 'This article, or the comment, is no longer there.'
  return error instanceof Error ? error.message : 'Something went wrong'
}

/** The form inside the modal: mounted while it is open, so it starts from the target's text each time */
function CommentForm({ store, target, onDone }: { store: CommentsStore; target: CommentTarget; onDone: () => void }) {
  const [text, setText] = useState(() => startText(store, target))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = keyOf(target)
  const unchanged = target.kind === 'edit' && text.trim() === target.comment.content

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const content = text.trim()
    if (!content || busy || unchanged) return
    setBusy(true)
    setError(null)
    try {
      if (target.kind === 'edit') await store.edit(target.comment.id, content)
      else await store.post(content, target.kind === 'reply' ? target.to : undefined)
      store.setDraft(key, '')
      onDone()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {target.kind === 'reply' && (
        <blockquote className="border-s-2 border-line ps-2 text-small text-fg-subtle">
          <span className="font-medium text-fg-muted">{nameOf(target.to)}</span>
          <span className="line-clamp-3 break-words whitespace-pre-wrap">{target.to.content}</span>
        </blockquote>
      )}
      <TextAreaField
        label={target.kind === 'reply' ? 'Reply' : 'Comment'}
        placeholder={target.kind === 'reply' ? 'Write a reply…' : 'Write a comment…'}
        data-autofocus
        rows={4}
        maxLength={COMMENT_MAX}
        value={text}
        // The caret after the text (after an `@name`, or at the end of the comment being edited)
        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
        onChange={(e) => {
          setText(e.target.value)
          store.setDraft(key, target.kind === 'edit' && e.target.value === target.comment.content ? '' : e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submit()
        }}
        className="max-h-[50vh] min-h-24"
      />
      <div className="flex items-center gap-3">
        {error ? (
          <p role="alert" className="min-w-0 flex-1 text-small text-danger">
            {error}
          </p>
        ) : (
          <span className="flex-1 text-small text-fg-subtle">{text.length > COMMENT_MAX * 0.9 ? `${COMMENT_MAX - text.length} left` : ''}</span>
        )}
        <Button variant="text" size="sm" type="submit" disabled={!text.trim() || busy || unchanged}>
          {busy ? 'Posting…' : target.kind === 'edit' ? 'Save' : 'Post'}
        </Button>
      </div>
    </form>
  )
}

/**
 * The modal comments are written in (docs/plans/37): a new comment ("Write a comment…" under the article), a reply ("Replying to …"),
 * or a change of one ("Edit comment"). Its small underlined Post (Save when editing) is off while the text is empty or being sent; Ctrl
 * / ⌘ + Enter posts too. Closed without posting, what was written is kept for the next time it opens on the same thing
 */
export default function CommentModal({ store, target, onClose }: { store: CommentsStore; target: CommentTarget | null; onClose: () => void }) {
  const title = !target ? '' : target.kind === 'edit' ? 'Edit comment' : target.kind === 'reply' ? `Reply to ${nameOf(target.to)}` : 'Write a comment'
  return (
    <Modal open={!!target} onClose={onClose} title={title} size="md">
      {target && <CommentForm key={keyOf(target)} store={store} target={target} onDone={onClose} />}
    </Modal>
  )
}
