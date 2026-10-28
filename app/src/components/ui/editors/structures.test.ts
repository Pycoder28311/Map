import { getSchema } from '@tiptap/core'
import { EditorState } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { mapPlaces, nextPlace, structureParts } from './structures'

describe('structureParts', () => {
  it('has the placeholders, and the selection takes the first place', () => {
    expect(structureParts('power').map((p) => p.text)).toEqual(['x', 'y'])
    expect(structureParts('power', ' a  b ')[0]).toEqual({ text: 'a b', place: true })
    expect(structureParts('absolute', 'v').map((p) => p.text)).toEqual(['|', 'v', '|'])
    expect(structureParts('factorial', 'k').map((p) => p.text)).toEqual(['k', '!'])
    expect(structureParts('index')[1]).toEqual({ text: 'y', place: true, mark: 'subscript' })
  })
})

describe('nextPlace', () => {
  const places = [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
  ]
  it('goes forward and back, and ends past the last', () => {
    expect(nextPlace(places, 1, 1)).toBe(1)
    expect(nextPlace(places, 2, 1)).toBeNull()
    expect(nextPlace(places, 2, -1)).toBe(0)
    expect(nextPlace(places, 1, -1)).toBeNull()
  })
})

describe('mapPlaces', () => {
  const schema = getSchema([StarterKit])
  const start = () => EditorState.create({ schema, doc: schema.nodeFromJSON({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'xy' }] }] }) })
  const places = { places: [{ from: 1, to: 2 }, { from: 2, to: 3 }], end: 3 }

  it('follows typing over the first place', () => {
    const tr = start().tr.insertText('abc', 1, 2)
    expect(mapPlaces(places, tr.mapping)).toEqual({ places: [{ from: 1, to: 4 }, { from: 4, to: 5 }], end: 5 })
  })

  it('an emptied place does not take the next one’s words', () => {
    const tr = start().tr.delete(1, 2)
    const emptied = mapPlaces(places, tr.mapping)
    expect(emptied.places).toEqual([{ from: 1, to: 1 }, { from: 1, to: 2 }])
    const typed = mapPlaces(emptied, tr.insertText('q', 1).mapping.slice(1))
    expect(typed.places[0]).toEqual({ from: 1, to: 2 })
    expect(typed.places[1].from).toBe(2)
  })
})
