export type Outcome = 'discard' | 'create' | 'ask'

/**
 * What a click outside a draft does (the Dashboard's draft cards, the Note / Article modal, the floating Create frame): nothing typed
 * discards it, something typed creates it. A modal draft with only a title asks first (`askOnTitleOnly`); cards have no text and never ask.
 * `text` is the rich text's HTML ('' when it has no words).
 */
export function draftOutcome(title: string, text: string, { askOnTitleOnly }: { askOnTitleOnly: boolean }): Outcome {
  const hasTitle = title.trim() !== ''
  const hasText = text.trim() !== ''
  if (!hasTitle && !hasText) return 'discard'
  if (askOnTitleOnly && hasTitle && !hasText) return 'ask'
  return 'create'
}
