import type { Comment } from '@map/shared'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Button from '../../../components/ui/buttons/Button'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import InputBox from '../../../components/ui/fields/InputBox'
import Modal from '../../../components/ui/overlays/Modal'
import CommentCard from './CommentCard'
import CommentModal, { type CommentTarget } from './CommentModal'
import { useCommentsStore } from './commentsStore'

/**
 * The comments below an article (docs/plans/37), in every view: a "Comments" heading, the "Write a comment…" box (it opens the modal),
 * the top comments as cards (newest first) and "Show more". Nothing is read until the section comes near the screen: a reader who never
 * scrolls to it costs no request
 */
export default function CommentsSection({ articleId }: { articleId: number }) {
  const [store, state] = useCommentsStore(articleId)
  const [target, setTarget] = useState<CommentTarget | null>(null)
  const [deleting, setDeleting] = useState<Comment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const root = useRef<HTMLElement>(null)

  // The first page when the section is about to be seen (once: the store reads a page only once)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const watcher = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        watcher.disconnect()
        void store.loadTop()
      },
      { rootMargin: '200px' },
    )
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [store])

  const remove = async (comment: Comment) => {
    setDeleting(null)
    setError(null)
    try {
      await store.remove(comment)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The comment could not be deleted.')
    }
  }
  // A comment with replies asks first (they go with it)
  const askDelete = (comment: Comment) => (comment.replyCount > 0 ? setDeleting(comment) : void remove(comment))
  const openNew = () => setTarget({ kind: 'new' })
  const onBoxKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openNew()
    }
  }

  if (state.gone) {
    return (
      <section aria-label="Comments" className="flex flex-col gap-2 border-t border-line pt-4">
        <h2 className="text-body font-medium">Comments</h2>
        <p className="text-small text-fg-muted">The comments can't be shown: this article can no longer be read.</p>
      </section>
    )
  }

  const { top } = state
  return (
    <section ref={root} aria-label="Comments" className="flex flex-col gap-3 border-t border-line pt-4">
      <h2 className="text-body font-medium">Comments</h2>
      {/* Looks like a field; it is the button that opens the modal */}
      <InputBox as="div" role="button" tabIndex={0} onClick={openNew} onKeyDown={onBoxKey} className="cursor-text text-body text-fg-subtle">
        {store.draft('new') ? <span className="truncate text-fg-muted">{store.draft('new')}</span> : 'Write a comment…'}
      </InputBox>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      {top.ids.length > 0 && (
        <ol className="flex flex-col gap-3">
          {top.ids.map((id) =>
            state.comments[id] ? (
              <li key={id} className="rounded-(--card-radius) border border-line bg-surface p-3">
                <CommentCard
                  comment={state.comments[id]}
                  store={store}
                  state={state}
                  onReply={(to) => setTarget({ kind: 'reply', to })}
                  onEdit={(comment) => setTarget({ kind: 'edit', comment })}
                  onDelete={askDelete}
                />
              </li>
            ) : null,
          )}
        </ol>
      )}
      {top.loading && <p className="text-small text-fg-subtle">Loading comments…</p>}
      {top.error && (
        <p role="alert" className="text-small text-danger">
          {top.error} <LinkButton onClick={() => void store.loadTop()}>Try again</LinkButton>
        </p>
      )}
      {top.loaded && !top.loading && top.ids.length === 0 && <p className="text-small text-fg-subtle">No comments yet.</p>}
      {top.cursor && !top.loading && (
        <LinkButton className="self-start" onClick={() => void store.loadTop()}>
          Show more comments
        </LinkButton>
      )}
      <CommentModal store={store} target={target} onClose={() => setTarget(null)} />
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this comment?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" filled onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button danger onClick={() => deleting && void remove(deleting)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-body">Its {deleting?.replyCount === 1 ? 'reply goes' : 'replies go'} with it, and everything under them.</p>
      </Modal>
    </section>
  )
}
