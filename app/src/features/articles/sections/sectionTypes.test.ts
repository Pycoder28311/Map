import { getSchema } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { articleExtensions } from '../../../components/ui/editors/articleExtensions'
import { editorExtensions } from '../../../components/ui/editors/RichTextEditor'
import { SECTION_GROUPS, SECTION_TYPES, filterSections, groupSections } from './sectionTypes'

describe('the section kinds', () => {
  it('have unique ids, a known group, and either blocks or an action', () => {
    expect(new Set(SECTION_TYPES.map((t) => t.id)).size).toBe(SECTION_TYPES.length)
    for (const t of SECTION_TYPES) {
      expect(SECTION_GROUPS).toContain(t.group)
      expect(!!t.content !== !!t.run).toBe(true)
    }
  })

  it("make blocks the article's schema takes", () => {
    const schema = getSchema(editorExtensions({ extensions: articleExtensions }))
    for (const t of SECTION_TYPES.filter((s) => s.content)) {
      expect(() => schema.nodeFromJSON({ type: 'doc', content: t.content!() }).check(), t.id).not.toThrow()
    }
  })

  it('are filtered by their words, any case or accents', () => {
    expect(filterSections('').length).toBe(SECTION_TYPES.length)
    expect(filterSections('CAR').map((t) => t.id)).toEqual(['card', 'cards-2', 'cards-3'])
    expect(filterSections('todo').map((t) => t.id)).toEqual(['checklist'])
    expect(filterSections('nothing like this')).toEqual([])
  })

  it('are grouped in the groups’ order, empty groups left out', () => {
    const groups = groupSections(filterSections('side by side'))
    expect(groups.map((g) => g.group)).toEqual(['Cards', 'Rows'])
  })
})
