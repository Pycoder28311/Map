import { describe, expect, it } from 'vitest'
import { DATA } from './data.config'

const noteInput = DATA.notes.input
import { RICH_TEXT_MAX } from './rich-text-policy'

describe('a contract field declared as richText', () => {
  it('is cleaned when the contract parses it (noteInput)', () => {
    const { content } = noteInput.parse({ content: '<p onclick="x()">hi <a href="javascript:alert(1)">l</a></p><script>x</script>' })
    expect(content).toBe('<p>hi <a>l</a></p>')
  })
  it('rejects a note with no title and no words', () => {
    expect(noteInput.safeParse({ content: '<p></p>' }).success).toBe(false)
    expect(noteInput.safeParse({ content: '   ' }).success).toBe(false)
  })
  it('rejects text over the limit instead of cutting it', () => {
    expect(noteInput.safeParse({ content: `<p>${'a'.repeat(RICH_TEXT_MAX)}</p>` }).success).toBe(false)
    expect(noteInput.safeParse({ content: `<p>${'a'.repeat(1000)}</p>` }).success).toBe(true)
  })
})
