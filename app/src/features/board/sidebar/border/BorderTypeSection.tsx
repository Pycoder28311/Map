import LineTypeSection from '../line/LineTypeSection'
import type { BorderSectionProps } from './borderRows'

/** The border's line types and how soft its corners are: the line's Type section */
export default function BorderTypeSection({ value, onChange }: BorderSectionProps) {
  return <LineTypeSection style={value.style} onChange={(style, commit) => onChange({ style }, commit)} />
}
