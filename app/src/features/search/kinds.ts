import type { ButtonIcon } from '../../components/ui/icons/IconSlot'
import { resourcesWith } from '../../resources/registry'

export type KindEntry = { kind: string; label: string; icon: ButtonIcon }

/** The kinds the search can filter by: every resource that turned search on (the registry) */
export const SEARCH_KINDS: KindEntry[] = resourcesWith('search').map((resource) => ({ kind: resource.panelType, label: resource.ui.plural, icon: resource.ui.icon }))

export const kindEntry = (kind: string) => SEARCH_KINDS.find((entry) => entry.kind === kind)
