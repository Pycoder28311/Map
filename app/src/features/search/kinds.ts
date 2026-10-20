import type { ButtonIcon } from '../../components/ui/icons/IconSlot'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { resourcesWith } from '../../resources/registry'

export type KindEntry = { kind: string; label: string; icon: ButtonIcon }

/** The kinds the search can filter by: the mock objects' and, from the registry, every resource that turned search on */
export const SEARCH_KINDS: KindEntry[] = [
  { kind: 'project', label: 'Projects', icon: KIND_ICON.project },
  { kind: 'object', label: 'Object cards', icon: KIND_ICON.object },
  { kind: 'map', label: 'Maps', icon: KIND_ICON.map },
  ...resourcesWith('search').map((resource) => ({ kind: resource.panelType, label: resource.ui.plural, icon: resource.ui.icon })),
]

export const kindEntry = (kind: string) => SEARCH_KINDS.find((entry) => entry.kind === kind)
