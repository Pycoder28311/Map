import { useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import TitleInput from '../../components/ui/fields/TitleInput'
import { uploadImage } from '../../lib/api/images'
import InfoBox from '../infobox/InfoBox'
import type { Patch } from './changes'
import { labelPatch } from './drawPoint'
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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex items-start gap-2">
          <TitleInput
            key={`${object.id}:${object.name}`}
            size="xl"
            aria-label="Title"
            placeholder="Title"
            defaultValue={object.name}
            maxLength={200}
            autoFocus={object.name === ''}
            onBlur={(e) => e.target.value.trim() !== object.name && apply({ name: e.target.value.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-w-0 flex-1"
          />
          <IconButton icon={LuX} label="Close" onClick={onClose} />
        </div>
        {/* One line of types, never wrapped: it scrolls sideways when it is too wide */}
        <div role="toolbar" aria-label="Type of point" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1">
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
          value={infoboxOf(object)}
          onChange={(infobox) => apply({ infobox })}
          onUploadImage={uploadImage}
          onUploadError={() => {}}
        />
        <RichTextEditor
          key={object.id}
          label="Text"
          placeholder="Write about this place…"
          content={descriptionDoc(object.description)}
          onEditor={(e) => {
            editor.current = e
          }}
          onBlur={saveText}
          className="text-body [&_.ProseMirror]:min-h-32 [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5"
        />
        <NodeNotes mapId={mapId} objectId={object.id} />
      </div>
    </section>
  )
}
