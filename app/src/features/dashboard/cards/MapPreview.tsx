import type { CSSProperties } from 'react'
import { LuMapPin } from 'react-icons/lu'
import { hueOf } from '../../objects/placeholderArt'

/** A map's picture (for now a map-like placeholder: a faint grid and a pin, tinted by its id) */
export default function MapPreview({ id, className = '', pin = 'size-10' }: { id: string; className?: string; pin?: string }) {
  const hue = hueOf(id)
  const style: CSSProperties = {
    backgroundColor: `color-mix(in oklch, hsl(${hue} 50% 60%) 14%, var(--surface-muted))`,
    backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
    backgroundSize: '16px 16px',
  }
  return (
    <div style={style} className={`flex items-center justify-center ${className}`}>
      <LuMapPin className={`${pin} drop-shadow-sm`} style={{ color: `hsl(${hue} 65% 45%)` }} />
    </div>
  )
}

