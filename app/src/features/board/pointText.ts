// A point's description is TipTap's JSON kept as text. Pure (pointText.test.ts).
import type { JSONContent } from '@tiptap/react'

const EMPTY: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/** The document the editor starts with ('' or damaged text: an empty one) */
export function descriptionDoc(text: string | undefined): JSONContent {
  if (!text) return EMPTY
  try {
    const doc = JSON.parse(text)
    return doc && doc.type === 'doc' ? doc : EMPTY
  } catch {
    return EMPTY
  }
}

/** What is kept for a document: '' when it has no words */
export function descriptionText(doc: JSONContent): string {
  const hasWords = (n: JSONContent): boolean => (typeof n.text === 'string' && n.text.trim() !== '') || (n.content ?? []).some(hasWords)
  return hasWords(doc) ? JSON.stringify(doc) : ''
}

/** The words only (for a short preview or a search) */
export function descriptionPlain(text: string | undefined): string {
  const out: string[] = []
  const walk = (n: JSONContent) => {
    if (typeof n.text === 'string') out.push(n.text)
    for (const c of n.content ?? []) walk(c)
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem') out.push('\n')
  }
  walk(descriptionDoc(text))
  return out.join('').trim()
}
