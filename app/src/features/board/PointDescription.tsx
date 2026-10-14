import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import { descriptionDoc } from './pointText'

/** A point's description, to read only. Nothing when it has none */
export default function PointDescription({ text, className = '' }: { text: string | undefined; className?: string }) {
  if (!text) return null
  return <RichTextEditor key={text} content={descriptionDoc(text)} editable={false} className={`text-body [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5 ${className}`} />
}
