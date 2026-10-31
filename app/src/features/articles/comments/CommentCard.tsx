import type { Comment } from '@map/shared'
import { LuPencil, LuTrash2, LuUserRound } from 'react-icons/lu'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import { Avatar } from '../../sharing/PrivacyPanel'
import { EMPTY_THREAD, type CommentsState, type CommentsStore } from './commentsStore'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

type Props = {
  comment: Comment
  store: CommentsStore
  state: CommentsState
  onReply: (comment: Comment) => void
  onEdit: (comment: Comment) => void
  onDelete: (comment: Comment) => void
}

const repliesLabel = (n: number) => (n === 1 ? 'Show 1 reply' : `Show ${n} replies`)

/**
 * A comment below the article, like a social-media post (docs/plans/37): its author's picture and name ("Deleted user"), its date,
 * "edited", its text, Reply and ⋯ (Edit, Delete) as the server allows. "Show 3 replies" reads its replies (oldest first) and shows them
 * under it, one indent in, each a CommentCard again (up to the last level, where a Reply goes beside it)
 */
export default function CommentCard({ comment, store, state, onReply, onEdit, onDelete }: Props) {
  const open = !!state.open[comment.id]
  const thread = state.replies[comment.id] ?? EMPTY_THREAD
  const name = comment.author?.name ?? 'Deleted user'
  const menu = [
    comment.can.edit ? [{ label: 'Edit', icon: LuPencil, onClick: () => onEdit(comment) }] : [],
    comment.can.remove ? [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: () => onDelete(comment) }] : [],
  ].filter((group) => group.length > 0)

  return (
    <article aria-label={`Comment of ${name}`} className="flex gap-2">
      {comment.author ? (
        <Avatar person={comment.author} size="size-8" />
      ) : (
        <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-fill text-fg-subtle">
          <LuUserRound className="size-4" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-small text-fg-subtle">
            <span className="font-medium text-fg">{name}</span> · <time dateTime={comment.createdAt}>{DATE.format(new Date(comment.createdAt))}</time>
            {comment.edited && <span title={`Edited ${DATE.format(new Date(comment.updatedAt))}`}> · edited</span>}
          </p>
          {menu.length > 0 && <TreeMenu label={`More: comment of ${name}`} groups={menu} />}
        </header>
        <p className="text-body break-words whitespace-pre-wrap text-fg">{comment.content}</p>
        <div className="flex items-center gap-4">
          <LinkButton onClick={() => onReply(comment)}>Reply</LinkButton>
          {comment.replyCount > 0 && (
            <LinkButton aria-expanded={open} onClick={() => store.toggle(comment.id)}>
              {open ? 'Hide replies' : repliesLabel(comment.replyCount)}
            </LinkButton>
          )}
        </div>
        {open && (
          // One indent in for each level (there are five at most); less on a phone
          <div className="mt-1 flex flex-col gap-3 border-s border-line ps-2 sm:ps-4">
            {thread.ids.map((id) =>
              state.comments[id] ? <CommentCard key={id} comment={state.comments[id]} store={store} state={state} onReply={onReply} onEdit={onEdit} onDelete={onDelete} /> : null,
            )}
            {thread.loading && <p className="text-small text-fg-subtle">Loading…</p>}
            {thread.error && (
              <p role="alert" className="text-small text-danger">
                {thread.error} <LinkButton onClick={() => void store.loadReplies(comment.id)}>Try again</LinkButton>
              </p>
            )}
            {thread.cursor && !thread.loading && (
              <LinkButton className="self-start" onClick={() => void store.loadReplies(comment.id)}>
                More replies
              </LinkButton>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
