import { fold } from '../../../search/search'

/** Two phrases are the same one (case, accents and the spaces around them aside) */
export const sameText = (a: string, b: string) => fold(a.trim()) === fold(b.trim())
