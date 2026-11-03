// The edit bar's lists and starting values, in one place: its controls read them. A new size, weight, gap or list kind is one entry here.
import {
  LuAlignCenter,
  LuAlignJustify,
  LuAlignLeft,
  LuAlignRight,
  LuImage,
  LuList,
  LuListChecks,
  LuListOrdered,
  LuMinus,
  LuPilcrow,
  LuTable,
} from 'react-icons/lu'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'

/** The colours a picker starts on when the text has none of its own, and a paragraph border's colour until one is picked */
export const DEFAULT_COLOURS = {
  text: '#e5e5e5',
  background: '#fde047',
  border: '#9ca3af',
}

/**
 * The font size (px): the field takes `min` to `max`, the editor's own size is `normal`, and `common` are the sizes its dropdown offers;
 * a few have a name, shown faint at the right of the number
 */
export const FONT_SIZES = {
  min: 8,
  max: 200,
  normal: 16,
  common: [
    { size: 8, name: 'Tiny' },
    { size: 9, name: 'Tiny' },
    { size: 10, name: 'Tiny' },
    { size: 11, name: 'Small' },
    { size: 12, name: 'Small' },
    { size: 13, name: 'Small' },
    { size: 14, name: 'Medium' },
    { size: 15, name: 'Medium' },
    { size: 16, name: 'Medium' },
    { size: 18, name: 'Medium' },
    { size: 20, name: 'Large' },
    { size: 22, name: 'Large' },
    { size: 24, name: 'Large' },
    { size: 26, name: 'Big' },
    { size: 28, name: 'Big' },
    { size: 32, name: 'XL' },
    { size: 36, name: 'XL' },
    { size: 40, name: 'XXL' },
    { size: 48, name: 'XXL' },
    { size: 56, name: 'Huge' },
    { size: 64, name: 'Huge' },
    { size: 72, name: 'Huge' },
    { size: 96, name: 'Giant' },
    { size: 128, name: 'Giant' },
    { size: 200, name: 'Giant' },
  ] as { size: number; name?: string }[],
}

/** The weights the Bold dropdown offers, by name */
export const WEIGHTS = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra bold', value: '800' },
  { label: 'Black', value: '900' },
]

/** The slants the Italic dropdown offers: the editor's italic, or an oblique one at an angle (how far it leans) */
export const SLANTS = [
  { label: 'Slight', value: 'oblique 6deg' },
  { label: 'Normal', value: 'italic' },
  { label: 'Strong', value: 'oblique 20deg' },
]

/** How an underline can be drawn */
export const UNDERLINE_KINDS = ['solid', 'double', 'dotted', 'dashed', 'wavy']

/** A value of a paragraph dropdown, and the word it is tagged with in its list (as Bold's and Italic's have) */
export type TaggedValue = { value: number; tag: string }

/** The paragraph's padding (px) */
export const PADDINGS: TaggedValue[] = [
  { value: 0, tag: 'None' },
  { value: 2, tag: 'Tiny' },
  { value: 4, tag: 'Small' },
  { value: 8, tag: 'Medium' },
  { value: 12, tag: 'Big' },
  { value: 16, tag: 'Large' },
  { value: 24, tag: 'Extra large' },
  { value: 32, tag: 'Huge' },
  { value: 48, tag: 'Giant' },
]

/** The gap between letters (px) */
export const LETTER_GAPS: TaggedValue[] = [
  { value: -1, tag: 'Tight' },
  { value: 0, tag: 'Normal' },
  { value: 0.5, tag: 'Slight' },
  { value: 1, tag: 'Small' },
  { value: 2, tag: 'Medium' },
  { value: 3, tag: 'Big' },
  { value: 5, tag: 'Large' },
  { value: 10, tag: 'Huge' },
]

/** The gap between rows, as a multiple of the text size */
export const ROW_GAPS: TaggedValue[] = [
  { value: 1, tag: 'Tight' },
  { value: 1.2, tag: 'Snug' },
  { value: 1.4, tag: 'Small' },
  { value: 1.5, tag: 'Normal' },
  { value: 1.6, tag: 'Medium' },
  { value: 1.8, tag: 'Big' },
  { value: 2, tag: 'Large' },
  { value: 2.5, tag: 'Extra large' },
  { value: 3, tag: 'Huge' },
]

/** What a paragraph has when it says nothing about its row gap */
export const NORMAL_ROW_GAP = 1.5

/** A border's width (px; 0: none) */
export const BORDER_WIDTHS: TaggedValue[] = [
  { value: 0, tag: 'None' },
  { value: 1, tag: 'Hairline' },
  { value: 2, tag: 'Thin' },
  { value: 3, tag: 'Medium' },
  { value: 4, tag: 'Thick' },
  { value: 6, tag: 'Heavy' },
  { value: 8, tag: 'Extra heavy' },
]

/** How a paragraph's border is written in its style */
export const BORDER_LOOK = /^(\d+)px solid (.+)$/

export type ListKind = 'none' | 'bulletList' | 'orderedList' | 'taskList'
export const LISTS: { value: ListKind; label: string; icon: PlainIcon }[] = [
  { value: 'none', label: 'No list', icon: LuPilcrow },
  { value: 'bulletList', label: 'Bulleted list', icon: LuList },
  { value: 'orderedList', label: 'Numbered list', icon: LuListOrdered },
  { value: 'taskList', label: 'Checklist', icon: LuListChecks },
]

export type Align = 'left' | 'center' | 'right' | 'justify'
export const ALIGNS: { value: Align; label: string; icon: PlainIcon }[] = [
  { value: 'left', label: 'Align left', icon: LuAlignLeft },
  { value: 'center', label: 'Centre', icon: LuAlignCenter },
  { value: 'right', label: 'Align right', icon: LuAlignRight },
  { value: 'justify', label: 'Justify', icon: LuAlignJustify },
]

/** Media's choices */
export type Insert = 'image' | 'table' | 'divider'
export const INSERTS: { value: Insert; label: string; icon: PlainIcon }[] = [
  { value: 'image', label: 'Image', icon: LuImage },
  { value: 'table', label: 'Table', icon: LuTable },
  { value: 'divider', label: 'Divider', icon: LuMinus },
]

/** The room (px) the links row takes under the bar (its height and the gap): selected words nearer than this to the bar's bottom edge would be hidden by it, so it goes above the bar */
export const LINK_ROW_ROOM = 48
