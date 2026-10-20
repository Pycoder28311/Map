// Where a new object goes (the floating Create button's path): which objects can stand at each part of
// the path, what a kind may be created in, and what creating does. Pure (place.test.ts).
// (Notes are not here: they come from the server and are made without a place, resources/notes.)
import { canPlace, KIND_LABEL, type MockObject, type ObjectKind } from '../../mocks/projects'

/** The kinds that can be created here (a project has its own flow), in the order of the Create modal's tabs */
export type CreateKind = Exclude<ObjectKind, 'project'>
export const CREATE_KINDS: CreateKind[] = ['object', 'map']

/** A place: object ids from the top (a project) down to the last. []: no place / the top level */
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
 * a map is created in a project; an object card where canPlace allows (the top level or a project)
 */
export function eligibleFor(kind: CreateKind, last: MockObject | null): Eligible {
  if (kind === 'map' && !last) return { ok: false, why: 'A map goes in a project: choose one in the path' }
  if (canPlace(kind, last?.kind ?? null)) return { ok: true }
  return { ok: false, why: `${KIND_LABEL[kind]} can't go in ${articleOf(last!.kind)}: choose a project in the path` }
}

const articleOf = (kind: ObjectKind) => `${/^[aeiou]/i.test(KIND_LABEL[kind]) ? 'an' : 'a'} ${KIND_LABEL[kind].toLowerCase()}`

/**
 * What could stand at part `index` of the path (index = path.length: one level deeper), without the one
 * that's there now: the projects inside the part before it (the top level for index 0).
 * `objects`: the visible ones.
 */
export function choicesAt(objects: MockObject[], path: Path, index: number): MockObject[] {
  const parentId = index === 0 ? null : (path[index - 1] ?? null)
  // A leaf (a map, an object card) has nothing inside it
  const parent = parentId ? objects.find((o) => o.id === parentId) : null
  if (parent && parent.kind !== 'project') return []
  return objects.filter((o) => o.parentId === parentId && o.id !== path[index] && o.kind === 'project')
}

/** What creating does: the object is made inside the place (the last part of the path), or at the top level */
export function resolveCreate(path: Path): { parentId: string | null } {
  return { parentId: path.at(-1) ?? null }
}
