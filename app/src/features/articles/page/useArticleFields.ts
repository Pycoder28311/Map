import { useEffect, useRef, useState } from 'react'
import type { useItemAutosave } from '../../../components/ui/resource/useItemAutosave'
import { adoptRules, fromStored, toStored, type AutoRule } from '../links/autolink'
import type { ArticleText } from '../text/articleText'

type Autosave = ReturnType<typeof useItemAutosave>

/**
 * The values the page saves, all of them in one object: a change of one field (the text, the title, the Info box, the autolinkers) goes
 * into it and the autosave gets them all, so two fields changed together (the text and its autolinkers) are one save. It starts again
 * with every new start (a draft kept, the server's version taken). Also the article's autolinkers (docs/plans/35): held here, read by the
 * Autolinker while typing and shown by its panel; a change is saved with the text
 */
export function useArticleFields(autosave: Autosave) {
  const values = useRef({ start: autosave.start.version, all: autosave.start.values })
  const field = (name: string, value: string) => {
    if (values.current.start !== autosave.start.version) values.current = { start: autosave.start.version, all: autosave.start.values }
    values.current.all = { ...values.current.all, [name]: value }
    autosave.change(values.current.all)
  }
  const [rules, setRulesState] = useState(() => ({ start: autosave.start.version, list: fromStored(autosave.start.values.autolinkers) }))
  if (rules.start !== autosave.start.version) setRulesState({ start: autosave.start.version, list: fromStored(autosave.start.values.autolinkers) })
  const setRules = (next: AutoRule[]) => {
    setRulesState({ start: autosave.start.version, list: next })
    field('autolinkers', JSON.stringify(toStored(next)))
  }
  return { field, rules: rules.list, setRules }
}

/** Autolinkers already in the text (an article made before the field) are added to the field once, when an editor opens the article */
export function useAdoptRules(text: ArticleText, canEdit: boolean, userId: string | undefined, rules: AutoRule[], setRules: (next: AutoRule[]) => void) {
  const adopted = useRef(false)
  useEffect(() => {
    if (!canEdit || adopted.current || !userId) return
    adopted.current = true
    const next = adoptRules(rules, text.doc(), userId)
    if (next !== rules) setRules(next)
    // Once, when the session is there
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, canEdit, userId])
}
