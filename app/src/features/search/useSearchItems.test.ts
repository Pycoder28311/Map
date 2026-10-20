import { describe, expect, it, vi } from 'vitest'
import type { AnyResource } from '../../resources/types'
import { readPages, toSearchItem } from './useSearchItems'

describe('readPages', () => {
  it('reads every page until there is no next cursor', async () => {
    const pages: Record<string, { items: number[]; nextCursor: string | null }> = {
      start: { items: [1, 2], nextCursor: 'a' },
      a: { items: [3], nextCursor: 'b' },
      b: { items: [4], nextCursor: null },
    }
    const fetchPage = vi.fn(async (cursor: string | null) => pages[cursor ?? 'start'])
    expect(await readPages(fetchPage)).toEqual({ items: [1, 2, 3, 4], capped: false })
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([null, 'a', 'b'])
  })

  it('stops at the cap and says there was more', async () => {
    const fetchPage = vi.fn(async () => ({ items: [1], nextCursor: 'more' }))
    expect(await readPages(fetchPage, 3)).toEqual({ items: [1, 1, 1], capped: true })
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('does not hide a failure', async () => {
    await expect(readPages(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })
})

describe('toSearchItem', () => {
  it('takes the title for the name and the subtitle for the text', () => {
    const resource = {
      panelType: 'note',
      ui: { row: { title: (item: { title: string }) => item.title || 'Untitled note', subtitle: (item: { preview: string }) => item.preview } },
    } as unknown as AnyResource
    expect(toSearchItem(resource, { id: 5, title: 'Ideas', preview: 'first words' })).toEqual({ id: '5', kind: 'note', name: 'Ideas', text: 'first words' })
    expect(toSearchItem(resource, { id: 6, title: '', preview: '' }).name).toBe('Untitled note')
  })
})
