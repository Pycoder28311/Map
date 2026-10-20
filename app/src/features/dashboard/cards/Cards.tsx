import { useState } from 'react'
import { KIND_ICON } from '../../../mocks/sidebarTree'
import { placeholderArt } from '../../objects/placeholderArt'
import MapPreview from './MapPreview'
import MapZoomModal from './MapZoomModal'
import CardShell, { type CardProps } from './CardShell'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

/** A small kind icon before a name */
function KindName({ kind, name }: { kind: CardProps['object']['kind']; name: React.ReactNode }) {
  const Icon = KIND_ICON[kind]
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-fg-subtle" />
      {name}
    </span>
  )
}

/** The card for an object, by its kind (each has its own look) */
export default function Card(props: CardProps) {
  switch (props.object.kind) {
    case 'object':
      return <ObjectCard {...props} />
    case 'map':
      return <MapCard {...props} />
    default:
      return null
  }
}

/** An object card: its picture, name and date, a two-line description */
function ObjectCard(props: CardProps) {
  const { object } = props
  return (
    <CardShell {...props} corner>
      {(name) => (
        <>
          <div style={placeholderArt(object.id)} className="h-28 shrink-0 rounded-(--btn-radius)" />
          <div className="flex items-center justify-between gap-2 px-0.5">
            <KindName kind="object" name={name} />
            <span className="shrink-0 text-small text-fg-subtle">{DATE.format(object.createdAt)}</span>
          </div>
          <p className="line-clamp-2 min-h-[2lh] px-0.5 text-small text-fg-muted group-data-pending/card:hidden">{object.description || 'No description'}</p>
        </>
      )}
    </CardShell>
  )
}

/** A map: its picture fills the card, its name at the bottom; on hover Open, select, zoom and ⋯ */
function MapCard(props: CardProps) {
  const { object } = props
  const [zoomed, setZoomed] = useState(false)
  return (
    <>
      <CardShell {...props} variant="media" onZoom={() => setZoomed(true)}>
        {() => <MapPreview id={object.id} className="size-full" />}
      </CardShell>
      <MapZoomModal object={object} open={zoomed} onClose={() => setZoomed(false)} />
    </>
  )
}
