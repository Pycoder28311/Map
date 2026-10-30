import { MESSAGE_EXCLUDE_MAX, previewOf, type Message } from '@map/shared'
import { useEditorState, type Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuMessageSquareText, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import { messagesApi } from '../../../lib/api/messages'
import { linkRanges, type LinkRange } from '../links/docLinks'
import { setArticleLink } from '../links/linkExtensions'
import { peekMessage, rememberMessage, removeMessage, useMessagesRevision } from '../messages/messagesStore'
import { sameJson, useTextState, type ArticleText } from '../text/articleText'

/** The article's messages (Message links, plan 31) in the order of the text (all of it, whatever the editor holds) */
export function useMessages(text: ArticleText): LinkRange[] {
  return useTextState(text, (doc) => linkRanges(doc).filter((r) => r.link.kind === 'msg'), sameJson)
}

/** The ids of the messages whose words are in the text */
const idsIn = (ranges: LinkRange[]) => [...new Set(ranges.flatMap((r) => (r.link.kind === 'msg' && r.link.id !== null ? [r.link.id] : [])))]

/** A message's title and the start of its text, when it was read already (nothing is read for the list), or what its old link holds */
function knownText(range: LinkRange): { title: string; content: string } | null {
  if (range.link.kind !== 'msg') return null
  if (range.link.id === null) return range.link.legacy
  const state = peekMessage(range.link.id)
  return state?.status === 'ready' ? state.message : null
}

/**
 * "Not in the text" (editors): the article's messages whose words are not in the text any more (removed, or the save never came), read
 * only when asked, a page at a time. Each can be deleted, or placed on the words selected in the text
 */
function NotInText({ editor, articleId, ranges }: { editor: Editor; articleId: number; ranges: LinkRange[] }) {
  const [items, setItems] = useState<Message[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasSelection = useEditorState({ editor, selector: ({ editor: e }) => !!e && !e.state.selection.empty }) ?? false

  const load = async (more: boolean) => {
    setLoading(true)
    setError(null)
    try {
      // (at most the server's limit: past it, a few messages that are in the text may show too)
      const exclude = idsIn(ranges).slice(0, MESSAGE_EXCLUDE_MAX).join(',')
      const page = await messagesApi.list({ articleId, exclude }, { cursor: more ? cursor : null })
      page.items.forEach(rememberMessage)
      setItems((old) => [...(more && old ? old : []), ...page.items])
      setCursor(page.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load them')
    } finally {
      setLoading(false)
    }
  }
  const forget = (id: number) => setItems((old) => old?.filter((m) => m.id !== id) ?? null)

  if (items === null) {
    return (
      <div className="flex flex-col gap-1 border-t border-line pt-1">
        <Button variant="ghost" size="sm" plain className="justify-start" disabled={loading} onClick={() => void load(false)}>
          {loading ? 'Loading…' : 'Not in the text'}
        </Button>
        {error && <p className="px-1 text-small text-danger">{error}</p>}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-1">
      <h3 className="px-1 text-small font-medium text-fg-muted">Not in the text ({items.length}{cursor ? '+' : ''})</h3>
      {items.length === 0 && <p className="px-1 text-small text-fg-subtle">Every message is on its words.</p>}
      <ul className="flex flex-col">
        {items.map((m) => (
          <li key={m.id} className="flex items-start gap-0.5 px-1 py-0.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-small font-medium">{m.title || 'Message'}</span>
              {m.content && <span className="line-clamp-2 text-small text-fg-subtle">{previewOf(m.content, 90)}</span>}
            </span>
            {(m.can.remove || hasSelection) && (
              <TreeMenu
                label={`More: ${m.title || 'message'}`}
                groups={[
                  ...(hasSelection
                    ? [
                        [
                          {
                            label: 'Place on the selected words',
                            icon: LuPlus,
                            onClick: () => {
                              setArticleLink(editor, { kind: 'msg', id: m.id })
                              forget(m.id)
                            },
                          },
                        ],
                      ]
                    : []),
                  ...(m.can.remove
                    ? [
                        [
                          {
                            label: 'Delete',
                            icon: LuTrash2,
                            danger: true,
                            onClick: () =>
                              void removeMessage(m.id).then(
                                () => forget(m.id),
                                (e: Error) => setError(e.message),
                              ),
                          },
                        ],
                      ]
                    : []),
                ]}
              />
            )}
          </li>
        ))}
      </ul>
      {cursor && (
        <Button variant="ghost" size="sm" plain disabled={loading} onClick={() => void load(true)}>
          {loading ? 'Loading…' : 'Show more'}
        </Button>
      )}
      {error && <p className="px-1 text-small text-danger">{error}</p>}
    </div>
  )
}

type Props = {
  text: ArticleText
  /** The text's editor, once it was opened ("Not in the text" places a message on its selection) */
  editor: Editor | null
  articleId: number
  /** The user edits the article (they see "Not in the text" and ✎) */
  canEdit: boolean
  /** Shows the message beside the text, at its words */
  onOpen: (range: LinkRange) => void
  /** Opens the Message form on its words */
  onEdit: (range: LinkRange) => void
}

/**
 * Messages (the round button on the body's left edge): every message link of the text, in order, with the words it is on, and its title
 * once it was read (nothing is read for this list: a message is read when it is opened). Editors also get "Not in the text"
 */
export default function MessagesList({ text, editor, articleId, canEdit, onOpen, onEdit }: Props) {
  const messages = useMessages(text)
  // The titles of messages read meanwhile show as they come
  useMessagesRevision()
  return (
    <section aria-label="Messages" className="flex flex-col gap-1 rounded-(--card-radius) border border-line bg-surface p-2 shadow-sm">
      <h2 className="flex items-center gap-1.5 px-1 text-small font-medium text-fg-muted">
        <LuMessageSquareText className="size-4" />
        Messages ({messages.length})
      </h2>
      {messages.length === 0 ? (
        <p className="px-1 text-small text-fg-subtle">{canEdit ? 'None yet. Select some words and use Message in the links row.' : 'None yet.'}</p>
      ) : (
        <ul className="flex max-h-80 flex-col overflow-y-auto">
          {messages.map((m) => {
            const known = knownText(m)
            return (
              <li key={`${m.from}:${m.href}`} className="flex items-start gap-0.5">
                <Button variant="ghost" size="sm" plain className="h-auto! min-w-0 flex-1 justify-start" onClick={() => onOpen(m)}>
                  <span className="flex min-w-0 flex-col items-start py-0.5 text-start">
                    <span className="w-full truncate">“{m.text}”</span>
                    {known && <span className="w-full truncate text-small font-normal text-fg-muted">{known.title || 'Message'}</span>}
                    {known?.content && <span className="line-clamp-2 text-small font-normal text-fg-subtle">{previewOf(known.content, 90)}</span>}
                  </span>
                </Button>
                {canEdit && <TreeMenu label={`More: ${known?.title || m.text}`} groups={[[{ label: 'Edit', icon: LuPencil, onClick: () => onEdit(m) }]]} />}
              </li>
            )
          })}
        </ul>
      )}
      {canEdit && editor && <NotInText editor={editor} articleId={articleId} ranges={messages} />}
    </section>
  )
}
