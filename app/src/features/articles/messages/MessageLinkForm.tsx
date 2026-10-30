import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import Button from '../../../components/ui/buttons/Button'
import { LINK_EDIT, setArticleLink } from '../links/linkExtensions'
import { MessageForm } from '../links/LinkForms'
import type { ArticleLink } from '../links/linkHref'
import { createMessage, loadMessage, updateMessage, useMessage } from './messagesStore'

type Props = {
  editor: Editor
  articleId: number
  /** The message link the selection is on, if it is one */
  link: Extract<ArticleLink, { kind: 'msg' }> | null
  /** The form is done (it closes) */
  onDone: () => void
  /** Takes the link off the words (the message stays: it shows under "Not in the text") */
  onRemove?: () => void
}

/**
 * Puts a message link on words that were selected when the form opened: they must still be there (the text may change while the message
 * is being saved). Otherwise the message is kept, and found under "Not in the text"
 */
function placeOn(editor: Editor, at: { from: number; to: number; words: string }, id: number) {
  const { doc } = editor.state
  if (at.to > doc.content.size || doc.textBetween(at.from, at.to, ' ') !== at.words) {
    throw new Error('The words changed while the message was being saved. It is kept: place it from "Not in the text" in Messages.')
  }
  editor.chain().setTextSelection({ from: at.from, to: at.to }).setMeta(LINK_EDIT, true).run()
  setArticleLink(editor, { kind: 'msg', id })
}

/**
 * The link row's Message form (docs/plans/34): on new words it writes a message (one request) and links the words to it; on a message
 * link it reads that message (once) and saves its changes (its author only); on an old message (its text in the link) it makes it a
 * message and links the words to that
 */
export default function MessageLinkForm({ editor, articleId, link, onDone, onRemove }: Props) {
  // The words the form is for, as they were when it opened
  const [at] = useState(() => {
    const { from, to } = editor.state.selection
    return { from, to, words: editor.state.doc.textBetween(from, to, ' ') }
  })
  const state = useMessage(link?.id ?? null)

  const create = async (title: string, content: string) => {
    const message = await createMessage(articleId, title, content)
    placeOn(editor, at, message.id)
    onDone()
  }

  if (!link || link.id === null) {
    return <MessageForm title={link?.legacy.title} content={link?.legacy.content} onApply={create} onRemove={onRemove} />
  }
  if (!state || state.status === 'loading') return <p className="text-small text-fg-subtle">Loading…</p>
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-small text-danger">
          {state.error}
        </p>
        <Button variant="secondary" size="sm" onClick={() => loadMessage(link.id, true)}>
          Try again
        </Button>
      </div>
    )
  }
  if (state.status === 'gone' || state.message.articleId !== articleId) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-small text-fg-muted">This message was deleted.</p>
        {onRemove && (
          <Button variant="secondary" size="sm" onClick={onRemove}>
            Remove the link
          </Button>
        )}
      </div>
    )
  }
  const { message } = state
  return (
    <MessageForm
      key={message.id}
      title={message.title}
      content={message.content}
      note={message.can.edit ? undefined : 'Only its author can change this message.'}
      onApply={async (title, content) => {
        await updateMessage(message.id, { title, content })
        onDone()
      }}
      onRemove={onRemove}
    />
  )
}
