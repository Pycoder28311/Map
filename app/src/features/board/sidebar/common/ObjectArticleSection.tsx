import { useState } from 'react'
import Button from '../../../../components/ui/buttons/Button'
import SearchInput from '../../../../components/ui/fields/SearchInput'
import HoverInfo, { TIP_DELAY } from '../../../../components/ui/overlays/HoverInfo'
import { useResourceList } from '../../../../lib/resource/hooks'
import { resourceByName } from '../../../../resources/registry'
import { fold } from '../../../search/search'
import { updateObject } from '../../boardStore'
import { articleIdOf } from '../../objectArticle'
import type { BoardObject } from '../../types'

/** How many matching articles the import lists */
const PICK_MAX = 8

type Article = Record<string, unknown> & { id: number | string }

/**
 * Under a line's or a closed area's text (once it is clicked), or under a shape's or an open area's name: a description, and the buttons
 * of its article: "Import article" (one of the user's, which then is its article) at the left of "Create article" (opens an empty one at
 * the left, kept in the map's file: ObjectDraftForm, which has its own Create article). Once it has one the button opens it
 * (ObjectArticleForm). An area keeps its description (it is drawn under its name on the map)
 */
export default function ObjectArticleSection({ mapId, object, onOpenArticle }: { mapId: string; object: BoardObject; board?: BoardObject[]; onOpenArticle: (id: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [query, setQuery] = useState('')
  const made = articleIdOf(object) !== null
  const description = object.description ?? ''
  const articles = resourceByName('articles')!
  // The user's articles, read only while the import is open
  const list = useResourceList(articles, { limit: 20, enabled: importing })
  const words = fold(query).split(/\s+/).filter(Boolean)
  const found = (list.items as Article[]).filter((a) => words.every((w) => fold(`${articles.ui.row.title(a)} ${String(a.preview ?? '')}`).includes(w))).slice(0, PICK_MAX)

  const importArticle = (id: number) => {
    updateObject(mapId, object.id, { ref: { type: 'articles', id } })
    setImporting(false)
    onOpenArticle(object.id)
  }

  return (
    <div className="flex flex-col gap-2">
      {(!made || object.kind === 'border') && (
        <textarea
          aria-label="Description"
          rows={3}
          value={draft ?? description}
          placeholder={object.kind === 'border' ? 'Shown under the name' : 'Description'}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== null && draft !== description) updateObject(mapId, object.id, { description: draft })
            setDraft(null)
          }}
          className="resize-y rounded-(--field-radius) border border-line-strong bg-surface px-2 py-1 text-body outline-none focus-visible:border-fg-subtle"
        />
      )}
      {/* sortBy2 buttons with the same card as the article page's toolbar buttons (HoverInfo) */}
      <div className="flex items-center gap-1">
        {!made && (
          <HoverInfo title="Import article" text="Connects one of your articles to it, instead of making a new one." side="left" delay={TIP_DELAY}>
            <Button variant="ghost" size="sm" plain aria-expanded={importing} onClick={() => setImporting(!importing)}>
              Import article
            </Button>
          </HoverInfo>
        )}
        <HoverInfo
          title={made ? 'Open article' : 'Create article'}
          text={made ? 'Opens its article at the left of the map.' : 'Opens an article for it at the left: its title, an Info box and a text, kept in the map. Its own Create article makes the real article.'}
          side="left"
          delay={TIP_DELAY}
        >
          <Button variant="ghost" size="sm" plain filled onClick={() => onOpenArticle(object.id)}>
            {made ? 'Open article' : 'Create article'}
          </Button>
        </HoverInfo>
      </div>
      {importing && !made && (
        <div className="flex flex-col gap-1">
          <SearchInput
            autoFocus
            label="Find an article"
            placeholder="Find an article"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return
              e.preventDefault()
              e.stopPropagation()
              setImporting(false)
            }}
          />
          {found.map((a) => (
            <Button key={String(a.id)} variant="ghost" size="sm" plain className="justify-start" onClick={() => importArticle(Number(a.id))}>
              {articles.ui.row.title(a)}
            </Button>
          ))}
          {list.status === 'loading' && <p className="ps-2 text-small text-fg-subtle">Loading…</p>}
          {list.status !== 'loading' && found.length === 0 && <p className="ps-2 text-small text-fg-subtle">No article found.</p>}
        </div>
      )}
    </div>
  )
}
