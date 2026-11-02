import ColourField from '../../components/ui/fields/ColourField'
import { MarkerGlyph } from './PinIconView'
import { PIN_ICON_PATHS } from './pinIcons'
import { PIN_ICONS, type PinIcon } from './types'

type Props = {
  icon: PinIcon
  color: string
  onIcon: (icon: PinIcon) => void
  /** `commit` false while the colour picker moves */
  onColor: (color: string, commit: boolean) => void
}

/** How a point looks on the map (the pin, or a whole shape: some with a texture), and its colour. Each pick applies at once */
export default function PinPicker({ icon, color, onIcon, onColor }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-(--card-radius) border border-line bg-fill p-2">
      <div role="radiogroup" aria-label="How it looks on the map" className="grid grid-cols-5 gap-1">
        {PIN_ICONS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === icon}
            aria-label={PIN_ICON_PATHS[id].name}
            title={PIN_ICON_PATHS[id].name}
            onClick={() => onIcon(id)}
            className={`flex aspect-square cursor-pointer items-center justify-center rounded-(--corner-sm) hover:bg-surface ${id === icon ? 'bg-surface ring-2 ring-accent' : ''}`}
          >
            <MarkerGlyph icon={id} color={color} className="size-8" />
          </button>
        ))}
      </div>
      <ColourField label="Pin colour" value={color} onLive={(c) => onColor(c, false)} onCommit={(c) => onColor(c, true)} />
    </div>
  )
}
