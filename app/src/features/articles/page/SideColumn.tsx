import type { Editor } from '@tiptap/react'
import type { LinkRange } from '../links/docLinks'
import ContentsTree from '../side/ContentsTree'
import MessagesList from '../side/MessagesList'
import NotesPanel from '../side/NotesPanel'
import type { SidePart } from '../side/RoundTools'
import type { ArticleText } from '../text/articleText'

type Props = {
  /** The page is too narrow to have the column beside the article: it opens over the text */
  narrow: boolean
  /** An element is open; `kept`: what the column shows (kept while it slides closed) */
  open: boolean
  kept: Set<SidePart>
  text: ArticleText
  editor: Editor | null
  articleId: number
  canEdit: boolean
  /** Messages: a message clicked (it opens beside its words), and its Edit */
  onOpenMessage: (range: LinkRange) => void
  onEditMessage: (range: LinkRange) => void
}

/** The left column: the one element its round button opened (Contents, Messages or Notes): beside the article on a wide page, over the text on a narrow one */
export default function SideColumn({ narrow, open, kept, text, editor, articleId, canEdit, onOpenMessage, onEditMessage }: Props) {
  const parts = (
    <>
      {kept.has('contents') && <ContentsTree text={text} />}
      {kept.has('messages') && <MessagesList text={text} editor={editor} articleId={articleId} canEdit={canEdit} onOpen={onOpenMessage} onEdit={onEditMessage} />}
      {kept.has('notes') && <NotesPanel articleId={String(articleId)} />}
    </>
  )
  return narrow ? (
    open && (
      // Over the text's left side, under the round buttons
      <aside aria-label="Article tools" className="absolute start-6 top-24 z-40 flex max-h-[calc(100vh-8rem)] w-113 animate-dropdown-in flex-col gap-3 overflow-y-auto rounded-(--card-radius) bg-surface p-1 shadow-xl motion-reduce:animate-none">
        {parts}
      </aside>
    )
  ) : (
    // Beside the article: its place grows from nothing and the article's width follows, smoothly; the column slides in a little as it does
    <div inert={!open} className={`shrink-0 overflow-x-clip transition-[width,margin] duration-300 ease-out motion-reduce:transition-none ${open ? 'me-4 w-88' : 'me-0 w-0'}`}>
      <aside
        aria-label="Article tools"
        className={`sticky top-0 flex max-h-screen w-88 flex-col gap-3 self-start overflow-y-auto pt-2 pb-4 transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}
      >
        {parts}
      </aside>
    </div>
  )
}
