import { useState } from 'react'
import CheckField from '../../../../components/ui/fields/CheckField'
import { LuEllipsis } from 'react-icons/lu'
import Dropdown from '../../../../components/ui/overlays/Dropdown'
import SidebarSection from '../common/SidebarSection'
import type { TextSource } from './textSource'
import ValueBar from '../../../../components/ui/fields/ValueBar'
import { TEXT_DEFAULT } from '../../textDefaults'
import Button from '../../../../components/ui/buttons/Button'

/** What Small, Medium and Big set (board units) */
const PRESETS = [
  { label: 'Small', size: 16 },
  { label: 'Medium', size: 28 },
  { label: 'Big', size: 56 },
] as const
/** The sizes the dropdown next to the font size input offers */
const SIZES = [8, 10, 12, 14, 16, 18, 24, 28, 32, 40, 48, 56, 72, 96, 128, 200]
const MIN = 6
const MAX = 200

type Props = { source: TextSource }

/** The text sidebar's size controls: the slider, Small/Medium/Big, the font size input (with a dropdown) and whether it follows the zoom */
export default function TextSizeSection({ source }: Props) {
  const size = source.shown.size
  const onLive = (size: number) => source.onLive({ size })
  const onCommit = source.setSize
  const fixed = source.value.fixedSize
  const onFixed = (fixedSize: boolean) => source.onChange({ fixedSize })
  // What is typed, until Enter or leaving the input; null: showing the size
  const [typed, setTyped] = useState<string | null>(null)
  const commitTyped = () => {
    const n = Math.round(Number(typed))
    setTyped(null)
    if (Number.isFinite(n) && n >= MIN && n <= MAX && n !== size) onCommit(n)
  }
  // Keep the editor's selection while these are used (mouse down on a button would take the focus)
  const keep = (e: { preventDefault: () => void }) => e.preventDefault()

  return (
    <SidebarSection id="size" title="Size">
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <Button key={p.label} variant={size === p.size ? 'primary' : 'ghost'} aria-pressed={size === p.size} onMouseDown={keep} onClick={() => onCommit(p.size)}>
            {p.label}
          </Button>
        ))}
        <input
          type="number"
          min={MIN}
          max={MAX}
          value={typed ?? size}
          aria-label="Font size"
          onChange={(e) => {
            const inputType = (e.nativeEvent as InputEvent).inputType
            setTyped(e.target.value)
            // The arrows are final (a scrub waits until it ends); typing waits for Enter or leaving
            const n = Number(e.target.value)
            if (!e.target.dataset.scrubbing && inputType !== 'insertText' && inputType !== 'deleteContentBackward' && n >= MIN && n <= MAX) {
              setTyped(null)
              onCommit(Math.round(n))
            }
          }}
          onBlur={commitTyped}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="ms-auto h-(--field-h) w-16 rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-body outline-none focus-visible:border-fg-subtle"
        />
        <Dropdown
          label="Common font sizes"
          triggerIcon={LuEllipsis}
          value={String(size)}
          options={SIZES.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(n) => onCommit(Number(n))}
        />
      </div>
      <ValueBar
        label="Size"
        value={size}
        min={MIN}
        max={MAX}
        defaultValue={TEXT_DEFAULT.size}
        presets={[8, 12, 16, 24, 32, 48, 72, 128]}
        grid={{ rows: 2, columns: 4 }}
        onLive={onLive}
        onCommit={onCommit}
      />
      <CheckField label="Same size as I zoom" checked={fixed} onChange={onFixed} />
    </SidebarSection>
  )
}
