import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuBold, LuHeading2, LuItalic, LuList, LuPencil } from 'react-icons/lu'
import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import type { Patch } from './changes'
import { labelPatch } from './drawPoint'
import BannerField from './BannerField'
import ObjectModal from './ObjectModal'
import PinPicker from './PinPicker'
import PinBadge from './PinIconView'
import PointLinks from './PointLinks'
import { LABELS } from './pointLabels'
import { descriptionDoc, descriptionText } from './pointText'
import type { BoardObject, PointLabel, PointObject } from './types'
import type { Mode } from './useMouseTool'

type Props = {
  mapId: string
  object: PointObject
  board: BoardObject[]
  mode: Mode
  onSplit: () => void
  onFocus: () => void
  onErase: () => void
  onDuplicate: () => void
  onShowBoardObject: (id: number) => void
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
}

/** The format buttons above the description. They do not take the focus from the editor */
function Format({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  const item = (label: string, Icon: typeof LuBold, on: boolean, run: () => void) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-(--corner-sm) hover:bg-fill ${on ? 'bg-fill text-accent' : ''}`}
    >
      <Icon className="size-4" />
    </button>
  )
  return (
    <div className="flex gap-0.5">
      {item('Bold', LuBold, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {item('Italic', LuItalic, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      {item('Heading', LuHeading2, editor.isActive('heading'), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {item('Bullet list', LuList, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
    </div>
  )
}

/** The modal of a pin, in the editor's sidebar: banner, pin, name, label, description, and what it is linked to */
export default function PointModal({ object, apply, onDuplicate, ...rest }: Props) {
  const [picking, setPicking] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [, redraw] = useState(0)

  return (
    <ObjectModal
      object={object}
      actions={['focus', 'duplicate']}
      onDuplicate={onDuplicate}
      top={<BannerField banner={object.banner} onChange={(banner) => apply({ banner }, true)} />}
      leading={
        <button
          type="button"
          aria-label="Change pin"
          aria-expanded={picking}
          title="Change the pin"
          onClick={() => setPicking(!picking)}
          className="relative cursor-pointer rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PinBadge icon={object.icon} color={object.color} className="size-9" />
          <span className="absolute -end-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-fg text-bg">
            <LuPencil className="size-2.5" />
          </span>
        </button>
      }
      {...rest}
    >
      {picking && (
        <PinPicker icon={object.icon} color={object.color} onIcon={(icon) => apply({ icon }, true)} onColor={(color, commit) => apply({ color }, commit)} />
      )}
      <label className="flex flex-col gap-1">
        <span className="text-small text-fg-muted">Label</span>
        <select
          value={object.label}
          onChange={(e) => apply(labelPatch(object, e.target.value as PointLabel), true)}
          className="h-(--field-h) rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-body"
        >
          {LABELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-small text-fg-muted">Description</span>
        <Format editor={editor} />
        <RichTextEditor
          key={object.id}
          content={descriptionDoc(object.description)}
          onEditor={setEditor}
          onUpdate={() => redraw((n) => n + 1)}
          onBlur={() => {
            if (!editor) return
            const text = descriptionText(editor.getJSON())
            if (text !== (object.description ?? '')) apply({ description: text }, true)
          }}
          className="min-h-24 rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) py-2 text-body [&_.ProseMirror]:min-h-20 [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5"
        />
      </div>
      <PointLinks links={object.links} board={rest.board} onShowBoardObject={rest.onShowBoardObject} />
    </ObjectModal>
  )
}
