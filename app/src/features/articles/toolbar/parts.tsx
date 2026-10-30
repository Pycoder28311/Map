// The edit bar's building blocks, defined once: separators, groups, the hover tip, icon and text buttons, the toggle with an arrow.
import type { MouseEvent, ReactNode } from 'react'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import HoverInfo from '../../../components/ui/overlays/HoverInfo'

/** Its children disabled while the bar has no editor (a fieldset without a box of its own: the rows' layout stays) */
export function Idle({ idle, children }: { idle: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={idle} className="contents">
      {children}
    </fieldset>
  )
}

/** A thin line between two groups of buttons (the gap around it is the row's) */
export function Separator() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-(--divider-line)" />
}

export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  // Never split: a narrow bar breaks its rows between groups (toolbarLevel.ts, level 3)
  return <div className={`flex shrink-0 items-center gap-base ${className}`}>{children}</div>
}

/**
 * The small element that floats above a control while the pointer rests on it (or it has the focus): its name, and, for the second row's, a
 * sentence on what it does (`text`). For a control that is not one button (a dropdown field): it wraps it
 */
export function Tip({ name, text, children }: { name: string; text?: string; children: ReactNode }) {
  return (
    <HoverInfo title={name} text={text} side="top" delay={350}>
      <span className="inline-flex">{children}</span>
    </HoverInfo>
  )
}

/** A button that keeps the caret in the text while it is pressed (`tip`: the sentence its floating element says) */
export function ToolButton(props: {
  tip?: string
  icon: PlainIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  bigIcon?: boolean
  iconClassName?: string
}) {
  return (
    <HoverInfo title={props.label} text={props.tip} side="top" delay={350}>
      <IconButton
        icon={props.icon}
        label={props.label}
        size="sm"
        variant={props.active ? 'selected' : 'ghost'}
        aria-pressed={props.active}
        disabled={props.disabled}
        // An icon button's icon is as big as its text (1em): the size is set on the icon itself (`!`: the button's own rule is more specific); the same as the
        // List and Text align buttons have
        className={props.bigIcon ? '[&>svg]:size-6!' : '[&>svg]:size-5!'}
        iconClassName={props.iconClassName}
        onMouseDown={(e) => e.preventDefault()}
        onClick={props.onClick}
      />
    </HoverInfo>
  )
}

/** A button with its name beside the icon, that keeps the caret in the text while it is pressed (`small`: the link row's, LinkRow.tsx) */
export function TextButton(props: {
  /** The sentence its floating element says under its name (left out: just the name) */
  tip?: string
  icon?: PlainIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  filled?: boolean
  big?: boolean
  small?: boolean
  /** An underline button (the text variant): chosen = underlined (the link row's) */
  underline?: boolean
}) {
  return (
    <HoverInfo title={props.label} text={props.tip} side="top" delay={350}>
      <Button
        icon={props.icon}
        size={props.small ? 'xs' : 'sm'}
        plain
        filled={props.filled}
        variant={props.underline ? 'text' : props.active ? 'selected' : 'ghost'}
        aria-pressed={props.active}
        disabled={props.disabled}
        title={props.title}
        // The icon close to the text, the text of a field for all of them; a plain one has the bar's icon size (1.25rem), the big one (Section) a smaller icon (`!` wins over the bar's)
        // (one font size only: two `!` sizes on a button, the later in the stylesheet wins, whatever order they are written in)
        className={`[--btn-icon-gap:0.25rem]! font-normal! [--btn-text:var(--fg)]! [--btn-hover-text:var(--fg)]! ${
          props.small
            ? '[--btn-icon-size:0.875rem]! [--btn-font-size:0.75rem]! [--btn-pad-y:0]! [--btn-line-height:1]! [--btn-underline-offset:1px]!'
            : `[--btn-font-size:1rem]! ${props.big ? '[--btn-icon-size:1rem]!' : '[--btn-icon-size:1.25rem]!'}`
        }`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={props.onClick}
      >
        {props.label}
      </Button>
    </HoverInfo>
  )
}

/**
 * A toggle button for a dropdown of its own (ToolbarDropdown `kind="split"`): Bold, Italic, Underline. `on`: the format is on; it keeps
 * the caret in the text. The icon is the `icon`, or `children` (an icon drawn in its own colour)
 */
export function FormatToggle({ icon, label, on, onClick, children }: { icon?: PlainIcon; label: string; on: boolean; onClick: () => void; children?: ReactNode }) {
  const shared = {
    label,
    size: 'sm',
    variant: on ? 'selected' : 'ghost',
    'aria-pressed': on,
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    onClick,
    className: 'ui-dropfield-icon [&>svg]:size-5!',
  } as const
  return icon ? <IconButton {...shared} icon={icon} /> : <IconButton {...shared}>{children}</IconButton>
}
