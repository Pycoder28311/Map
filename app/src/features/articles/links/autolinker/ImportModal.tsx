import { DOMParser as PMDOMParser, type Node as PMNode, type Schema } from '@tiptap/pm/model'
import { useState } from 'react'
import Button from '../../../../components/ui/buttons/Button'
import CheckField from '../../../../components/ui/fields/CheckField'
import Modal from '../../../../components/ui/overlays/Modal'
import { resourceByName } from '../../../../resources/registry'
import { fromStored, rulesFrom } from '../autolink'
import ObjectPicker from '../ObjectPicker'
import { sameText } from './sameText'

/** Import from other article: pick an article, then which of the phrases of its autolinkers to add here; they link to the place chosen here */
export default function ImportModal({ schema, self, have, onClose, onImport }: { schema: Schema; self: string; have: string[]; onClose: () => void; onImport: (phrases: string[]) => void }) {
  const [from, setFrom] = useState<{ title: string; phrases: string[] } | null>(null)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [state, setState] = useState<'pick' | 'loading' | 'error'>('pick')
  const here = (phrase: string) => have.some((p) => sameText(p, phrase))

  const open = async (id: string, title: string) => {
    const articles = resourceByName('articles')
    if (!articles) return
    setState('loading')
    try {
      const article = (await articles.api.get(id)) as { content?: string; autolinkers?: unknown }
      // Its autolinkers; an article not opened since they became a field has none yet: its text then
      const own = fromStored(article.autolinkers as never)
      const found = (own.length > 0 ? own : rulesFrom(parse(schema, article.content ?? ''))).flatMap((r) => r.phrases)
      const unique = found.filter((p, i) => found.findIndex((x) => sameText(x, p)) === i)
      setFrom({ title, phrases: unique })
      setTicked(new Set(unique.filter((p) => !here(p))))
      setState('pick')
    } catch {
      setState('error')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={from ? `Link phrases of “${from.title}”` : 'Import from other article'}
      footer={
        from && (
          <>
            <Button variant="ghost" onClick={() => setFrom(null)}>
              Another article
            </Button>
            <Button
              disabled={ticked.size === 0}
              onClick={() => {
                onImport(from.phrases.filter((p) => ticked.has(p)))
                onClose()
              }}
            >
              Add
            </Button>
          </>
        )
      }
    >
      {state === 'loading' ? (
        <p className="text-body text-fg-subtle">Loading…</p>
      ) : state === 'error' ? (
        <p className="text-body text-danger">The article could not be read.</p>
      ) : from ? (
        from.phrases.length === 0 ? (
          <p className="text-body text-fg-subtle">That article has no autolinkers to import phrases from.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {from.phrases.map((phrase) => (
              <li key={phrase} className="flex items-center gap-2">
                <CheckField
                  label={<span className="font-medium">{phrase}</span>}
                  checked={ticked.has(phrase) && !here(phrase)}
                  disabled={here(phrase)}
                  onChange={(on) => {
                    const next = new Set(ticked)
                    if (on) next.add(phrase)
                    else next.delete(phrase)
                    setTicked(next)
                  }}
                />
                {here(phrase) && <span className="ms-auto text-small text-fg-subtle">already here</span>}
              </li>
            ))}
          </ul>
        )
      ) : (
        <ObjectPicker only={['article']} exclude={self} onPick={(hit) => void open(hit.id, hit.title)} />
      )}
    </Modal>
  )
}

/** Another article's text as a document of this article's kind (to read its links) */
function parse(schema: Schema, html: string): PMNode {
  const body = new window.DOMParser().parseFromString(html, 'text/html').body
  return PMDOMParser.fromSchema(schema).parse(body)
}
