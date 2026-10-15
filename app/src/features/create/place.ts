// Where a new object goes (the floating Create button's path): which objects can stand at each part of
// the path, what a kind may be created in, and what creating does. Pure (place.test.ts).
import { canPlace, KIND_LABEL, type MockObject, type ObjectKind } from '../../mocks/projects'
import { isLinkTarget } from '../../mocks/projectsStore'

/** The five kinds that can be created (a project has its own flow), in the order of the Create modal's tabs */
export type CreateKind = Exclude<ObjectKind, 'project'>
export const CREATE_KINDS: CreateKind[] = ['note', 'article', 'object', 'map', 'folder']

/** A place: object ids from the top (e.g. a project) down to the last (e.g. a folder). []: no place / the top level */
export type Path = string[]

/** The path of an object: its parents from the top, then itself */
export function pathOf(objects: MockObject[], id: string): Path {
  const path: Path = []
  for (let o = objects.find((x) => x.id === id); o; o = objects.find((x) => x.id === o!.parentId)) path.unshift(o.id)
  return path
}

export type Eligible = { ok: true } | { ok: false; why: string }

/**
 * Whether a `kind` can be created at a place, `last` being the path's last object (null: no place):
 * - a note links to any link target (project, folder, map, object card), or to nothing
 * - a map is created in a project; the others where canPlace allows (an article in a folder too)
 */
export function eligibleFor(kind: CreateKind, last: MockObject | null): Eligible {
  if (kind === 'note') {
    return !last || isLinkTarget(last.kind) ? { ok: true } : { ok: false, why: `A note can't be linked to ${articleOf(last.kind)}` }
  }
  if (kind === 'map' && !last) return { ok: false, why: 'A map goes in a project: choose one in the path' }
  if (canPlace(kind, last?.kind ?? null)) return { ok: true }
  if (last?.kind === 'folder') return { ok: false, why: 'A folder only holds articles' }
  return { ok: false, why: `${KIND_LABEL[kind]} can't go in ${articleOf(last!.kind)}: choose a project or folder in the path` }
}

const articleOf = (kind: ObjectKind) => `${/^[aeiou]/i.test(KIND_LABEL[kind]) ? 'an' : 'a'} ${KIND_LABEL[kind].toLowerCase()}`

/**
 * What could stand at part `index` of the path (index = path.length: one level deeper), without the one
 * that's there now: the objects inside the part before it (the top level for index 0). Containers
 * (projects, folders) always; for a note, also what it can be linked to (maps, object cards).
 * `objects`: the visible ones.
 */
export function choicesAt(objects: MockObject[], path: Path, index: number, kind: CreateKind): MockObject[] {
  const parentId = index === 0 ? null : (path[index - 1] ?? null)
  // A leaf (a map, an object card) has nothing inside it
  const parent = parentId ? objects.find((o) => o.id === parentId) : null
  if (parent && parent.kind !== 'project' && parent.kind !== 'folder') return []
  return objects.filter(
    (o) =>
      o.parentId === parentId &&
      o.id !== path[index] &&
      (o.kind === 'project' || o.kind === 'folder' || (kind === 'note' && isLinkTarget(o.kind))),
  )
}

/** What creating does: a note is made at the top level and linked to the place; the rest are made in it */
export function resolveCreate(kind: CreateKind, path: Path): { parentId: string | null; linkTo: string | null } {
  const last = path.at(-1) ?? null
  return kind === 'note' ? { parentId: null, linkTo: last } : { parentId: last, linkTo: null }
}
