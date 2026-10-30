import type { ComponentProps } from 'react'
import DropdownField from '../../../components/ui/fields/DropdownField'
import Dropdown from '../../../components/ui/overlays/Dropdown'
import { Tip } from './parts'

type FieldProps = Omit<ComponentProps<typeof DropdownField>, 'bordered'>
type MenuProps = ComponentProps<typeof Dropdown<string>>

/** What every dropdown of the bar has: the name its hover tip shows (default: its `label`) and the sentence under it */
type Common = { name?: string; tip?: string }

export type ToolbarDropdownProps =
  /** A bordered field with its value and an arrow (Font, Font size) */
  | ({ kind: 'field' } & Common & FieldProps)
  /** No border: what it shows (a toggle button, an icon with its value) and an arrow at its end (Bold, Italic, Underline, the paragraph's look) */
  | ({ kind: 'split' } & Common & FieldProps)
  /** An icon button that opens a menu of choices (List, Align) */
  | ({ kind: 'menu' } & Common & MenuProps)

/**
 * THE dropdown of the edit bar, in its three shapes (`kind`) with one hover tip and one set of sizes, so a new control only picks a kind and
 * gives its options. `field` and `split` are DropdownField (with and without its border), `menu` is Dropdown with an icon trigger.
 */
export default function ToolbarDropdown(props: ToolbarDropdownProps) {
  const { name, tip } = props
  if (props.kind === 'menu') {
    const { kind: _kind, name: _name, tip: _tip, ...menu } = props
    return (
      <Tip name={name ?? props.label} text={tip}>
        <Dropdown {...menu} center className="[&>svg]:size-5!" />
      </Tip>
    )
  }
  const { kind, name: _name, tip: _tip, ...field } = props
  return (
    <Tip name={name ?? props.label} text={tip}>
      <DropdownField {...field} {...(kind === 'split' ? { width: field.width ?? 'w-auto', bordered: false } : {})} />
    </Tip>
  )
}
