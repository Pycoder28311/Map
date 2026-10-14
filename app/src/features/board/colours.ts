// The colours of a selection and changing one of them. Pure (colours.test.ts).
import type { Change, Patch } from './changes'
import type { BoardObject } from './types'

const key = (color: string) => color.toLowerCase()

/** The distinct colours (lower case, first seen first): strokes, fills, and an area's per-edge colours */
export function coloursOf(objects: BoardObject[]): string[] {
  const colours: string[] = []
  const add = (color: string) => {
    if (!colours.includes(key(color))) colours.push(key(color))
  }
  for (const o of objects) {
    if (o.kind === 'line' || o.kind === 'border' || o.kind === 'shape') add(o.style.color)
    if ((o.kind === 'shape' || o.kind === 'border') && o.fill) add(o.fill.color)
    if (o.kind === 'border') for (const run of o.edges ?? []) add(run.color)
    if (o.kind === 'point') add(o.color)
    if (o.kind === 'text') {
      add(o.color)
      for (const run of o.runs ?? []) if (run.color) add(run.color)
    }
  }
  return colours
}

/** How many of the objects use the colour */
export const countOf = (objects: BoardObject[], color: string) => objects.filter((o) => coloursOf([o]).includes(key(color))).length

/** Every use of `from` becomes `to` */
export function recolour(objects: BoardObject[], from: string, to: string): Change {
  const update: { id: number; patch: Patch }[] = []
  for (const o of objects) {
    if (o.kind === 'point') {
      if (key(o.color) === key(from)) update.push({ id: o.id, patch: { color: to } })
      continue
    }
    if (o.kind === 'text') {
      const patch: Patch = {}
      if (key(o.color) === key(from)) patch.color = to
      if (o.runs?.some((r) => r.color && key(r.color) === key(from))) patch.runs = o.runs.map((r) => (r.color && key(r.color) === key(from) ? { ...r, color: to } : r))
      if (Object.keys(patch).length) update.push({ id: o.id, patch })
      continue
    }
    if (o.kind !== 'line' && o.kind !== 'border' && o.kind !== 'shape') continue
    const patch: Patch = {}
    if (key(o.style.color) === key(from)) patch.style = { ...o.style, color: to }
    if ((o.kind === 'shape' || o.kind === 'border') && o.fill && key(o.fill.color) === key(from)) patch.fill = { ...o.fill, color: to }
    if (o.kind === 'border' && o.edges?.some((r) => key(r.color) === key(from))) patch.edges = o.edges.map((r) => (key(r.color) === key(from) ? { ...r, color: to } : r))
    if (Object.keys(patch).length) update.push({ id: o.id, patch })
  }
  return { update }
}
