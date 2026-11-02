import { EMPTY_INFOBOX, type Infobox } from '@map/shared'
import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { LuExternalLink, LuUnlink, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import TitleInput from '../../components/ui/fields/TitleInput'
import { uploadImage } from '../../lib/api/images'
import { actionsOf, useResourceItem } from '../../lib/resource/hooks'
import { resourceByName } from '../../resources/registry'
import InfoBox from '../infobox/InfoBox'
import { toHtml } from '../notes/noteHtml'
import { useWorkspace } from '../workspace/useWorkspace'
import { updateObject } from './boardStore'
import FormCard from './FormCard'
import FormHeader from './FormHeader'
import NodeNotes from './sidebar/common/NodeNotes'

/** How long after the last change of the Info box it is sent (it changes with every letter) */
const SAVE_DELAY = 800

type Article = { id: number; title: string; content: string; infobox?: Infobox }

/** The frame of the left element: a white card at the column's height, the content scrolling inside */
function Frame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <FormCard label="Article">
      <div className="flex min-h-0 flex-1 flex-col gap-base overflow-y-auto p-3">{children}</div>
      {footer && <footer className="shrink-0 px-3 pb-3"><div className="border-t border-line pt-base">{footer}</div></footer>}
    </FormCard>
  )
}

/** The form of an article that is open: its title, its Info box and its text, saved to the article itself */
function ArticleFields({ article, mapId, objectId, onClose, onOpenFull }: { article: Article; mapId: string; objectId: number; onClose: () => void; onOpenFull: () => void }) {
  const articles = resourceByName('articles')!
  const save = (patch: Record<string, unknown>) => void actionsOf(articles).update(article.id, patch as never).catch(() => {})
  const editor = useRef<Editor | null>(null)
  // The Info box is shown as it is typed; the article gets it a moment after the last change, and when the form goes
  const [box, setBox] = useState<Infobox>(article.infobox ?? EMPTY_INFOBOX)
  const pending = useRef<Infobox | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const flush = () => {
    window.clearTimeout(timer.current)
    if (pending.current) save({ infobox: pending.current })
    pending.current = null
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => flush, [])

  return (
    <Frame footer={<NodeNotes centered mapId={mapId} objectId={objectId} />}>
      <FormHeader onClose={onClose}>
        <TitleInput
          key={`${article.id}:${article.title}`}
          size="2xl"
          aria-label="Title"
          placeholder="Title"
          defaultValue={article.title}
          maxLength={200}
          onBlur={(e) => e.target.value.trim() !== article.title && save({ title: e.target.value.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="min-w-0 flex-1"
        />
      </FormHeader>
      <Button variant="secondary" size="sm" icon={LuExternalLink} className="self-start" onClick={onOpenFull}>
        Open the full article
      </Button>
      <InfoBox
        cracked={false}
        value={box}
        onChange={(next) => {
          setBox(next)
          pending.current = next
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(flush, SAVE_DELAY)
        }}
        onUploadImage={uploadImage}
        onUploadError={() => {}}
      />
      <RichTextEditor
        label="Text"
        placeholder="Write the article…"
        content={toHtml(article.content)}
        onEditor={(e) => {
          editor.current = e
        }}
        onBlur={() => {
          const html = editor.current?.getHTML()
          if (html !== undefined && html !== toHtml(article.content)) save({ content: html })
        }}
        className="min-h-32 flex-1 cursor-text rounded-(--field-radius) border border-line-strong bg-surface p-base text-body focus-within:border-fg-subtle [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5"
      />
    </Frame>
  )
}

/**
 * The left element of an object that has an article (opened by its sidebar's "Open article"): the article like the point's form, with
 * its title, its Info box (the article page's own, without its cracked edge) and its text, edited in the real article. An article that
 * is gone shows that, and lets the object forget it
 */
export default function ObjectArticleForm({ mapId, objectId, articleId, onClose }: { mapId: string; objectId: number; articleId: number; onClose: () => void }) {
  const articles = resourceByName('articles')!
  const { item, notFound } = useResourceItem(articles, articleId)
  const workspace = useWorkspace()

  if (notFound) {
    return (
      <Frame>
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-body text-fg-muted">This article was deleted.</p>
          <IconButton icon={LuX} label="Close" onClick={onClose} />
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={LuUnlink}
          className="self-start"
          onClick={() => {
            updateObject(mapId, objectId, { ref: undefined })
            onClose()
          }}
        >
          Forget the article
        </Button>
      </Frame>
    )
  }
  if (!item) {
    return (
      <Frame>
        <p className="text-body text-fg-subtle">Loading…</p>
      </Frame>
    )
  }
  return <ArticleFields key={articleId} article={item as unknown as Article} mapId={mapId} objectId={objectId} onClose={onClose} onOpenFull={() => workspace.open({ type: 'article', id: String(articleId) })} />
}
