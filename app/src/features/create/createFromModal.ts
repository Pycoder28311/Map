import { findObject } from '../../mocks/projects'
import { createObjectOf } from '../../mocks/projectsStore'
import { resolveCreate, type CreateKind, type Path } from './place'

export type CreateFields = { title: string; description: string }

/**
 * What the Create modal does for a map or an object card: makes it in the place (first among its siblings). Never opens or navigates
 * anywhere. Returns what the toast says. (A note is made on the server, without a place: see CreateModal.)
 */
export function createFromModal(kind: CreateKind, path: Path, fields: CreateFields): { id: string; where: string | null } | null {
  const { parentId } = resolveCreate(path)
  const id = createObjectOf(kind, parentId, fields.title.trim() || 'Untitled', {
    description: kind === 'object' ? fields.description.trim() || undefined : undefined,
    first: true,
  })
  if (!id) return null
  return { id, where: parentId ? (findObject(parentId)?.name ?? null) : null }
}
