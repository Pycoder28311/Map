import { describe, expect, it } from 'vitest'
import { docOf, h, p } from '../links/testing'
import { WINDOW, isBig, moveSection, movedIndex, needsShift, sectionAt, sectionStart, windowAround, windowDoc, withWindow } from './articleDoc'

const words = (doc: ReturnType<typeof docOf>) => {
  const all: string[] = []
  doc.forEach((node) => all.push(node.textContent))
  return all
}
const many = (n: number) => docOf(...Array.from({ length: n }, (_, i) => p(`s${i}`)))

describe('windows', () => {
  it('is centred on the click, cut at both ends', () => {
    expect(windowAround(200, 100)).toEqual({ start: 100 - WINDOW.around, end: 100 + WINDOW.around + 1 })
    expect(windowAround(200, 2)).toEqual({ start: 0, end: 2 + WINDOW.around + 1 })
    expect(windowAround(10, 9)).toEqual({ start: 0, end: 10 })
    expect(windowAround(0, 0)).toEqual({ start: 0, end: 0 })
  })

  it('moves only near an edge with more text that way', () => {
    const window = { start: 50, end: 101 }
    expect(needsShift(window, 75, 200)).toBe(false)
    expect(needsShift(window, 51, 200)).toBe(true)
    expect(needsShift(window, 99, 200)).toBe(true)
    // At the text's own ends: nothing more to show
    expect(needsShift({ start: 0, end: 51 }, 1, 200)).toBe(false)
    expect(needsShift({ start: 150, end: 200 }, 199, 200)).toBe(false)
  })

  it('counts a text as big by its sections or its HTML', () => {
    expect(isBig(many(WINDOW.maxSections), 100)).toBe(false)
    expect(isBig(many(WINDOW.maxSections + 1), 100)).toBe(true)
    expect(isBig(many(3), WINDOW.maxChars + 1)).toBe(true)
  })
})

describe('positions', () => {
  const doc = docOf(p('ab'), h(2, 'Title'), p('c'))
  it('finds where a section starts and which section a position is in', () => {
    expect(sectionStart(doc, 0)).toBe(0)
    expect(sectionStart(doc, 1)).toBe(4)
    expect(sectionStart(doc, 3)).toBe(doc.content.size)
    expect(sectionAt(doc, 1)).toBe(0)
    expect(sectionAt(doc, 5)).toBe(1)
    expect(sectionAt(doc, doc.content.size)).toBe(2)
  })
})

describe('putting the window back', () => {
  it('replaces only the window and keeps the other sections as they are', () => {
    const doc = many(10)
    const window = { start: 3, end: 6 }
    const part = windowDoc(doc, window)
    expect(words(part)).toEqual(['s3', 's4', 's5'])
    const edited = docOf(p('new'), p('s4'))
    const next = withWindow(doc, window, edited.content)
    expect(words(next.doc)).toEqual(['s0', 's1', 's2', 'new', 's4', 's6', 's7', 's8', 's9'])
    expect(next.window).toEqual({ start: 3, end: 5 })
    expect(next.doc.child(0)).toBe(doc.child(0))
    expect(next.doc.child(8)).toBe(doc.child(9))
  })
})

describe('moving a section', () => {
  const doc = docOf(p('a'), p('b'), p('c'), p('d'))
  it('moves up, down and to the end', () => {
    expect(words(moveSection(doc, 3, 0))).toEqual(['d', 'a', 'b', 'c'])
    expect(words(moveSection(doc, 0, 2))).toEqual(['b', 'a', 'c', 'd'])
    expect(words(moveSection(doc, 1, 4))).toEqual(['a', 'c', 'd', 'b'])
    expect(movedIndex(1, 4)).toBe(3)
    expect(movedIndex(3, 0)).toBe(0)
  })
  it('stays the same document when dropped on itself', () => {
    expect(moveSection(doc, 1, 1)).toBe(doc)
    expect(moveSection(doc, 1, 2)).toBe(doc)
    expect(moveSection(doc, 7, 0)).toBe(doc)
  })
})
