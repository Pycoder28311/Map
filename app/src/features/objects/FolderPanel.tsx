import { LuFolders } from 'react-icons/lu'
import Card from '../dashboard/cards/Cards'
import { findObject } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import { useLinkNode } from '../links/linkNode'
import { useOpenLayout } from './ListRows'
import { single } from '../workspace/layout'
import type { PanelProps } from '../workspace/types'
import { useObjectActions } from './useObjectActions'

/** One folder: its articles, as cards (open, drag, ⋯ like on the Dashboard) */
export default function FolderPanel({ id }: PanelProps) {
  const objects = useMockObjects()
  const actions = useObjectActions()
  const linkNodeFor = useLinkNode()
  const open = useOpenLayout()
  const folder = findObject(id)
  if (!folder) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  const articles = objects.filter((o) => o.parentId === folder.id && findObject(o.id))

  return (
    <div className="flex h-full min-h-48 flex-col gap-4 p-4">
      <h2 className="flex items-center gap-2 text-heading">
        <LuFolders className="size-5 text-fg-subtle" aria-hidden="true" />
        {folder.name}
      </h2>
      {articles.length === 0 ? (
        <p className="text-body text-fg-muted">No articles yet. Drag articles onto this folder to put them in it.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {articles.map((a) => (
            <Card
              key={a.id}
              object={a}
              linkNodeFor={linkNodeFor}
              onOpen={() => open(single({ type: a.kind, id: a.id }))}
              menu={(onRename) =>
                actions.menuOf(a, { panel: { type: a.kind, id: a.id }, onRename, element: () => document.querySelector(`[data-card-id="${a.id}"]`) })
              }
            />
          ))}
        </div>
      )}
      {actions.dialogs}
    </div>
  )
}
