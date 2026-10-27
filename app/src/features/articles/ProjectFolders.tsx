import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import { useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import BarPopover from '../../components/ui/overlays/BarPopover'
import { useResourceList, useResourceLists } from '../../lib/resource/hooks'
import { RESOURCES } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { CHILDREN, ROOTS } from '../dashboard/childResources'
import { groupByParent, groupByRoot, parentChain, type Entry } from '../dashboard/tree'
import { useWorkspace } from '../workspace/useWorkspace'

type Item = Entry['item']
/** An item of a folder was picked: it opens in this pane */
type Open = (resource: AnyResource, item: Item) => void

const keyOf = (entry: Entry) => `${entry.resource.name}:${entry.item.id}`
/** The resources that other items can be inside of, besides the projects (the folders) */
const FOLDERS = CHILDREN.filter((r) => RESOURCES.some((o) => o.parents?.some((p) => p.resource === r.name)))

/**
 * Every folder of the article's project (the subfolders too), each a button that opens what is inside it. The lists are the ones the
 * Dashboard and the sidebar hold (one store entry each): a folder's items are taken from them when they hold everything, else read once
 * when the folder is opened (and kept for the next time). Nothing shows for an article that is not in a project.
 */
export default function ProjectFolders({ resource, item }: { resource: AnyResource; item: Item }) {
  const roots = useResourceLists(ROOTS, { limit: PAGE_SIZE_DEFAULT })
  const kids = useResourceLists(CHILDREN, { limit: PAGE_SIZE_DEFAULT })
  const workspace = useWorkspace()
  const [openKey, setOpenKey] = useState<string | null>(null)

  const entries = [...roots.lists, ...kids.lists].flatMap(({ resource: r, items }) => items.map((i) => ({ resource: r, item: i }) as Entry))
  const self: Entry = { resource, item }
  const chain = parentChain(entries, self)
  const project = chain[0]
  if (!project || !ROOTS.includes(project.resource)) return null

  const inProject = groupByRoot(entries, [{ resource: project.resource, items: [project.item] }]).byRoot.get(keyOf(project)) ?? []
  const folders = inProject.filter((e) => FOLDERS.includes(e.resource))
  if (folders.length === 0) return null
  const within = new Set(chain.map(keyOf))
  const held = groupByParent(entries)
  const complete = kids.ready && !kids.hasMore

  return (
    <nav aria-label="Folders of the project" className="flex min-w-0 flex-wrap items-center gap-1">
      {folders.map((folder) => {
        const key = keyOf(folder)
        const open = openKey === key
        return (
          <div key={key} className="relative">
            <BarPopover
              label={`In ${folder.resource.ui.row.title(folder.item)}`}
              open={open}
              onOpenChange={(next) => setOpenKey(next ? key : null)}
              trigger={
                <Button
                  variant={within.has(key) ? 'selected' : 'ghost'}
                  size="sm"
                  plain
                  filled
                  icon={folder.resource.ui.icon}
                  aria-expanded={open}
                  onClick={() => setOpenKey(open ? null : key)}
                >
                  {folder.resource.ui.row.title(folder.item)}
                  <LuChevronDown aria-hidden className={`size-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? '-rotate-180' : ''}`} />
                </Button>
              }
            >
              <FolderItems folder={folder} local={complete ? (held.get(key) ?? []) : null}
                onOpen={(target, picked) => {
                  setOpenKey(null)
                  if (target.surfaces.panel) workspace.replace({ type: resource.panelType, id: String(item.id) }, { type: target.panelType, id: String(picked.id) })
                }}
              />
            </BarPopover>
          </div>
        )
      })}
    </nav>
  )
}

/** What is inside a folder: `local` when the held lists have it all, else read from the server (once: the store keeps it) */
function FolderItems({ folder, local, onOpen }: { folder: Entry; local: Entry[] | null; onOpen: Open }) {
  const childResources = CHILDREN.filter((r) => r.parents?.some((p) => p.resource === folder.resource.name))
  const reading = local === null
  return (
    <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
      {childResources.map((r) => (
        <FolderResourceItems key={r.name} folder={folder} resource={r} local={local?.filter((e) => e.resource === r) ?? null} onOpen={onOpen} />
      ))}
      {!reading && local.length === 0 && <li className="px-2 py-1 text-small text-fg-subtle">Empty</li>}
    </ul>
  )
}

function FolderResourceItems({ folder, resource, local, onOpen }: { folder: Entry; resource: AnyResource; local: Entry[] | null; onOpen: Open }) {
  const type = resource.parents!.find((p) => p.resource === folder.resource.name)!.type
  const read = useResourceList(resource, { filter: { objectType: type, objectId: Number(folder.item.id) }, enabled: local === null })
  const items = local ? local.map((e) => e.item) : (read.items as Item[])
  return (
    <>
      {local === null && read.status === 'loading' && <li className="px-2 py-1 text-small text-fg-subtle">Loading…</li>}
      {items.map((i) => (
        <li key={i.id}>
          <Button variant="ghost" size="sm" icon={resource.ui.icon} onClick={() => onOpen(resource, i)} className="w-full justify-start">
            {resource.ui.row.title(i)}
          </Button>
        </li>
      ))}
    </>
  )
}
