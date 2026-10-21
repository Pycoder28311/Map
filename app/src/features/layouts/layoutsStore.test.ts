import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceLayout } from '../workspace/layout'

// The resource's actions are the requests: here they are spies, so the layouts' own rules are what is tested
const actions = vi.hoisted(() => ({
  create: vi.fn(async (fields: Record<string, unknown>) => ({ id: 7, ...fields })),
  update: vi.fn(async (_id: number, _fields: Record<string, unknown>) => ({})),
  remove: vi.fn(async (_id: number) => undefined),
  trash: vi.fn(async (_id: number) => ({})),
  restore: vi.fn(async (_id: number) => ({})),
}))
vi.mock('../../lib/resource/hooks', () => ({ actionsOf: () => actions, useResourceList: () => ({ items: [], status: 'ready', refresh: () => {} }) }))

import {
  archiveLayout,
  deleteLayout,
  dropChanges,
  fromRow,
  fromSaved,
  getLayoutsUi,
  keepChanges,
  resetLayoutsUi,
  restoreLayout,
  sameLayout,
  saveLayout,
  selectLayout,
  toFields,
  toSaved,
  updateLayout,
} from './layoutsStore'

const layout: WorkspaceLayout = {
  template: '3-left',
  panels: [{ type: 'map', id: '1' }, { type: 'note', id: '2' }, { type: 'dashboard' }],
}
const split = { x: 0.4, y: 0.6 }
const known = () => true

beforeEach(() => {
  resetLayoutsUi()
  Object.values(actions).forEach((spy) => spy.mockClear())
})

describe('layouts', () => {
  it('keeps the minimal object and recreates the layout from it', () => {
    const saved = toSaved(layout, split)
    expect(saved).toEqual({ template: '3-left', panels: ['map:1', 'note:2', 'dashboard'], split: { x: 0.4, y: 0.6 } })
    expect(fromSaved(saved, known, () => true)).toEqual(layout)
  })

  it('leaves out panels that no longer exist and fixes the template', () => {
    const saved = toSaved(layout, split)
    expect(fromSaved(saved, known, (p) => p.id !== '2')).toEqual({
      template: '2-cols',
      panels: [{ type: 'map', id: '1' }, { type: 'dashboard' }],
    })
    expect(fromSaved(saved, known, () => false)).toBeNull()
  })

  it("keeps a 2×2 layout's uneven halves (and drops them elsewhere)", () => {
    const four: WorkspaceLayout = {
      template: '4',
      panels: [{ type: 'map', id: '1' }, { type: 'note', id: '2' }, { type: 'dashboard' }, { type: 'map', id: '3' }],
    }
    expect(toSaved(four, { x: 0.3, y: 0.5, x2: 0.7 }).split).toEqual({ x: 0.3, y: 0.5, x2: 0.7 })
    expect(toSaved(layout, { x: 0.3, y: 0.5, x2: 0.7 }).split).toEqual({ x: 0.3, y: 0.5 })
    const saved = toSaved(four, { x: 0.3, y: 0.5, x2: 0.7 })
    expect(sameLayout(saved, four, { x: 0.3, y: 0.5, x2: 0.7 })).toBe(true)
    expect(sameLayout(saved, four, { x: 0.3, y: 0.5 })).toBe(false)
    expect(sameLayout(toSaved(four, { x: 0.3, y: 0.5 }), four, { x: 0.3, y: 0.5, x2: 0.3 })).toBe(true)
  })

  it('compares shape, panels and sizes', () => {
    const saved = toSaved(layout, split)
    expect(sameLayout(saved, layout, { x: 0.4, y: 0.6 })).toBe(true)
    expect(sameLayout(saved, layout, { x: 0.5, y: 0.6 })).toBe(false)
    expect(sameLayout(saved, { ...layout, template: '3-right' }, split)).toBe(false)
  })
})

describe('the table row', () => {
  it('turns a layout into the fields of its row and back: panes in four fields, lines in thousandths, 0 for a joined half', () => {
    const saved = toSaved(layout, split)
    const fields = toFields(saved)
    expect(fields).toEqual({
      template: '3-left',
      splitX: 400,
      splitY: 600,
      splitX2: 0,
      splitY2: 0,
      panelA: 'map:1',
      panelB: 'note:2',
      panelC: 'dashboard',
      panelD: '',
    })
    expect(fromRow({ id: 5, ...fields, archived: false })).toEqual({ id: '5', ...saved, archived: false })
  })

  it('keeps the uneven halves of a 2×2 layout through the row, and a line within a hair of its value', () => {
    const four = toSaved({ template: '4', panels: ['a', 'b', 'c', 'd'].map((type) => ({ type })) }, { x: 0.333, y: 0.5, y2: 0.7 })
    const back = fromRow({ id: 1, ...toFields(four), archived: false })
    expect(back.split).toEqual({ x: 0.333, y: 0.5, y2: 0.7 })
    expect(back.panels).toEqual(['a', 'b', 'c', 'd'])
    expect(sameLayout(back, { template: '4', panels: ['a', 'b', 'c', 'd'].map((type) => ({ type })) }, { x: 0.3334, y: 0.5, y2: 0.7 })).toBe(true)
  })
})

describe('UI state of this tab', () => {
  it('keeps unsaved changes until they are dropped', () => {
    const changed = { x: 0.5, y: 0.6 }
    keepChanges('5', layout, changed)
    expect(getLayoutsUi().pending).toEqual({ '5': { layout, split: changed } })
    dropChanges('5')
    expect(getLayoutsUi().pending).toEqual({})
  })
})

describe('changes (one request each)', () => {
  it('saves a new layout with its fields and selects it', async () => {
    expect(await saveLayout(layout, split)).toBe('7')
    expect(actions.create).toHaveBeenCalledWith(toFields(toSaved(layout, split)))
    expect(getLayoutsUi().selectedId).toBe('7')
  })

  it('updates a layout with its new panes and lines, and drops its kept changes', async () => {
    keepChanges('7', layout, split)
    await updateLayout('7', { template: '2-rows', panels: layout.panels.slice(0, 2) }, { x: 0.5, y: 0.3 })
    expect(actions.update).toHaveBeenCalledWith(7, expect.objectContaining({ template: '2-rows', panelA: 'map:1', panelB: 'note:2', panelC: '', splitX: 500, splitY: 300 }))
    expect(getLayoutsUi().pending).toEqual({})
  })

  it('keeps the changes again when the server refuses to save them', async () => {
    actions.update.mockRejectedValueOnce(new Error('refused'))
    keepChanges('7', layout, split)
    await expect(updateLayout('7', layout, split)).rejects.toThrow('refused')
    expect(getLayoutsUi().pending['7']).toEqual({ layout, split })
  })

  it('archives (deselects) and restores through the resource', async () => {
    selectLayout('7')
    await archiveLayout('7')
    expect(actions.trash).toHaveBeenCalledWith(7)
    expect(getLayoutsUi().selectedId).toBeNull()
    await restoreLayout('7')
    expect(actions.restore).toHaveBeenCalledWith(7)
  })

  it('deletes for good, and only then forgets the selection and the kept changes', async () => {
    selectLayout('7')
    keepChanges('7', layout, split)
    actions.remove.mockRejectedValueOnce(new Error('refused'))
    await expect(deleteLayout('7')).rejects.toThrow('refused')
    expect(getLayoutsUi().selectedId).toBe('7')
    await deleteLayout('7')
    expect(actions.remove).toHaveBeenLastCalledWith(7)
    expect(getLayoutsUi()).toMatchObject({ selectedId: null, pending: {} })
  })
})
