import ColourField from '../../components/ui/fields/ColourField'
import { PinGlyph } from './PinIconView'
import { PIN_ICON_PATHS } from './pinIcons'
import { PIN_ICONS, type PinIcon } from './types'

type Props = {
  icon: PinIcon
  color: string
  onIcon: (icon: PinIcon) => void
  /** `commit` false while the colour picker moves */
  onColor: (color: string, commit: boolean) => void
}

/** The icons a pin can have and its colour. Each pick applies at once */
export default function PinPicker({ icon, color, onIcon, onColor }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-(--card-radius) border border-line bg-fill p-2">
      <div role="radiogroup" aria-label="Pin icon" className="grid grid-cols-6 gap-1">
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
            <PinGlyph icon={id} color={color} />
          </button>
        ))}
      </div>
      <ColourField label="Pin colour" value={color} onLive={(c) => onColor(c, false)} onCommit={(c) => onColor(c, true)} />
    </div>
  )
}
