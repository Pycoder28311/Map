import { LuUnlink } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { linksOf, unlinkNote, useLinks } from '../../mocks/projectsStore'
import OpenAsPanelButton from '../workspace/OpenAsPanelButton'

/**
 * DORMANT: nothing renders this while notes come from the server (no link route; plan 25, D5).
 * What an object is linked to: for a project or map, its linked notes; for a note, the projects and
 * maps it's linked to. Each can be opened as a panel or unlinked. Nothing when there are none.
 */
export default function LinkedList({ objectId, isNote, title }: { objectId: string; isNote: boolean; title: string }) {
  useLinks() // re-render when links change
  const linked = linksOf(objectId)
  if (linked.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-small font-medium text-fg-muted">{title}</h3>
      <ul className="flex flex-col gap-1">
        {linked.map((o) => {
          const Icon = KIND_ICON[o.kind]
          return (
            <li key={o.id} className="flex items-center gap-2 rounded-(--btn-radius) bg-fill px-3 py-1.5">
              <Icon className="size-(--btn-icon-size) shrink-0 text-fg-subtle" />
              <span className="min-w-0 flex-1 truncate text-body">{o.name}</span>
              <OpenAsPanelButton panel={{ type: o.kind, id: o.id }} />
              <IconButton
                icon={LuUnlink}
                label={`Unlink ${o.name}`}
                onClick={() => (isNote ? unlinkNote(objectId, o.id) : unlinkNote(o.id, objectId))}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
