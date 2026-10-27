import { LuMapPin } from 'react-icons/lu'
import { hueOf } from '../../objects/placeholderArt'

// Two continent outlines, in a 100 × 100 box (no details: just the shape of the land)
const CONTINENTS = [
  'M18 40 C 12 28, 28 14, 44 16 C 58 8, 78 14, 84 30 C 94 40, 88 58, 76 64 C 72 80, 52 90, 40 82 C 30 76, 34 66, 24 62 C 14 58, 22 50, 18 40 Z',
  'M22 30 C 34 12, 62 10, 78 24 C 90 36, 84 52, 70 56 C 66 70, 58 86, 46 88 C 40 76, 44 64, 32 58 C 18 52, 14 40, 22 30 Z',
]

/**
 * A map's picture, until a map has a drawing to show: a continent's shape on the sea, nothing more (no rivers, roads or buildings), with
 * a pin. The id picks the shape and tints the land, so maps differ a little
 */
export default function MapPreview({ id, className = '', pin = 'size-10' }: { id: string; className?: string; pin?: string }) {
  const hue = hueOf(id)
  const sea = `color-mix(in oklch, hsl(205 60% 58%) 30%, var(--surface-muted))`
  const land = `color-mix(in oklch, hsl(${hue} 40% 55%) 38%, var(--surface-muted))`
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: sea }}>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <path d={CONTINENTS[hue % CONTINENTS.length]} fill={land} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <LuMapPin className={`${pin} drop-shadow-sm`} style={{ color: `hsl(${hue} 65% 40%)` }} />
      </div>
    </div>
  )
}
