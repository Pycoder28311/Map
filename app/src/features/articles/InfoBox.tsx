import type { Infobox, InfoRow, InfoRowKind } from '@map/shared'
import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { LuAlignLeft, LuArrowDown, LuArrowUp, LuImagePlus, LuList, LuListOrdered, LuPlus, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import Card from '../../components/ui/Card'
import CheckField from '../../components/ui/fields/CheckField'
import TextAreaField from '../../components/ui/fields/TextAreaField'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import ExtendMenu from '../../components/ui/overlays/ExtendMenu'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import { changeKind, emptyRow, insertRow, moveRow, removeRow, updateRow } from './infoRows'

const KINDS: { value: InfoRowKind; label: string; icon: PlainIcon }[] = [
  { value: 'value', label: 'Info and value', icon: LuAlignLeft },
  { value: 'list', label: 'Numbered list', icon: LuListOrdered },
  { value: 'text', label: 'Description', icon: LuList },
]

// Full class strings so Tailwind can detect them at build time. The inputs are plain text on the box, a line under each row
const INPUT = 'min-w-0 bg-transparent text-fg outline-none placeholder:text-fg-subtle'
const ROW = 'group/row relative flex flex-col gap-1 border-b border-line pb-1.5'

type Props = {
  value: Infobox
  onChange: (next: Infobox) => void
  /** Stores a picture and answers its address */
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
}

/**
 * An article's Info box (its `infobox` field): a picture, a name and rows of facts, each kind its own look: a label and a value on one
 * line, a label and a numbered list, or a label and a description (shown as bullets when ticked). A + between two rows puts a new one
 * there; a row's ⋯ changes its kind, moves or deletes it; Add info adds one at the end. Every change is sent to `onChange`.
 */
export default function InfoBox({ value, onChange, onUploadImage, onUploadError }: Props) {
  const rows = value.rows
  const setRows = (next: InfoRow[]) => onChange({ ...value, rows: next })

  return (
    <Card variant="muted" className="flex flex-col gap-2 p-2">
      <Picture image={value.image} onChange={(image) => onChange({ ...value, image })} onUploadImage={onUploadImage} onUploadError={onUploadError} />
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="Name"
        aria-label="Name"
        maxLength={200}
        className={`${INPUT} border-b border-line pb-1 text-heading`}
      />
      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col">
          {i > 0 && <InsertHere onInsert={() => setRows(insertRow(rows, i, emptyRow('value')))} />}
          <Row
            row={row}
            first={i === 0}
            last={i === rows.length - 1}
            onChange={(next) => setRows(updateRow(rows, next))}
            onMove={(by) => setRows(moveRow(rows, row.id, by))}
            onRemove={() => setRows(removeRow(rows, row.id))}
          />
        </div>
      ))}
      <ExtendMenu variant="ghost" label="Add info" items={KINDS} onSelect={(kind) => setRows([...rows, emptyRow(kind)])} direction="up" className="w-full">
        <LuPlus aria-hidden /> Add info
      </ExtendMenu>
    </Card>
  )
}

/** The picture at the top: click or drop one to add it; over it, Replace and Remove */
function Picture({ image, onChange, onUploadImage, onUploadError }: { image: string | null } & Pick<Props, 'onUploadImage' | 'onUploadError'> & { onChange: (image: string | null) => void }) {
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await onUploadImage(file))
    } catch (error) {
      onUploadError(error)
    } finally {
      setBusy(false)
    }
  }
  const drop = (e: DragEvent) => {
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    void upload(file)
  }
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={drop} className="group/picture relative aspect-square overflow-hidden rounded-(--card-radius) bg-fill-strong">
      {image ? (
        <>
          <img src={image} alt="" className="size-full object-cover" />
          <div className="absolute end-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover/picture:opacity-100 group-focus-within/picture:opacity-100">
            <IconButton icon={LuImagePlus} label="Replace picture" variant="secondary" size="sm" disabled={busy} onClick={() => picker.current?.click()} />
            <IconButton icon={LuX} label="Remove picture" variant="secondary" size="sm" onClick={() => onChange(null)} />
          </div>
        </>
      ) : (
        <Button variant="ghost" icon={LuImagePlus} disabled={busy} onClick={() => picker.current?.click()} className="size-full justify-center">
          {busy ? 'Uploading…' : 'Add picture'}
        </Button>
      )}
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** The small + on the line between two rows */
function InsertHere({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group/insert relative -my-1 flex h-3 items-center justify-center">
      <IconButton icon={LuPlus} label="Add info here" size="xs" onClick={onInsert} className="opacity-0 transition-opacity group-hover/insert:opacity-100 focus-visible:opacity-100" />
    </div>
  )
}

type RowProps = { row: InfoRow; first: boolean; last: boolean; onChange: (row: InfoRow) => void; onMove: (by: -1 | 1) => void; onRemove: () => void }

function Row({ row, first, last, onChange, onMove, onRemove }: RowProps) {
  const menu = [
    KINDS.filter((k) => k.value !== row.kind).map((k) => ({ label: `As ${k.label.toLowerCase()}`, icon: k.icon, onClick: () => onChange(changeKind(row, k.value)) })),
    [
      ...(first ? [] : [{ label: 'Move up', icon: LuArrowUp, onClick: () => onMove(-1) }]),
      ...(last ? [] : [{ label: 'Move down', icon: LuArrowDown, onClick: () => onMove(1) }]),
    ],
    [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: onRemove }],
  ].filter((group) => group.length > 0)

  const label = (
    <input
      value={row.label}
      onChange={(e) => onChange({ ...row, label: e.target.value })}
      placeholder="Info"
      aria-label="Info"
      maxLength={100}
      className={`${INPUT} flex-1 text-small font-medium`}
    />
  )
  const more = <TreeMenu label={`More: ${row.label || 'info'}`} groups={menu} show="hover" />

  if (row.kind === 'value') {
    return (
      <div className={ROW}>
        <div className="flex items-center gap-2">
          {label}
          <input
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            placeholder="Value"
            aria-label={`${row.label || 'Info'}: value`}
            maxLength={200}
            className={`${INPUT} flex-1 text-end text-body`}
          />
          {more}
        </div>
      </div>
    )
  }
  if (row.kind === 'list') return <ListRow row={row} label={label} more={more} onChange={onChange} />
  return (
    <div className={ROW}>
      <div className="flex items-center gap-2">
        {label}
        <CheckField label="Bullets" checked={row.bullets} onChange={(bullets) => onChange({ ...row, bullets })} className="text-small" />
        {more}
      </div>
      <Description row={row} onChange={onChange} />
    </div>
  )
}

/** A label and a numbered list: Enter adds an item below, Backspace in an empty one removes it */
function ListRow({ row, label, more, onChange }: { row: Extract<InfoRow, { kind: 'list' }>; label: ReactNode; more: ReactNode; onChange: (row: InfoRow) => void }) {
  const list = useRef<HTMLOListElement>(null)
  const focusItem = (i: number) => requestAnimationFrame(() => list.current?.querySelectorAll('input')[i]?.focus())
  const setItems = (items: string[]) => onChange({ ...row, items })
  const keyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setItems([...row.items.slice(0, i + 1), '', ...row.items.slice(i + 1)])
      focusItem(i + 1)
    } else if (e.key === 'Backspace' && row.items[i] === '' && row.items.length > 1) {
      e.preventDefault()
      setItems(row.items.filter((_, j) => j !== i))
      focusItem(Math.max(0, i - 1))
    }
  }
  return (
    <div className={ROW}>
      <div className="flex items-center gap-2">
        {label}
        {more}
      </div>
      <ol ref={list} className="flex list-decimal flex-col ps-5 text-body marker:text-fg-muted">
        {row.items.map((item, i) => (
          <li key={i}>
            <input
              value={item}
              onChange={(e) => setItems(row.items.map((old, j) => (j === i ? e.target.value : old)))}
              onKeyDown={(e) => keyDown(e, i)}
              placeholder={`Info ${i + 1}`}
              aria-label={`${row.label || 'Info'}: item ${i + 1}`}
              maxLength={200}
              className={`${INPUT} w-full`}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

/** A description: a text area while it is edited; with Bullets ticked, its lines show as bullets otherwise */
function Description({ row, onChange }: { row: Extract<InfoRow, { kind: 'text' }>; onChange: (row: InfoRow) => void }) {
  const [editing, setEditing] = useState(false)
  const lines = row.text.split('\n').filter((l) => l.trim() !== '')
  if (row.bullets && !editing && lines.length > 0) {
    return (
      // Clicked (or Enter), it turns back into the text area
      <ul
        tabIndex={0}
        aria-label={`${row.label || 'Info'}: description (edit)`}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
        className="cursor-text list-disc ps-5 text-body focus-visible:outline-2 focus-visible:outline-accent"
      >
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    )
  }
  return (
    <TextAreaField
      label={`${row.label || 'Info'}: description`}
      value={row.text}
      onChange={(e) => onChange({ ...row, text: e.target.value })}
      onBlur={() => setEditing(false)}
      autoFocus={editing}
      placeholder="Description"
      maxLength={2000}
      className="text-body"
    />
  )
}
