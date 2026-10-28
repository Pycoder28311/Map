import { previewOf } from '@map/shared'
import { useEditorState, type Editor } from '@tiptap/react'
import { LuMessageSquareText, LuPencil } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import { linkRanges, type LinkRange } from '../links/docLinks'

/** The article's messages (Message links, plan 31) in the order of the text */
export function useMessages(editor: Editor | null): LinkRange[] {
  return (
    useEditorState({
      editor,
      selector: ({ editor: e }) => (e ? linkRanges(e.state.doc).filter((r) => r.link.kind === 'msg') : []),
      equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }) ?? []
  )
}

type Props = {
  editor: Editor | null
  /** Shows the message beside the text, at its words */
  onOpen: (range: LinkRange) => void
  /** Opens the Message form on its words */
  onEdit: (range: LinkRange) => void
}

/** Messages (the round button on the body's left edge): every message of the article, its title, its start and the words it is on */
export default function MessagesList({ editor, onOpen, onEdit }: Props) {
  const messages = useMessages(editor)
  return (
    <section aria-label="Messages" className="flex flex-col gap-1 rounded-(--card-radius) border border-line bg-surface p-2 shadow-sm">
      <h2 className="flex items-center gap-1.5 px-1 text-small font-medium text-fg-muted">
        <LuMessageSquareText className="size-4" />
        Messages ({messages.length})
      </h2>
      {messages.length === 0 ? (
        <p className="px-1 text-small text-fg-subtle">None yet. Select some words and use Message in the toolbar’s third row.</p>
      ) : (
        <ul className="flex max-h-80 flex-col overflow-y-auto">
          {messages.map((m) => {
            const link = m.link.kind === 'msg' ? m.link : null
            return (
              <li key={`${m.from}:${m.href}`} className="flex items-start gap-0.5">
                <Button variant="ghost" size="sm" plain className="h-auto! min-w-0 flex-1 justify-start" onClick={() => onOpen(m)}>
                  <span className="flex min-w-0 flex-col items-start py-0.5 text-start">
                    <span className="w-full truncate">{link?.title || 'Message'}</span>
                    {link?.content && <span className="line-clamp-2 text-small font-normal text-fg-subtle">{previewOf(link.content, 90)}</span>}
                    <span className="w-full truncate text-small font-normal text-fg-subtle">on “{m.text}”</span>
                  </span>
                </Button>
                <IconButton icon={LuPencil} label={`Edit: ${link?.title || 'message'}`} size="sm" onClick={() => onEdit(m)} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
