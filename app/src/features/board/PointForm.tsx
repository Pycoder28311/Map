import { useRef } from 'react'
import type { Editor } from '@tiptap/react'
import Button from '../../components/ui/buttons/Button'
import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import TitleInput from '../../components/ui/fields/TitleInput'
import { uploadImage } from '../../lib/api/images'
import InfoBox from '../infobox/InfoBox'
import type { Patch } from './changes'
import { labelPatch } from './drawPoint'
import FormHeader from './FormHeader'
import { LABELS } from './pointLabels'
import { infoboxOf } from './pointInfo'
import { descriptionDoc, descriptionText } from './pointText'
import NodeNotes from './sidebar/common/NodeNotes'
import type { PointObject } from './types'

type Props = {
  mapId: string
  object: PointObject
  /** A change is one undo step */
  apply: (patch: Patch) => void
  /** Lets go of the point (the form closes) */
  onClose: () => void
}

/**
 * A point, as a page like an article's, in the left column: the title (with the ✕), the types of point under it (a row that scrolls
 * sideways), then the article page's own InfoBox (without its cracked edge) with the rows its type starts with, and its picture, which
 * is the point's picture. Under it the text, and the notes connected to it. Opened when a point is placed or is the only thing selected.
 * The title and the text save when they lose focus (one undo step each); the type and the Info box at once. ✕ lets go of the point
 */
export default function PointForm({ mapId, object, apply, onClose }: Props) {
  const editor = useRef<Editor | null>(null)
  const saveText = () => {
    if (!editor.current) return
    const text = descriptionText(editor.current.getJSON())
    if (text !== (object.description ?? '')) apply({ description: text })
  }

  return (
    <section aria-label="Point" className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-(--card-radius) border border-line bg-surface shadow-lg">
      <div className="flex min-h-0 flex-1 flex-col gap-base overflow-y-auto p-3">
        <FormHeader onClose={onClose}>
          <TitleInput
            key={`${object.id}:${object.name}`}
            size="2xl"
            aria-label="Title"
            placeholder="Title"
            defaultValue={object.name}
            maxLength={200}
            autoFocus={object.name === ''}
            onBlur={(e) => e.target.value.trim() !== object.name && apply({ name: e.target.value.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-w-0 flex-1"
          />
        </FormHeader>
        {/* The types and the picture under them are close together (the gap of the picture and its first section: --spacing-sm) */}
        <div className="flex flex-col">
        {/* One line of types, never wrapped: it scrolls sideways when it is too wide */}
        <div role="toolbar" aria-label="Type of point" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-sm">
          {LABELS.map((l) => {
            const on = l.id === object.label
            return (
              <Button key={l.id} variant={on ? 'selected' : 'ghost'} size="sm" plain filled aria-pressed={on} className="shrink-0" onClick={() => !on && apply(labelPatch(object, l.id))}>
                {l.name}
              </Button>
            )
          })}
        </div>
        <InfoBox
          // (a new type starts with its own rows, until the box was changed)
          key={`${object.id}:${object.infobox ? 'own' : object.label}`}
          cracked={false}
          addRow={object.label === 'none'}
          value={infoboxOf(object)}
          onChange={(infobox) => apply({ infobox })}
          onUploadImage={uploadImage}
          onUploadError={() => {}}
        />
        </div>
        <RichTextEditor
          key={object.id}
          label="Text"
          placeholder="Write about this place…"
          content={descriptionDoc(object.description)}
          onEditor={(e) => {
            editor.current = e
          }}
          onBlur={saveText}
          className="min-h-32 flex-1 cursor-text rounded-(--field-radius) border border-line-strong bg-surface p-base text-body focus-within:border-fg-subtle [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5"
        />
      </div>
      <footer className="shrink-0 px-3 pb-3">
        <div className="border-t border-line pt-base">
          <NodeNotes centered mapId={mapId} objectId={object.id} />
        </div>
      </footer>
    </section>
  )
}
