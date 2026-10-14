import { findObject } from '../../mocks/projects'
import type { BoardObject, Link } from './types'

/** What a link points at, for the list: the sidebar object's name, or the board object's */
export function linkName(link: Link, board: BoardObject[]) {
  if (link.to === 'sidebar') return findObject(link.id)?.name ?? 'Missing object'
  const target = board.find((o) => o.id === link.id)
  return target ? target.name || `${target.kind} ${target.id}` : 'Missing object'
}
