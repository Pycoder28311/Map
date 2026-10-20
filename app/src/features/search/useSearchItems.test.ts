import { describe, expect, it } from 'vitest'
import type { AnyResource } from '../../resources/types'
import { toSearchItem } from './useSearchItems'

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
