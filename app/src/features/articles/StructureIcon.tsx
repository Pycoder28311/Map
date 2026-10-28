import { STRUCTURES, type StructureKind } from '../../components/ui/editors/structures'

/** A structure as its button shows it: its parts, each place in a dotted box (like Word's equation buttons) */
export default function StructureIcon({ kind }: { kind: StructureKind }) {
  return (
    <span aria-hidden className="flex items-baseline font-serif text-[1.05rem] leading-none">
      {STRUCTURES[kind].parts.map((part, i) => {
        const small = part.mark ? 'text-[0.6em]' : ''
        const shift = part.mark === 'superscript' ? '-translate-y-[0.55em]' : part.mark === 'subscript' ? 'translate-y-[0.3em]' : ''
        return (
          <span key={i} className={`${small} ${shift} ${part.place ? 'rounded-[2px] border border-dashed border-current px-[1px] opacity-90' : ''}`}>
            {part.text}
          </span>
        )
      })}
    </span>
  )
}
