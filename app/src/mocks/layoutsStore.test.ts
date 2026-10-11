// MOCK DATA tests: deleted together with layoutsStore.ts
import { beforeEach, describe, expect, it } from 'vitest'
import type { WorkspaceLayout } from '../features/workspace/layout'
import {
  archiveLayout,
  deleteArchivedLayouts,
  deleteLayout,
  dropChanges,
  fromSaved,
  getLayoutsState,
  keepChanges,
  resetMockLayouts,
  restoreLayout,
  sameLayout,
  saveLayout,
  selectLayout,
  toSaved,
  updateLayout,
} from './layoutsStore'

const layout: WorkspaceLayout = {
  template: '3-left',
  panels: [{ type: 'map', id: 'm1' }, { type: 'note', id: 'n1' }, { type: 'dashboard' }],
}
const split = { x: 0.4, y: 0.6 }
const known = () => true

beforeEach(resetMockLayouts)

describe('layoutsStore', () => {
  it('keeps the minimal object and recreates the layout from it', () => {
    const saved = toSaved(layout, split)
    expect(saved).toEqual({ template: '3-left', panels: ['map:m1', 'note:n1', 'dashboard'], split: { x: 0.4, y: 0.6 } })
    expect(fromSaved(saved, known, () => true)).toEqual(layout)
  })

  it('leaves out panels that no longer exist and fixes the template', () => {
    const saved = toSaved(layout, split)
    expect(fromSaved(saved, known, (p) => p.id !== 'n1')).toEqual({
      template: '2-cols',
      panels: [{ type: 'map', id: 'm1' }, { type: 'dashboard' }],
    })
    expect(fromSaved(saved, known, () => false)).toBeNull()
  })

  it("keeps a 2×2 layout's uneven halves (and drops them elsewhere)", () => {
    const four: WorkspaceLayout = {
      template: '4',
      panels: [{ type: 'map', id: 'm1' }, { type: 'note', id: 'n1' }, { type: 'dashboard' }, { type: 'map', id: 'm2' }],
    }
    expect(toSaved(four, { x: 0.3, y: 0.5, x2: 0.7 }).split).toEqual({ x: 0.3, y: 0.5, x2: 0.7 })
    expect(toSaved(layout, { x: 0.3, y: 0.5, x2: 0.7 }).split).toEqual({ x: 0.3, y: 0.5 })
    const saved = toSaved(four, { x: 0.3, y: 0.5, x2: 0.7 })
    expect(sameLayout(saved, four, { x: 0.3, y: 0.5, x2: 0.7 })).toBe(true)
    expect(sameLayout(saved, four, { x: 0.3, y: 0.5 })).toBe(false)
    expect(sameLayout(toSaved(four, { x: 0.3, y: 0.5 }), four, { x: 0.3, y: 0.5, x2: 0.3 })).toBe(true)
  })

  it('keeps unsaved changes until they are saved, dropped or the layout is deleted', () => {
    const id = saveLayout(layout, split)
    const changed = { x: 0.5, y: 0.6 }
    keepChanges(id, layout, changed)
    keepChanges('nope', layout, changed) // no such layout: nothing
    expect(getLayoutsState().pending).toEqual({ [id]: { layout, split: changed } })
    dropChanges(id)
    expect(getLayoutsState().pending).toEqual({})

    keepChanges(id, layout, changed)
    updateLayout(id, layout, changed)
    expect(getLayoutsState().pending).toEqual({})
    expect(getLayoutsState().layouts[0].split).toEqual(changed)

    keepChanges(id, layout, split)
    deleteLayout(id)
    expect(getLayoutsState().pending).toEqual({})
  })

  it('compares shape, panels and sizes', () => {
    const saved = toSaved(layout, split)
    expect(sameLayout(saved, layout, { x: 0.4, y: 0.6 })).toBe(true)
    expect(sameLayout(saved, layout, { x: 0.5, y: 0.6 })).toBe(false)
    expect(sameLayout(saved, { ...layout, template: '3-right' }, split)).toBe(false)
  })

  it('saves (selected), updates, archives (deselects), restores and empties the trash', () => {
    const id = saveLayout(layout, split)
    expect(getLayoutsState().selectedId).toBe(id)
    updateLayout(id, { template: '2-rows', panels: layout.panels.slice(0, 2) }, { x: 0.5, y: 0.3 })
    expect(getLayoutsState().layouts[0]).toMatchObject({ template: '2-rows', panels: ['map:m1', 'note:n1'], split: { x: 0.5, y: 0.3 } })
    archiveLayout(id)
    expect(getLayoutsState()).toMatchObject({ selectedId: null, layouts: [{ archived: true }] })
    restoreLayout(id)
    expect(getLayoutsState().layouts[0].archived).toBe(false)
    selectLayout(id)
    archiveLayout(id)
    deleteArchivedLayouts()
    expect(getLayoutsState().layouts).toEqual([])
  })
})
