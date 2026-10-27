import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import Breadcrumbs, { type Crumb } from '../../components/ui/links/Breadcrumbs'
import { useResourceLists } from '../../lib/resource/hooks'
import type { AnyResource } from '../../resources/types'
import { CHILDREN, ROOTS } from '../dashboard/childResources'
import { groupByParent, parentChain, type Entry } from '../dashboard/tree'
import { useWorkspace } from '../workspace/useWorkspace'

const keyOf = (entry: Entry) => `${entry.resource.name}:${entry.item.id}`

/**
 * Where the article is: its project, the folders it is in, then the article itself; each with its siblings to go to instead (in this
 * pane). The lists are the ones the Dashboard and the sidebar hold (one store entry each), so nothing is read when they are loaded.
 */
export default function ArticleBreadcrumbs({ resource, item }: { resource: AnyResource; item: Entry['item'] }) {
  const roots = useResourceLists(ROOTS, { limit: PAGE_SIZE_DEFAULT })
  const kids = useResourceLists(CHILDREN, { limit: PAGE_SIZE_DEFAULT })
  const workspace = useWorkspace()

  const entries = [...roots.lists, ...kids.lists].flatMap(({ resource: r, items }) => items.map((i) => ({ resource: r, item: i }) as Entry))
  const self: Entry = { resource, item }
  const byParent = groupByParent(entries)
  const siblingsOf = (entry: Entry): Entry[] => {
    const parent = entry.resource.parents?.find((p) => p.type === entry.item.objectType)
    const found =
      parent && entry.item.objectId != null
        ? (byParent.get(`${parent.resource}:${entry.item.objectId}`) ?? [])
        : ROOTS.includes(entry.resource)
          ? entries.filter((e) => e.resource === entry.resource)
          : entries.filter((e) => !ROOTS.includes(e.resource) && e.item.objectType == null)
    // Itself is always a choice (a list may not have it yet)
    return found.some((e) => keyOf(e) === keyOf(entry)) ? found : [entry, ...found]
  }
  const chain = [...parentChain(entries, self), self]
  const crumbs: Crumb[] = chain.map((entry) => ({
    label: entry.resource.ui.label,
    value: keyOf(entry),
    options: siblingsOf(entry).map((e) => ({ value: keyOf(e), label: e.resource.ui.row.title(e.item), icon: e.resource.ui.icon })),
  }))

  const pick = (index: number, value: string) => {
    const entry = chain[index]
    if (!entry || value === keyOf(entry)) return
    const [name, id] = value.split(':')
    const target = [...ROOTS, ...CHILDREN].find((r) => r.name === name)
    if (!target?.surfaces.panel) return
    workspace.replace({ type: resource.panelType, id: String(item.id) }, { type: target.panelType, id })
  }

  return <Breadcrumbs crumbs={crumbs} onPick={pick} className="text-small" />
}
