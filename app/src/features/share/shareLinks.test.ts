import { describe, expect, it } from 'vitest'
import type { PanelRegistry } from '../workspace/types'
import { shareUrl, socialLinks } from './shareLinks'

const registry = { note: { title: () => 'Note' } } as unknown as PanelRegistry

describe('shareUrl', () => {
  it('makes the object page link absolute', () => {
    expect(shareUrl({ type: 'note', id: 'n1' }, registry, 'https://map.example')).toBe('https://map.example/workspace?layout=1&panels=note:n1')
  })
})

describe('socialLinks', () => {
  it('encodes the link and title for every site', () => {
    const links = socialLinks('https://map.example/a?b=1&c=2', 'Café & co')
    expect(links.x).toBe('https://x.com/intent/post?url=https%3A%2F%2Fmap.example%2Fa%3Fb%3D1%26c%3D2&text=Caf%C3%A9%20%26%20co')
    expect(links.facebook).toContain('u=https%3A%2F%2Fmap.example')
    expect(links.linkedin).toContain('url=https%3A%2F%2Fmap.example')
    expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent('Café & co https://map.example/a?b=1&c=2')}`)
    expect(links.email.startsWith('mailto:?subject=Caf%C3%A9')).toBe(true)
  })
})
