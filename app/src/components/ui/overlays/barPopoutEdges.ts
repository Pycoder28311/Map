/** A horizontal span in viewport pixels */
export type Span = { left: number; right: number }
/** Which of the popout's sides run flush along an edge (start: the left one) */
export type Stuck = { start: boolean; end: boolean }

/**
 * Where a bar popout goes: its natural span, snapped flush to the bounds' edge when it would end
 * within `snap` px of it (or past it). Wider than the bounds: both sides stick.
 */
export function stickToEdges(natural: Span, bounds: Span, snap: number): { span: Span; stuck: Stuck } {
  const width = natural.right - natural.left
  if (width >= bounds.right - bounds.left) return { span: { ...bounds }, stuck: { start: true, end: true } }

  if (natural.right >= bounds.right - snap) {
    return { span: { left: bounds.right - width, right: bounds.right }, stuck: { start: false, end: true } }
  }
  if (natural.left <= bounds.left + snap) {
    return { span: { left: bounds.left, right: bounds.left + width }, stuck: { start: true, end: false } }
  }
  return { span: natural, stuck: { start: false, end: false } }
}
