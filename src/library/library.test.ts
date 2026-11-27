import { beforeEach, describe, expect, it } from 'vitest'
import { dataFile, toRows } from '../export/dataFile'
import { flatten } from '../model/raster'
import { getState } from '../store/store'
import { CURRENT_KEY, deleteAsset, duplicateAsset, LIBRARY_KEY, newAsset, openAsset, resetLibrary, restore, saveCurrent } from '../store/library'
import { ARTICLE_BOOK } from './articleBook'
import { DEFAULT_ASSETS, drawingOf } from './defaults'

/** localStorage in memory (the tests run in Node) */
const memory = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) },
})

describe('the article book card', () => {
  it('is the app\'s 51 × 64 book, every row whole, its 28 colours, unit for unit', () => {
    expect(ARTICLE_BOOK.rows).toHaveLength(64)
    for (const row of ARTICLE_BOOK.rows) expect(row).toHaveLength(51)
    const d = drawingOf(DEFAULT_ASSETS[0])
    expect(d).toMatchObject({ name: 'Article book card', width: 51, height: 64 })
    const { palette, rows } = toRows(flatten(d), 51, 64)
    expect(Object.keys(palette)).toHaveLength(28)
    expect(rows).toEqual(ARTICLE_BOOK.rows)
    expect(dataFile(d).rows).toEqual(ARTICLE_BOOK.rows)
  })
})

describe('the asset library (local storage)', () => {
  beforeEach(() => {
    memory.clear()
    resetLibrary()
  })

  it('starts with the article book open, and keeps it', () => {
    restore()
    expect(getState().drawing).toMatchObject({ name: 'Article book card', width: 51 })
    const saved = JSON.parse(memory.get(LIBRARY_KEY)!)
    expect(saved).toHaveLength(1)
    expect(memory.get(CURRENT_KEY)).toBe(getState().assetId)
  })

  it('new, open, duplicate and delete; the open one is saved before another opens; it all comes back after a reload', () => {
    restore()
    const book = getState().assetId!
    newAsset(16, 8, 'Button')
    const button = getState().assetId!
    expect(getState().drawing).toMatchObject({ name: 'Button', width: 16, height: 8 })
    openAsset(book)
    expect(getState().drawing.name).toBe('Article book card')
    duplicateAsset(book)
    expect(getState().drawing.name).toBe('Article book card copy')
    deleteAsset(getState().assetId!)
    expect(JSON.parse(memory.get(LIBRARY_KEY)!).map((e: { name: string }) => e.name).sort()).toEqual(['Article book card', 'Button'])
    openAsset(button)
    saveCurrent()
    // A reload
    resetLibrary()
    restore()
    expect(getState().assetId).toBe(button)
    expect(getState().drawing.name).toBe('Button')
  })

  it('deleting the last asset leaves a new empty one open', () => {
    restore()
    deleteAsset(getState().assetId!)
    expect(getState().drawing).toMatchObject({ name: 'New asset', width: 64 })
    expect(JSON.parse(memory.get(LIBRARY_KEY)!)).toHaveLength(1)
  })
})
