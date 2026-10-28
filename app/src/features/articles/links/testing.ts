// Documents for the links' tests: the article's schema (StarterKit, as the editor has it) and a small way to write paragraphs with links
import { getSchema } from '@tiptap/core'
import { EditorState } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/react'
import { toHref, type ArticleLink } from './linkHref'

export const schema = getSchema([StarterKit])

/** A piece of a paragraph: words, or words with a link (or in code) */
export type Piece = string | { text: string; link?: ArticleLink; code?: boolean }

const text = (piece: Piece): JSONContent =>
  typeof piece === 'string'
    ? { type: 'text', text: piece }
    : { type: 'text', text: piece.text, marks: [...(piece.link ? [{ type: 'link', attrs: { href: toHref(piece.link) } }] : []), ...(piece.code ? [{ type: 'code' }] : [])] }

export const p = (...pieces: Piece[]): JSONContent => ({ type: 'paragraph', content: pieces.map(text) })
export const h = (level: number, words: string): JSONContent => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: words }] })

export const docOf = (...blocks: JSONContent[]) => schema.nodeFromJSON({ type: 'doc', content: blocks })
export const stateOf = (...blocks: JSONContent[]) => EditorState.create({ schema, doc: docOf(...blocks) })
