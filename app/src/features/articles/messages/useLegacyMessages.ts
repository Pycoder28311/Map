import { MESSAGE_IMPORT_MAX } from '@map/shared'
import type { Node as PMNode } from '@tiptap/pm/model'
import { useEffect, useRef } from 'react'
import { linkRanges } from '../links/docLinks'
import { LINK_EDIT } from '../links/linkExtensions'
import { toHref } from '../links/linkHref'
import type { ArticleText } from '../text/articleText'
import { importOldMessages } from './messagesStore'

/** The article's old message links (their title and text in the href), each href once with every place it is on */
export function legacyLinks(doc: PMNode) {
  const byHref = new Map<string, { title: string; content: string; places: { from: number; to: number }[] }>()
  for (const range of linkRanges(doc)) {
    if (range.link.kind !== 'msg' || range.link.id !== null) continue
    const known = byHref.get(range.href) ?? { ...range.link.legacy, places: [] }
    known.places.push({ from: range.from, to: range.to })
    byHref.set(range.href, known)
  }
  return [...byHref.entries()].map(([href, value]) => ({ href, ...value }))
}

/**
 * Makes the article's old messages (from before messages were rows: their title and text in the link) into messages, once, when an
 * editor opens it (docs/plans/34): one request per 50 of them, then each link is rewritten to its message's id in one step and saved
 * at once. A failure leaves them as they are (they still open from their link) until the next time
 */
export function useLegacyMessages(text: ArticleText, articleId: number, canEdit: boolean, save: () => Promise<void>) {
  const done = useRef(false)
  useEffect(() => {
    if (!canEdit || done.current) return
    done.current = true
    // (one with only spaces is not a message the server takes: it stays as it is)
    const old = legacyLinks(text.doc()).filter((link) => link.title.trim() !== '' || link.content.trim() !== '')
    if (old.length === 0) return
    void (async () => {
      try {
        const ids = new Map<string, number>()
        for (let i = 0; i < old.length; i += MESSAGE_IMPORT_MAX) {
          const batch = old.slice(i, i + MESSAGE_IMPORT_MAX)
          const made = await importOldMessages(articleId, batch.map(({ title, content }) => ({ title, content })))
          batch.forEach((link, n) => ids.set(link.href, made[n].id))
        }
        // The links where they are now (the text may have changed while the messages were made)
        let changed = false
        text.change((tr) => {
          const type = tr.doc.type.schema.marks.link
          for (const link of legacyLinks(tr.doc)) {
            const id = ids.get(link.href)
            if (id === undefined) continue
            for (const { from, to } of link.places) tr.removeMark(from, to, type).addMark(from, to, type.create({ href: toHref({ kind: 'msg', id }) }))
          }
          changed = tr.docChanged
          tr.setMeta(LINK_EDIT, true).setMeta('addToHistory', false)
        })
        if (changed) await save()
      } catch {
        // Left as they are: they still open from their link, and are made messages the next time the article is opened
      }
    })()
  }, [text, articleId, canEdit, save])
}
