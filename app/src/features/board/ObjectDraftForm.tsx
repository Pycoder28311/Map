import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import Button from '../../components/ui/buttons/Button'
import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import ErrorText from '../../components/ui/fields/ErrorText'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import TitleInput from '../../components/ui/fields/TitleInput'
import { uploadImage } from '../../lib/api/images'
import InfoBox from '../infobox/InfoBox'
import { changeObjects, updateObject } from './boardStore'
import FormHeader from './FormHeader'
import { hasTypes, OBJECT_TYPES, objectInfoboxOf, typeOfObject } from './infoTypes'
import { createArticleFor, draftTextOf } from './objectArticle'
import { titleChange, titleOf } from './objectTitle'
import NodeNotes from './sidebar/common/NodeNotes'
import type { BoardObject } from './types'

type Props = {
  mapId: string
  object: BoardObject
  board: BoardObject[]
  onClose: () => void
}

/**
 * The article of a line, area or shape before it is one, in the left column like a point's form: the title (the object's text or name:
 * objectTitle.ts), the types of its kind in a row that scrolls sideways (each starts the Info box with its own rows: infoTypes.ts), the
 * article page's Info box (without its cracked edge) and the text. Everything is kept in the object, in the map's file (no request).
 * At the bottom, "Connect a note" (its notes) at the left of "Create article", which makes the real article from it, and the element
 * becomes that article's
 */
export default function ObjectDraftForm({ mapId, object, board, onClose }: Props) {
  const editor = useRef<Editor | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const title = titleOf(object, board)
  /** The text as it is in the editor ('' for none; undefined: no editor yet) */
  const currentText = () => (editor.current ? (editor.current.isEmpty ? '' : editor.current.getHTML()) : undefined)
  const saveText = () => {
    const next = currentText()
    if (next === undefined || next === (object.articleText ?? '') || next === draftTextOf(object)) return
    updateObject(mapId, object.id, { articleText: next || undefined })
  }
  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      // With the text as it is in the editor now (it may not have lost the focus yet)
      const text = currentText()
      await createArticleFor(mapId, text === undefined ? object : { ...object, articleText: text || undefined }, board)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The article could not be made')
      setBusy(false)
    }
  }

  return (
    <section aria-label="Article" className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-(--card-radius) border border-line bg-surface shadow-lg">
      <div className="flex min-h-0 flex-1 flex-col gap-base overflow-y-auto p-3">
        <FormHeader onClose={onClose}>
          <TitleInput
            key={`${object.id}:${title}`}
            size="2xl"
            aria-label="Title"
            placeholder="Title"
            defaultValue={title}
            maxLength={200}
            onBlur={(e) => e.target.value.trim() !== title && changeObjects(mapId, titleChange(object, board, e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-w-0 flex-1"
          />
        </FormHeader>
        <div className="flex flex-col">
        {hasTypes(object) && (
          // One line of types, never wrapped: it scrolls sideways when it is too wide
          <div role="toolbar" aria-label="Type" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-sm">
            {OBJECT_TYPES[object.kind].map((t) => {
              const on = t.id === typeOfObject(object).id
              return (
                <Button key={t.id} variant={on ? 'selected' : 'ghost'} size="sm" plain filled aria-pressed={on} className="shrink-0" onClick={() => !on && updateObject(mapId, object.id, { articleType: t.id })}>
                  {t.name}
                </Button>
              )
            })}
          </div>
        )}
        <InfoBox
          // (a new type starts with its own rows, until the box was changed)
          key={`${object.id}:${object.infobox ? 'own' : hasTypes(object) ? typeOfObject(object).id : ''}`}
          cracked={false}
          addRow={!hasTypes(object) || typeOfObject(object).id === 'none'}
          value={hasTypes(object) ? objectInfoboxOf(object) : { image: null, banner: null, name: '', rows: [] }}
          onChange={(infobox) => updateObject(mapId, object.id, { infobox })}
          onUploadImage={uploadImage}
          onUploadError={() => {}}
        />
        </div>
        <RichTextEditor
          key={`text:${object.id}`}
          label="Text"
          placeholder="Write the article…"
          content={draftTextOf(object)}
          onEditor={(e) => {
            editor.current = e
          }}
          onBlur={saveText}
          className="min-h-32 flex-1 cursor-text rounded-(--field-radius) border border-line-strong bg-surface p-base text-body focus-within:border-fg-subtle [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5"
        />
      </div>
      <footer className="shrink-0 px-3 pb-3"><div className="flex flex-col gap-1 border-t border-line pt-base">
        <NodeNotes
          centered
          mapId={mapId}
          objectId={object.id}
          extra={
            <HoverInfo title="Create article" text="Makes the real article from this title, Info box and text; this element then edits it." side="top" delay={350}>
              <Button variant="ghost" size="md" plain filled disabled={busy} onClick={() => void create()}>
                {busy ? 'Making the article…' : 'Create article'}
              </Button>
            </HoverInfo>
          }
        />
        <ErrorText>{error}</ErrorText>
        </div>
      </footer>
    </section>
  )
}
