import { DATA, TABLE_NAMES } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { FIELD_WIDGETS } from '../components/ui/resource/FieldRenderer'
import { MOCK_TABLE_NAMES } from './mock.config'
import { RESOURCES, resourceByName, resourceByPanelType, resourcePages, resourcePanels, resourcesWith } from './registry'
import { RESOURCE_UI } from './resources.config'
import { FIELD_WIDGET_NAMES } from './types'

describe('the resource registry', () => {
  it('has a resource for every table of the data config and every mock table, in the UI config\'s order', () => {
    expect(RESOURCES.map((r) => r.name)).toEqual(Object.keys(RESOURCE_UI))
    expect([...RESOURCES.map((r) => r.name)].sort()).toEqual([...TABLE_NAMES, ...MOCK_TABLE_NAMES].sort())
  })

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

  it('makes each table\'s form from its fields: the title as heading, plain text as a textarea, hidden ones left out', () => {
    expect(resourceByName('folders')!.ui.fields.map((f) => [f.name, f.widget, f.heading ?? false])).toEqual([
      ['title', 'text', true],
      ['description', 'textarea', false],
    ])
    expect(resourceByName('notes')!.ui.fields.map((f) => f.widget)).toEqual(['text', 'richText'])
    expect(resourceByName('maps')!.ui.fields.map((f) => f.name)).toEqual(['title'])
  })

  it('names a row by its title, or untitled; its line under it is the preview or the description', () => {
    const notes = resourceByName('notes')!
    expect(notes.ui.row.title({ id: 1, title: '  ' })).toBe('Untitled note')
    expect(notes.ui.row.subtitle?.({ id: 1, title: 't', preview: 'first words' })).toBe('first words')
    expect(resourceByName('folders')!.ui.row.subtitle?.({ id: 1, title: 't', description: 'about' })).toBe('about')
    expect(notes.ui.row.pinned?.({ id: 1, pinned: true })).toBe(true)
  })

  it('puts a written item into the lists without the field its preview stands for', () => {
    expect(resourceByName('articles')!.list!.toItem({ id: 1, title: 't', content: '<p>x</p>', preview: 'x' })).toEqual({ id: 1, title: 't', preview: 'x' })
    expect(resourceByName('folders')!.list!.toItem({ id: 1, title: 't', description: 'd' })).toEqual({ id: 1, title: 't', description: 'd' })
    expect(resourceByName('notes')!.list!.order).toEqual(DATA.notes.order)
  })

  it('finds a resource by name and by panel type', () => {
    expect(resourceByName('notes')?.panelType).toBe('note')
    expect(resourceByPanelType('object')?.name).toBe('objectCards')
    expect(resourceByPanelType('map')?.name).toBe('maps')
    expect(resourceByPanelType('dashboard')).toBeUndefined()
    expect(resourceByPanelType(undefined)).toBeUndefined()
  })

  it('lists the resources that turned a screen on, and knows which can have a parent', () => {
    expect(resourcesWith('trash').map((r) => r.name)).toEqual(['projects', 'notes', 'folders', 'articles', 'objectCards', 'maps'])
    expect(resourcesWith('quickCreate').map((r) => r.name)).toEqual(['notes'])
    expect(RESOURCES.filter((r) => r.linked).map((r) => r.name)).toEqual(['notes', 'folders', 'articles', 'objectCards'])
    expect(resourcesWith('sidebar').map((r) => r.name)).toEqual(['projects', 'notes'])
    expect(RESOURCES.filter((r) => r.parents?.length).map((r) => [r.name, r.parents!.map((p) => `${p.type}:${p.resource}`)])).toEqual([
      ['notes', ['project:projects', 'folder:folders']],
      ['folders', ['project:projects', 'folder:folders']],
      ['articles', ['project:projects', 'folder:folders']],
      ['objectCards', ['project:projects', 'folder:folders']],
    ])
  })

  it('makes a list page per resource with one, at its API path', () => {
    const pages = resourcePages()
    expect(Object.keys(pages)).toEqual(['projects', 'notes', 'folders', 'articles', 'objectCards'])
    expect(pages.objectCards.route!()).toBe('/object-cards')
    expect(pages.notes.title()).toBe('Notes')
  })

  it('makes the workspace panel of each resource that can be one; a map\'s fills its pane', () => {
    const panels = resourcePanels()
    expect(Object.keys(panels)).toEqual(['project', 'note', 'folder', 'article', 'object', 'map'])
    expect(panels.note.title()).toBe('Note')
    expect(panels.map.fill).toBe(true)
    expect(panels.note.fill).toBeFalsy()
    expect(resourceByName('maps')!.customPanel).toBe(true)
  })
})
