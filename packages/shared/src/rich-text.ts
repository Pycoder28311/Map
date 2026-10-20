import { z } from 'zod'
import { RICH_TEXT_MAX } from './rich-text-policy'
import { sanitizeRichText } from './sanitize-html'

/**
 * A field that holds HTML from the rich-text editor. Declare a contract field with this and it is safe by default,
 * on the server (every route validates its input with the contract) and in the app: too long is rejected (RICH_TEXT_MAX),
 * and what is kept is cleaned to the allowed tags, attributes and links. Plain text becomes paragraphs; no words becomes ''.
 *
 *   text: richText          // may be empty
 *   text: richTextRequired  // must have words
 */
export const richText = z.string().max(RICH_TEXT_MAX).transform(sanitizeRichText)

export const richTextRequired = richText.refine((html) => html !== '', 'Required')
