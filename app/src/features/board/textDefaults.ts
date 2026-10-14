// What a text object starts with, and the style fields it keeps even when nothing is styled.
import type { TextObject } from './types'

export const TEXT_DEFAULT = { width: 0, rotation: 0, align: 'left', size: 24, color: '#111827', opacity: 100 } as const satisfies Pick<TextObject, 'width' | 'rotation' | 'align' | 'size' | 'color' | 'opacity'>
