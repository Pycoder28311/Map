import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import { useMemo, type ReactNode } from 'react'
import Button from '../../../components/ui/buttons/Button'
import { useResourceLists } from '../../../lib/resource/hooks'
import { compareEntries } from '../../../lib/resource/reorder'
import type { AnyResource } from '../../../resources/types'
import { useOpenLayout } from '../../objects/ListRows'
import { single } from '../../workspace/layout'
import { CHILDREN, ROOTS } from '../childResources'
import ItemCard from '../ItemCard'
import { groupByRoot, type Entry } from '../tree'
import ArticleCard from './ArticleCard'

type Item = Record<string, unknown> & { id: number | string }

/**
 * Under the Create buttons: a block per project, its name as the heading, then two boxes side by side: Articles (the project's articles,
 * also those inside its folders, as crimson cards: ArticleCard) and Maps (every map: maps belong to no project). The articles in no
 * project get a last block of their own. The lists are the ones the sidebar already holds (useResourceLists: one request each, shared).
 */
export default function ProjectBoards() {
  const open = useOpenLayout()
  const roots = useResourceLists(ROOTS, { limit: PAGE_SIZE_DEFAULT })
  const kids = useResourceLists(CHILDREN, { limit: PAGE_SIZE_DEFAULT })

  const articles = kids.lists.find((l) => l.resource.name === 'articles')
  const maps = kids.lists.find((l) => l.resource.name === 'maps')

  const { byRoot, orphans } = useMemo(
    () =>
      groupByRoot(
        kids.lists.flatMap(({ resource, items }) => items.map((item) => ({ resource, item }) as Entry)),
        roots.lists.map(({ resource, items }) => ({ resource, items: items as Item[] })),
      ),
    [kids.lists, roots.lists],
  )
  const onlyArticles = (entries: Entry[]) => entries.filter((e) => e.resource.name === 'articles').sort(compareEntries)

  const blocks = [
    ...roots.lists.flatMap(({ resource, items }) =>
      (items as Item[]).map((item) => ({ key: `${resource.name}:${item.id}`, title: resource.ui.row.title(item), articles: onlyArticles(byRoot.get(`${resource.name}:${item.id}`) ?? []) })),
    ),
  ]
  const loose = onlyArticles(orphans)
  // The articles in no project: a block of their own, last (or the only block, titled "Project", when there are no projects yet)
  if (loose.length > 0 || blocks.length === 0) blocks.push({ key: 'none', title: blocks.length === 0 ? 'Project' : 'No project', articles: loose })

  const openItem = (resource: AnyResource, id: number | string) => open(single({ type: resource.panelType, id: String(id) }))
  const mapItems = ((maps?.items ?? []) as Item[]).map((item) => ({ resource: maps!.resource, item }) as Entry).sort(compareEntries)
  const ready = roots.ready && kids.ready

  return (
    <div className="flex flex-col gap-16">
      {blocks.map((block) => (
        <section key={block.key} aria-label={block.title} className="flex flex-col gap-6">
          <h2 className="text-center text-4xl font-semibold tracking-tight">{block.title}</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-0">
            <Column title="Articles" count={block.articles.length} side="left">
              {!ready ? (
                <Empty>Loading…</Empty>
              ) : block.articles.length === 0 ? (
                <Empty>No articles here yet</Empty>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-x-5 gap-y-7 p-2">
                  {block.articles.map(({ resource, item }) => (
                    <ArticleCard key={`${resource.name}:${item.id}`} resource={resource} item={item} onOpen={() => openItem(resource, item.id)} />
                  ))}
                </div>
              )}
            </Column>
            <Column title="Maps" count={mapItems.length} side="right">
              {!ready ? (
                <Empty>Loading…</Empty>
              ) : mapItems.length === 0 ? (
                <Empty>No maps yet</Empty>
              ) : (
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-10 p-2 pb-6">
                  {mapItems.map(({ resource, item }) => (
                    <ItemCard key={`${resource.name}:${item.id}`} resource={resource} item={item as Item & { createdAt?: string }} onOpen={() => openItem(resource, item.id)} />
                  ))}
                </div>
              )}
            </Column>
          </div>
        </section>
      ))}
      {(kids.hasMore || (articles?.hasMore ?? false)) && (
        <Button variant="text" onClick={kids.loadMore} className="self-center">
          Load more
        </Button>
      )}
    </div>
  )
}

/** One of the two boxes of a project block: its name above it (as in the sketch), its cards inside a framed box */
function Column({ title, count, side, children }: { title: string; count: number; side: 'left' | 'right'; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="px-4 text-heading font-semibold">
        {title} <span className="text-body font-normal text-fg-subtle">{count}</span>
      </h3>
      <div
        className={`min-h-[16rem] flex-1 border-2 border-line-strong bg-surface/40 p-4 backdrop-blur-sm ${
          side === 'left' ? 'rounded-(--card-radius) md:rounded-e-none' : 'rounded-(--card-radius) md:-ms-[2px] md:rounded-s-none'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="flex h-full min-h-[14rem] items-center justify-center text-body text-fg-subtle">{children}</p>
}
