import type { ReactNode } from 'react'
import LineColourSection from '../line/LineColourSection'
import type { BorderSectionProps } from './borderRows'

/** The border's colour, opacity and thickness: the line's Basic section, so the two sidebars start the same way */
export default function BorderBasicSection({ value, onChange, after }: BorderSectionProps & { after?: ReactNode }) {
  return <LineColourSection title="Basic" style={value.style} onChange={(style, commit) => onChange({ style }, commit)} after={after} />
}
