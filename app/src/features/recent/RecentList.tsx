import type { ReactNode } from 'react'
import { LuLayoutTemplate, LuPanelsTopLeft } from 'react-icons/lu'
import { authClient } from '../../lib/auth-client'
import { fromSaved, selectLayout, useLayoutsState } from '../../mocks/layoutsStore'
import { resourceByPanelType } from '../../resources/registry'
import { LinkRow, Rows, useOpenLayout } from '../objects/ListRows'
import { parsePanelKey, single, type WorkspaceLayout } from '../workspace/layout'
import { usePanelRegistry } from '../workspace/registryContext'
import { setSplit } from '../workspace/split'
import type { PanelRef } from '../workspace/types'
import { useWorkspace } from '../workspace/useWorkspace'
import ResourceRecentRow from './ResourceRecentRow'
import { useRecent, type RecentEntry } from './recentStore'

type Props = {
  /** Rows shown before "Show all" (default: 3) */
  limit?: number
  /** "Show all" goes there (e.g. the Dashboard, from the navbar) */
  allHref?: string
  /** Called after a row opened something (e.g. to close the popout it's in) */
  afterOpen?: () => void
  /** Keeps drag and link ids unique where it's shown */
  place: string
}

/**
 * What the user opened lately, newest first (recentStore.ts): items (draggable, like everywhere),
 * pages, combinations of panes and saved layouts. Gone ones are left out. On the Dashboard (a column)
 * and in the navbar (Recent History).
 */
export default function RecentList({ limit, allHref, afterOpen, place }: Props) {
  const { data: session } = authClient.useSession()
  const entries = useRecent(session?.user.id)
  const { layouts } = useLayoutsState()
  const registry = usePanelRegistry()
  const workspace = useWorkspace()
  const openLayout = useOpenLayout()
  const open = (layout: WorkspaceLayout) => {
    openLayout(layout)
    afterOpen?.()
  }

  // A resource's item (a note) is checked when its row shows: a gone one removes its entry (ResourceRecentRow)
  // A resource's ids are numbers: an older id (a mock "m1") is never asked for, it is just left out
  const exists = (panel: PanelRef) => {
    if (!(panel.type in registry)) return false
    if (!panel.id) return true
    return resourceByPanelType(panel.type) !== undefined && /^\d+$/.test(panel.id)
  }
  const title = (panel: PanelRef) => registry[panel.type]?.title(panel.id) ?? 'Missing'

  const rowOf = (entry: RecentEntry): ReactNode => {
    if (entry.kind === 'layout') {
      const saved = layouts.find((l) => l.id === entry.layoutId && !l.archived)
      const next = saved && fromSaved(saved, (type) => type in registry, exists)
      if (!saved || !next) return null
      return (
        <LinkRow
          icon={LuLayoutTemplate}
          label="Layout"
          hint={next.panels.map(title).join(' · ')}
          onOpen={() => {
            setSplit(saved.split)
            workspace.openLayout(next)
            selectLayout(saved.id)
            afterOpen?.()
          }}
        />
      )
    }

    const panels = entry.panels.map(parsePanelKey).filter((p): p is PanelRef => p !== null && exists(p))
    if (panels.length === 0) return null
    if (panels.length === 1) {
      const panel = panels[0]
      const resource = resourceByPanelType(panel.type)
      if (resource && panel.id) {
        return <ResourceRecentRow resource={resource} id={panel.id} entryKey={entry.key} userId={session?.user.id} place={place} open={openLayout} afterOpen={afterOpen} />
      }
      const Icon = registry[panel.type].icon
      return <LinkRow icon={Icon} label={title(panel)} onOpen={() => open(single(panel))} />
    }
    // A combination of panes (some may be gone: shown without them)
    const layout: WorkspaceLayout =
      panels.length === entry.panels.length ? { template: entry.template, panels } : { template: '2-cols', panels: panels.slice(0, 2) }
    return <LinkRow icon={LuPanelsTopLeft} label={panels.map(title).join(' · ')} hint={`${panels.length} panes`} onOpen={() => open(layout)} />
  }

  const rows = entries.map((entry) => rowOf(entry)).filter((row) => row !== null)
  return <Rows rows={rows} empty="Nothing opened yet." limit={limit} allHref={allHref} />
}
