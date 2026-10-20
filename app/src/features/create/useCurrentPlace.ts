import { findObject } from '../../mocks/projects'
import { getObjects, useMockObjects } from '../../mocks/projectsStore'
import { useWorkspace } from '../workspace/useWorkspace'
import { pathOf, type Path } from './place'

/** What a page can be for the Create button: somewhere to create in or link to */
const PLACE_TYPES = new Set(['project', 'map', 'object'])

/**
 * The place the page on screen is: one page open (an object's own page, also as /workspace?panels=…)
 * that is a project, map or object card → its path. Several panes, the Dashboard, the Notes
 * page… → none ([]): the Create button's path starts empty and the user picks.
 */
export function useCurrentPlace(): Path {
  useMockObjects() // a renamed, moved or archived object changes it
  const { layout } = useWorkspace()
  if (!layout || layout.panels.length !== 1) return []
  const panel = layout.panels[0]
  if (!panel.id || !PLACE_TYPES.has(panel.type) || !findObject(panel.id)) return []
  const visible = getObjects().filter((o) => findObject(o.id))
  return pathOf(visible, panel.id)
}
