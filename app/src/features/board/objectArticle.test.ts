import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addObject, getBoard, resetBoards } from './boardStore'
import { DEFAULT_STYLE } from './style'

const create = vi.hoisted(() => vi.fn(async (draft: { title: string; content: string }) => ({ id: 42, ...draft })))
vi.mock('../../lib/resource/hooks', () => ({ actionsOf: () => ({ create }) }))
vi.mock('../../resources/registry', () => ({ resourceByName: () => ({ name: 'articles' }) }))
vi.mock('../../lib/api/maps', () => ({ getMapFile: vi.fn(), saveMapFile: vi.fn() }))

const { articleDraft, articleIdOf, createArticleFor } = await import('./objectArticle')

const line = { kind: 'line' as const, name: '', links: [], style: DEFAULT_STYLE, points: [{ x: 0, y: 0 }] }

beforeEach(() => {
  resetBoards()
  create.mockClear()
})

describe('an article made for an object', () => {
  it('starts with what was written for it, else its description as paragraphs; its title is the object\'s (else what it is)', () => {
    // (its Info box is its type's rows: none for no type)
    const first = articleDraft({ ...line, id: 1, layer: 1, description: 'Two\nlines <b>' })
    expect(first).toMatchObject({ title: 'Line', content: '<p>Two</p><p>lines &lt;b&gt;</p>' })
    expect(first.infobox?.rows).toEqual([])
    expect(articleDraft({ ...line, id: 1, layer: 1, articleType: 'road' }).infobox?.rows.map((r) => r.label)).toEqual(['Length', 'Surface', 'Speed limit'])
    expect(articleDraft({ ...line, id: 1, layer: 1, articleType: 'river' }).infobox?.rows.map((r) => r.label)).toEqual(['Length', 'Source', 'Mouth'])
    const infobox = { image: null, banner: null, name: '', rows: [] }
    expect(articleDraft({ ...line, id: 1, layer: 1, description: 'x', articleText: '<p>Mine</p>', infobox })).toEqual({ title: 'Line', content: '<p>Mine</p>', infobox })
    expect(articleDraft({ id: 1, layer: 1, kind: 'shape', name: 'Park', links: [], style: DEFAULT_STYLE, shape: 'rect', box: { x: 0, y: 0, w: 1, h: 1 }, rotation: 0, param: 0, fill: null }).title).toBe('Park')
  })

  it('connects the object to it and moves its description there, as one undo step; an area keeps its description', async () => {
    const id = addObject('m', { ...line, description: 'A road' })
    expect(await createArticleFor('m', getBoard('m').objects[0])).toBe(42)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Line', content: '<p>A road</p>' }))
    const made = getBoard('m').objects.find((o) => o.id === id)!
    expect(articleIdOf(made)).toBe(42)
    expect(made.description).toBe('')
    expect(made.infobox).toBeUndefined()
    expect(made.articleText).toBeUndefined()
    expect(made.articleType).toBeUndefined()

    const area = addObject('m', { kind: 'border', name: 'Hills', links: [], style: DEFAULT_STYLE, fill: null, description: 'Green', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }] })
    await createArticleFor('m', getBoard('m').objects.find((o) => o.id === area)!)
    expect(getBoard('m').objects.find((o) => o.id === area)).toMatchObject({ description: 'Green', ref: { type: 'articles', id: 42 } })
  })
})

describe('which objects can have an article, and its title', () => {
  it('lines, areas and shapes; not points nor texts', async () => {
    const { canHaveArticle } = await import('./objectArticle')
    const base = { id: 1, layer: 1, name: '', links: [] }
    expect(canHaveArticle({ ...base, ...line })).toBe(true)
    expect(canHaveArticle({ ...base, kind: 'text', anchor: { x: 0, y: 0 }, text: 'x', width: 0, rotation: 0, align: 'left', size: 12, color: '#000000', opacity: 100 })).toBe(false)
  })

  it('a line\'s title is the text on it', () => {
    const board = [
      { id: 1, layer: 1, ...line },
      { id: 2, layer: 1, kind: 'text' as const, name: '', links: [], anchor: { x: 0, y: 0 }, text: 'Route 66', width: 0, rotation: 0, align: 'center' as const, size: 18, color: '#000000', opacity: 100, attach: 1 },
    ]
    expect(articleDraft(board[0], board).title).toBe('Route 66')
  })
})
