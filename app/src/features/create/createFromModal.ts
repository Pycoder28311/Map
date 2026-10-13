import { findObject } from '../../mocks/projects'
import { createObjectOf, linkNote } from '../../mocks/projectsStore'
import { resolveCreate, type CreateKind, type Path } from './place'

export type CreateFields = { title: string; text: string; description: string }

/**
 * What the Create modal does: makes the object (first among its siblings), and links a note to the
 * place. Never opens or navigates anywhere. Returns what the toast says.
 */
export function createFromModal(kind: CreateKind, path: Path, fields: CreateFields): { id: string; where: string | null } | null {
  const { parentId, linkTo } = resolveCreate(kind, path)
  const id = createObjectOf(kind, parentId, fields.title.trim() || 'Untitled', {
    text: kind === 'note' || kind === 'article' ? fields.text.trim() || undefined : undefined,
    description: kind === 'object' ? fields.description.trim() || undefined : undefined,
    first: true,
  })
  if (!id) return null
  if (kind === 'note' && linkTo) linkNote(id, linkTo)
  const place = parentId ?? linkTo
  return { id, where: place ? (findObject(place)?.name ?? null) : null }
}
