import type { BoardObject, TextObject } from './types'

type Props = { text: TextObject; board: BoardObject[]; onChange: (id: number | null) => void }

const KINDS = ['border', 'point', 'line'] as const
const LABEL = { border: 'Area', point: 'Point', line: 'Line' } as const

/** The drop-down that connects a text to a border, point or line: it then moves with it (and the link opens it) */
export default function ConnectField({ text, board, onChange }: Props) {
  const targets = board.filter((o) => (KINDS as readonly string[]).includes(o.kind) && o.id !== text.id)
  return (
    <label className="flex flex-col gap-1">
      <span className="text-small text-fg-muted">Connect to</span>
      <select
        value={text.attach ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="h-(--field-h) rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-body outline-none focus-visible:border-fg-subtle"
      >
        <option value="">Nothing</option>
        {targets.map((o) => (
          <option key={o.id} value={o.id}>
            {LABEL[o.kind as (typeof KINDS)[number]]}: {o.name || `#${o.id}`}
          </option>
        ))}
      </select>
    </label>
  )
}
