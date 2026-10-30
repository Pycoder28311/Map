// Dragging a section by its ⠿ (SectionHandles): where it would go from the pointer. Pure (sectionDrag.test.ts).

type Rect = { top: number; bottom: number }

/** The index a dragged section goes before: the first section whose middle is under the pointer's y (the number of sections: after the last) */
export function dropIndex(y: number, rects: Rect[]): number {
  const at = rects.findIndex((r) => y < (r.top + r.bottom) / 2)
  return at === -1 ? rects.length : at
}

/** The y of the line drawn where it would go: between the two sections, or at the edge of the first or last */
export function dropLineY(index: number, rects: Rect[]): number {
  if (rects.length === 0) return 0
  if (index <= 0) return rects[0].top
  if (index >= rects.length) return rects[rects.length - 1].bottom
  return (rects[index - 1].bottom + rects[index].top) / 2
}
