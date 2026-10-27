import type { Infobox, InfoRow } from '@map/shared'
import { Fragment, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import {
  LuAlignJustify,
  LuAlignLeft,
  LuArrowDown,
  LuArrowUp,
  LuCalendar,
  LuCalendarRange,
  LuEllipsis,
  LuImage,
  LuImagePlus,
  LuLink,
  LuList,
  LuListOrdered,
  LuMapPin,
  LuMinus,
  LuPlus,
  LuTrash2,
  LuX,
} from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import Card from '../../components/ui/Card'
import TextAreaField from '../../components/ui/fields/TextAreaField'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import ExtendMenu from '../../components/ui/overlays/ExtendMenu'
import IconMenu from '../../components/ui/tree/IconMenu'
import { ICON_SHOW } from '../../components/ui/tree/treeIconStyles'
import { changeKind, emptyRow, insertRow, moveRow, normalizeAddress, normalizeDegree, removeRow, typeOf, updateRow, type RowType } from './infoRows'

/** Every kind of row the box can hold, in the order Add info offers them */
const TYPES: { value: RowType; label: string; icon: PlainIcon }[] = [
  { value: 'value', label: 'Info and value', icon: LuAlignLeft },
  { value: 'date', label: 'Date', icon: LuCalendar },
  { value: 'period', label: 'Period', icon: LuCalendarRange },
  { value: 'link', label: 'Link', icon: LuLink },
  { value: 'list', label: 'Numbered list', icon: LuListOrdered },
  { value: 'bullets', label: 'Bulleted list', icon: LuList },
  { value: 'text', label: 'Description', icon: LuAlignJustify },
  { value: 'image', label: 'Picture', icon: LuImage },
  { value: 'coordinates', label: 'Coordinates', icon: LuMapPin },
]

// Full class strings so Tailwind can detect them at build time. The inputs are plain text on the box, a line under each row
const INPUT = 'min-w-0 bg-transparent text-fg outline-none placeholder:text-fg-subtle'
// Each row is a block of its own on the box's background, a gap (with the + in it) between two blocks
const ROW = 'group/row relative flex flex-col gap-1 rounded-(--corner-sm) bg-fill-strong px-2 py-1.5'

type Props = {
  value: Infobox
  onChange: (next: Infobox) => void
  /** Stores a picture and answers its address */
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
}

/**
 * An article's Info box (its `infobox` field): a picture, a name and rows of facts, as an encyclopedia's, each row a block on the box's
 * background with a gap between two blocks: an info and its value, a date, a period, a link, numbered or bulleted lists, a description, more pictures
 * and coordinates. A + in the gap between two blocks opens a menu of what to put there; a row's ⋯ changes its type, moves or deletes it; Add info adds one at the
 * end. Every change is sent to `onChange`.
 */
export default function InfoBox({ value, onChange, onUploadImage, onUploadError }: Props) {
  const rows = value.rows
  const setRows = (next: InfoRow[]) => onChange({ ...value, rows: next })

  return (
    <Card variant="muted" className="flex flex-col p-2">
      <Picture image={value.image} onChange={(image) => onChange({ ...value, image })} onUploadImage={onUploadImage} onUploadError={onUploadError} />
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="Name"
        aria-label="Name"
        maxLength={200}
        className={`${INPUT} px-1 py-2 text-heading`}
      />
      {rows.map((row, i) => (
        <Fragment key={row.id}>
          <Gap onInsert={(type) => setRows(insertRow(rows, i, emptyRow(type)))} />
          <Row
            row={row}
            first={i === 0}
            last={i === rows.length - 1}
            onChange={(next) => setRows(updateRow(rows, next))}
            onMove={(by) => setRows(moveRow(rows, row.id, by))}
            onRemove={() => setRows(removeRow(rows, row.id))}
            onUploadImage={onUploadImage}
            onUploadError={onUploadError}
          />
        </Fragment>
      ))}
      <div className="mt-2">
        <ExtendMenu variant="ghost" label="Add info" items={TYPES} onSelect={(type) => setRows([...rows, emptyRow(type)])} direction="up" className="w-full">
          <LuPlus aria-hidden /> Add info
        </ExtendMenu>
      </div>
    </Card>
  )
}

/** A picture: click or drop one to add it; over it, Replace and Remove. A square */
function Picture({ image, onChange, onUploadImage, onUploadError }: { image: string | null; onChange: (image: string | null) => void } & Pick<Props, 'onUploadImage' | 'onUploadError'>) {
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

/**
 * The gap between two blocks (or between the name and the first one): a small + exactly in its middle, shown while the pointer is on the
 * gap, that opens a menu of what to add there
 */
function Gap({ onInsert }: { onInsert: (type: RowType) => void }) {
  const types = [TYPES.map((t) => ({ label: t.label, icon: t.icon, onClick: () => onInsert(t.value) }))]
  return (
    <div className="group/row relative z-10 flex h-3 items-center justify-center">
      <IconMenu label="Add info here" icon={LuPlus} groups={types} show="hover" small />
    </div>
  )
}

type RowProps = {
  row: InfoRow
  first: boolean
  last: boolean
  onChange: (row: InfoRow) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
} & Pick<Props, 'onUploadImage' | 'onUploadError'>

function Row({ row, first, last, onChange, onMove, onRemove, onUploadImage, onUploadError }: RowProps) {
  const type = typeOf(row)
  const menu = [
    // A description's Bullets option (its lines show as bullets while it is not edited)
    ...(row.kind === 'text' ? [[{ label: 'Bullets', icon: LuList, checked: row.bullets, onClick: () => onChange({ ...row, bullets: !row.bullets }) }]] : []),
    TYPES.filter((t) => t.value !== type).map((t) => ({ label: `As ${t.label.toLowerCase()}`, icon: t.icon, onClick: () => onChange(changeKind(row, t.value)) })),
    [
      ...(first ? [] : [{ label: 'Move up', icon: LuArrowUp, onClick: () => onMove(-1) }]),
      ...(last ? [] : [{ label: 'Move down', icon: LuArrowDown, onClick: () => onMove(1) }]),
    ],
    [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: onRemove }],
  ].filter((group) => group.length > 0)

  const name = row.label || 'info'
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
  // The popup menu (Dropdown's look and pop-in), not the dots of the sidebar rows
  const more = (
    <div className="flex shrink-0 items-center">
      {/* A − left of the ⋯ removes the row at once (the menu's Delete does the same); both show while the pointer is on the row */}
      <IconButton icon={LuMinus} label={`Remove ${name}`} size="sm" onClick={onRemove} className={ICON_SHOW.hover} />
      <IconMenu label={`More: ${name}`} icon={LuEllipsis} groups={menu} turn={false} show="hover" />
    </div>
  )
  const head = (
    <div className="flex items-center gap-2">
      {label}
      {more}
    </div>
  )

  if (row.kind === 'value' || row.kind === 'date') {
    return (
      <div className={ROW}>
        <div className="flex items-center gap-2">
          {label}
          <input
            type={row.kind === 'date' ? 'date' : 'text'}
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            placeholder="Value"
            aria-label={`${name}: ${row.kind === 'date' ? 'date' : 'value'}`}
            maxLength={200}
            className={`${INPUT} flex-1 text-end text-body`}
          />
          {more}
        </div>
      </div>
    )
  }
  if (row.kind === 'period') {
    return (
      <div className={ROW}>
        {head}
        <div className="flex items-center gap-1.5">
          <input type="date" value={row.from} onChange={(e) => onChange({ ...row, from: e.target.value })} aria-label={`${name}: from`} className={`${INPUT} flex-1 text-small`} />
          <span aria-hidden className="text-fg-muted">
            –
          </span>
          <input type="date" value={row.to} onChange={(e) => onChange({ ...row, to: e.target.value })} aria-label={`${name}: to`} className={`${INPUT} flex-1 text-small`} />
        </div>
      </div>
    )
  }
  if (row.kind === 'link') {
    return (
      <div className={ROW}>
        {head}
        <input value={row.text} onChange={(e) => onChange({ ...row, text: e.target.value })} placeholder="Link text" aria-label={`${name}: link text`} maxLength={200} className={`${INPUT} text-body`} />
        <AddressInput label={`${name}: address`} value={row.url} onCommit={(url) => onChange({ ...row, url })} />
      </div>
    )
  }
  if (row.kind === 'coordinates') {
    return (
      <div className={ROW}>
        {head}
        <div className="flex items-center gap-2">
          <DegreeInput label={`${name}: latitude`} placeholder="Latitude" value={row.lat} onCommit={(lat) => onChange({ ...row, lat })} />
          <DegreeInput label={`${name}: longitude`} placeholder="Longitude" value={row.lng} onCommit={(lng) => onChange({ ...row, lng })} />
        </div>
      </div>
    )
  }
  if (row.kind === 'image') {
    // The row's label is the caption
    return (
      <div className={ROW}>
        <Picture image={row.image} onChange={(image) => onChange({ ...row, image })} onUploadImage={onUploadImage} onUploadError={onUploadError} />
        <div className="flex items-center gap-2">
          <input
            value={row.label}
            onChange={(e) => onChange({ ...row, label: e.target.value })}
            placeholder="Caption"
            aria-label="Caption"
            maxLength={100}
            className={`${INPUT} flex-1 text-small text-fg-muted`}
          />
          {more}
        </div>
      </div>
    )
  }
  if (row.kind === 'list') return <ListRow row={row} head={head} onChange={onChange} />
  return (
    <div className={ROW}>
      {head}
      <Description row={row} onChange={onChange} />
    </div>
  )
}

/**
 * A link's address: it is kept as typed, but only sent on once it is one the server takes (an address with http, https or mailto; a bare
 * domain gets https://), so a half-typed one is never a failed save. Red while it is not one.
 */
function AddressInput({ label, value, onCommit }: { label: string; value: string; onCommit: (url: string) => void }) {
  const [text, setText] = useState(value)
  const valid = normalizeAddress(text) !== null
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const url = normalizeAddress(e.target.value)
        if (url !== null) onCommit(url)
      }}
      onBlur={() => {
        const url = normalizeAddress(text)
        if (url !== null) setText(url)
      }}
      placeholder="https://…"
      inputMode="url"
      aria-label={label}
      aria-invalid={!valid}
      title={valid ? undefined : 'An address starting with http://, https:// or mailto:'}
      maxLength={500}
      className={`${INPUT} text-small ${valid ? 'text-fg-muted' : 'text-danger'}`}
    />
  )
}

/** A latitude or longitude: kept as typed, sent on only once it is a number the server takes (like AddressInput) */
function DegreeInput({ label, placeholder, value, onCommit }: { label: string; placeholder: string; value: string; onCommit: (degrees: string) => void }) {
  const [text, setText] = useState(value)
  const valid = normalizeDegree(text) !== null
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const degrees = normalizeDegree(e.target.value)
        if (degrees !== null) onCommit(degrees)
      }}
      onBlur={() => {
        const degrees = normalizeDegree(text)
        if (degrees !== null) setText(degrees)
      }}
      placeholder={placeholder}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={!valid}
      maxLength={13}
      className={`${INPUT} w-0 flex-1 text-small ${valid ? '' : 'text-danger'}`}
    />
  )
}

/** A label and a numbered or bulleted list: Enter adds an item below, Backspace in an empty one removes it */
function ListRow({ row, head, onChange }: { row: Extract<InfoRow, { kind: 'list' }>; head: ReactNode; onChange: (row: InfoRow) => void }) {
  const list = useRef<HTMLOListElement & HTMLUListElement>(null)
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
  const ordered = row.ordered !== false
  const List = ordered ? 'ol' : 'ul'
  return (
    <div className={ROW}>
      {head}
      <List ref={list} className={`flex ${ordered ? 'list-decimal' : 'list-disc'} flex-col ps-5 text-body marker:text-fg-muted`}>
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
      </List>
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
