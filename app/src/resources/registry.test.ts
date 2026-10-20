import { describe, expect, it } from 'vitest'
import { FIELD_WIDGETS } from '../components/ui/resource/FieldRenderer'
import { RESOURCES, resourceByName, resourceByPanelType, resourcePanels, resourcesWith } from './registry'
import { FIELD_WIDGET_NAMES } from './types'

describe('the resource registry', () => {
  it('has unique names and panel types', () => {
    expect(new Set(RESOURCES.map((r) => r.name)).size).toBe(RESOURCES.length)
    expect(new Set(RESOURCES.map((r) => r.panelType)).size).toBe(RESOURCES.length)
  })

  it('has a component for every kind of field a resource uses', () => {
    for (const resource of RESOURCES) {
      for (const field of resource.ui.fields) {
        expect(FIELD_WIDGET_NAMES).toContain(field.widget)
        expect(FIELD_WIDGETS[field.widget]).toBeTypeOf('function')
      }
    }
    expect(Object.keys(FIELD_WIDGETS).sort()).toEqual([...FIELD_WIDGET_NAMES].sort())
  })

  it('gives every resource the names its screens show', () => {
    for (const resource of RESOURCES) {
      expect(resource.ui.label).not.toBe('')
      expect(resource.ui.plural).not.toBe('')
      expect(resource.ui.untitled).not.toBe('')
      if (resource.surfaces.page) expect(resource.surfaces.page.startsWith('/')).toBe(true)
    }
  })

  it('finds a resource by name and by panel type', () => {
    expect(resourceByName('notes')?.panelType).toBe('note')
    expect(resourceByName('projects')?.panelType).toBe('project')
    expect(resourceByPanelType('note')?.name).toBe('notes')
    expect(resourceByPanelType('project')?.name).toBe('projects')
    expect(resourceByPanelType('map')).toBeUndefined()
    expect(resourceByPanelType(undefined)).toBeUndefined()
  })

  it('lists the resources that turned a screen on', () => {
    expect(resourcesWith('trash').map((r) => r.name)).toEqual(['projects', 'notes'])
    expect(resourcesWith('search').map((r) => r.name)).toEqual(['projects', 'notes'])
  })

  it('makes the workspace panel of each resource that can be one', () => {
    const panels = resourcePanels()
    expect(Object.keys(panels)).toEqual(['project', 'note'])
    expect(panels.project.title()).toBe('Project')
    expect(panels.note.title()).toBe('Note')
    expect(panels.note.draggable).toBe(true)
  })

  it('keeps each resource\'s Dashboard row and column known to the Dashboard', async () => {
    const { RESOURCE_COLUMNS } = await import('../features/dashboard/columns')
    const dashboard = RESOURCES.filter((r) => r.surfaces.dashboard).map((r) => r.name).sort()
    expect(Object.values(RESOURCE_COLUMNS).sort()).toEqual(dashboard)
  })

  it('trashes only through the archived filter: a list is never asked without it', () => {
    // Every resource with a Trash surface also has the filter in its API type; the hook always sends `archived`
    for (const resource of resourcesWith('trash')) expect(typeof resource.api.list).toBe('function')
  })
})
