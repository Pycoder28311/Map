// Long names fade out at the end instead of "…". flex-1: the label fills the row up to the right
// icons, so the fade sits at the row's end and short names (which don't reach it) stay untouched.
const FADE =
  'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-start ' +
  '[mask-image:linear-gradient(to_right,black_calc(100%-var(--icons,0px)-var(--tree-label-fade)),transparent_calc(100%-var(--icons,0px)))]'

type Props = {
  children: string
  /** The name can be edited: the text cursor shows over the text itself (not the empty space after it) */
  editable?: boolean
}

/** A row's name. The inner span is just the text, so only it gets the editable cursor */
export default function TreeLabel({ children, editable = false }: Props) {
  return (
    <span title={children} className={FADE}>
      <span className={editable ? 'cursor-text' : undefined}>{children}</span>
    </span>
  )
}
