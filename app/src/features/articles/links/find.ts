// Search in the article (⋯ ▸ Search in article): where the words are in the text. Pure (find.test.ts).
import type { Node as PMNode } from '@tiptap/pm/model'

/** Lower case, without accents, one character for one (so places stay right) */
const foldChar = (c: string) => {
  const folded = c.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return folded.length === 1 ? folded : c
}

/** Every place the query is written (any case or accents, inside words too), in order. At most `max` */
export function findMatches(doc: PMNode, query: string, max = 1000): { from: number; to: number }[] {
  const needle = Array.from(query.trim(), foldChar).join('')
  if (!needle) return []
  const found: { from: number; to: number }[] = []
  doc.descendants((block, blockPos) => {
    if (found.length >= max) return false
    if (!block.isTextblock) return true
    let chars = ''
    const at: number[] = []
    block.forEach((child, offset) => {
      const content = child.isText ? (child.text ?? '') : '￼'
      for (let i = 0; i < content.length; i++) {
        chars += foldChar(content[i])
        at.push(blockPos + 1 + offset + i)
      }
    })
    for (let i = chars.indexOf(needle); i !== -1 && found.length < max; i = chars.indexOf(needle, i + needle.length)) {
      found.push({ from: at[i], to: at[i + needle.length - 1] + 1 })
    }
    return false
  })
  return found
}
