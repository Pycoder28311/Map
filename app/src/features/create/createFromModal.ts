import { KIND_LABEL, type ObjectKind } from '../../mocks/projects'
import { createObjectOf } from '../../mocks/projectsStore'

/** The kinds the Create modal makes in the mock store (projects and notes are made on the server, see CreateModal), in the order of its tabs */
export const CREATE_KINDS: ObjectKind[] = ['object', 'map']

export type CreateFields = { title: string; description: string }

/**
 * What the Create modal does for a map or an object card: makes it, first among the objects. Never opens or navigates anywhere.
 * Returns its id.
 */
export function createFromModal(kind: ObjectKind, fields: CreateFields): { id: string } {
  const id = createObjectOf(kind, fields.title.trim() || `Untitled ${KIND_LABEL[kind].toLowerCase()}`, {
    description: kind === 'object' ? fields.description.trim() || undefined : undefined,
    first: true,
  })
  return { id }
}
