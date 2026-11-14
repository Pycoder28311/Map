import type { KeyboardEvent } from 'react'
import { LuPin } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import { useResourceMenu } from '../../../lib/resource/actions'
import { useResourceList } from '../../../lib/resource/hooks'
import { resourceByName } from '../../../resources/registry'
import type { AnyResource } from '../../../resources/types'
import { useOpenLayout } from '../../objects/ListRows'
import { single } from '../../workspace/layout'
import { svgUrl, toSvg, type Canvas } from './cardPixels'
import { PAPER, PAPER_PALETTE } from './paperData'

const NOTES = resourceByName('notes')

/** The paper sheet (paperData.ts), drawn once as an SVG: square pixels at any size, its rim see-through in part */
const SHEET = svgUrl(toSvg(PAPER.map((row) => [...row].map((ch) => (ch === '.' ? null : ch))) as Canvas, PAPER_PALETTE))

type Item = Record<string, unknown> & { id: number | string }

/**
 * The Dashboard's notes, under the Create buttons: each on a sheet of old paper (styles/paperNote.css), pinned first. A sheet opens its note
 * (its modal); its ⋯ (on hover) has the note's menu (pin, move, trash…)
 */
export default function NotesShelf() {
  const notes = useResourceList(NOTES!)
  const open = useOpenLayout()
  if (!NOTES) return null
  const items = notes.items as Item[]
  return (
    <section aria-label="Notes" className="flex flex-col gap-4">
      <h2 className="px-4 text-heading font-semibold">
        Notes <span className="text-body font-normal text-fg-subtle">{items.length}</span>
      </h2>
      {notes.status === 'loading' && items.length === 0 ? (
        <p className="px-4 text-body text-fg-subtle">Loading…</p>
      ) : items.length === 0 ? (
        <p className="px-4 text-body text-fg-subtle">No notes yet: take one above.</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-6">
          {items.map((item) => (
            <PaperNote key={item.id} resource={NOTES} item={item} onOpen={() => open(single({ type: NOTES.panelType, id: String(item.id) }))} />
          ))}
        </div>
      )}
      {notes.hasMore && (
        <Button variant="text" onClick={notes.loadMore} className="self-center">
          More notes
        </Button>
      )}
    </section>
  )
}

/** One note on its sheet: its title, and its first lines; the note's menu on hover */
function PaperNote({ resource, item, onOpen }: { resource: AnyResource; item: Item; onOpen: () => void }) {
  const { menuOf, dialogs } = useResourceMenu(resource)
  const title = resource.ui.row.title(item)
  const text = resource.ui.row.subtitle?.(item)
  const pinned = resource.ui.row.pinned?.(item) ?? false
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${title}`}
        onClick={onOpen}
        onKeyDown={onKey}
        className="paper-note"
      >
        <img className="paper-note__sheet" src={SHEET} alt="" draggable={false} />
        <div className="paper-note__body">
          <h3 className="paper-note__title">{title}</h3>
          <p className={`paper-note__text ${text ? '' : 'paper-note__text--empty'}`}>{text || 'Empty'}</p>
        </div>
        {pinned && <LuPin aria-label="Pinned" className="paper-note__pin" />}
        {/* Its own button: clicking it doesn't open the note */}
        <span className="paper-note__more" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <TreeMenu label={`More: ${title}`} groups={menuOf({ id: item.id, title, pinned })} />
        </span>
      </div>
      {dialogs}
    </>
  )
}
