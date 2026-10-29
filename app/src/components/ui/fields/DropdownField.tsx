import { useId, useRef, useState, type CSSProperties, type ReactNode, type ToggleEvent } from 'react'
import { closeOnOutsideScroll } from '../../../lib/popoverScroll'
import { LuChevronDown } from 'react-icons/lu'
import Button from '../buttons/Button'
import IconButton from '../buttons/IconButton'
import { DROPDOWN_ITEM, DROPDOWN_MENU } from '../overlays/Dropdown'

/**
 * A bordered field's list: the field's own border and corners at its bottom, no popup animation and no shadow: it looks like the field grown
 * downward. The popover itself (JOINED_MENU) has no look and does not clip, so the hints (the tags) can hang half over the list's edge; the list
 * inside it (JOINED_LIST) has the look and scrolls.
 */
const JOINED_MENU = 'inset-auto m-0 overflow-visible border-0 bg-transparent p-0'
const JOINED_LIST =
  'relative max-h-80 overflow-y-auto overscroll-contain rounded-b-(--field-radius) border border-t-0 border-line-strong bg-surface p-(--menu-p) text-fg'

/**
 * The arrow of a field without a border: the same chevron as Lucide's, drawn stretched narrower (its box is set in fields.css) with a stroke of the
 * same thickness as the 16px one (2 × 16 / 24), so it is as tall and as thick as before and only less wide
 */
function NarrowChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** An option's hint as a tag: where it is on the list (px from the top of the list's box), the row it belongs to being in view */
type Tag = { text: string; top: number }

export type DropdownFieldOption = {
  value: string
  label: string
  /** Faint at the right of the label (e.g. a size's name) */
  hint?: string
  /** The label's own look (e.g. each font in its own font) */
  style?: CSSProperties
  /** A small square of a colour before the label */
  swatch?: string
  /** With `swatch`: shown only as a square of that colour (its label is its tooltip), in a grid of two rows with the other squares next to it ('' is no colour) */
  squares?: boolean
  /** With `hint`: the hint is big, at the right of the label (a tag), not the faint small text (a field without a border) */
  hintBig?: boolean
  /** A caption of the options after it, not an option (its value is not used) */
  heading?: boolean
  /** Ticked, whatever the field's `value` is (a menu with more than one choice in it, each with its own) */
  checked?: boolean
}

type Props = {
  /** What it picks, for screen readers */
  label: string
  /** The picked option's value (default: none: the field shows `children`, and options say whether they are `checked`) */
  value?: string
  options: DropdownFieldOption[]
  onChange: (value: string) => void
  /** What the field shows instead of the picked option's label (e.g. an input to type the value, or a button); the arrow still opens the options */
  children?: ReactNode
  /** The field's width as a Tailwind class */
  width?: string
  /** The text the field shows instead of the picked option's label (e.g. its name with the value: "Padding 8px") */
  display?: ReactNode
  /** false: no border round the field and no line before the arrow */
  bordered?: boolean
  /** More content at the end of the list of a field without a border (e.g. a colour picker) */
  extra?: ReactNode
  /** The options' words in the middle of their rows (a list of numbers); a bordered field's hints are then tags floating at the list's right edge, level with their rows */
  centerOptions?: boolean
}

/**
 * A field with its picked value (or what is given as children) and an arrow in a cell of its own at its end, the whole height, that opens
 * the options below the field: the article toolbar's font and size fields, so both look the same. A pick, a click outside, Esc, scrolling or
 * resizing closes it.
 */
export default function DropdownField({
  label,
  value,
  options,
  onChange,
  children,
  width = 'w-40',
  bordered = true,
  display,
  centerOptions = false,
  extra,
}: Props) {
  const id = useId()
  const fieldRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // What stops the listening for the page scrolling, while the menu is open (a scroll inside the menu does not close it)
  const stopWatching = useRef<(() => void) | null>(null)
  const current = options.find((o) => o.value === value)
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const close = () => menuRef.current?.hidePopover()

  // Placed before it shows: under the field, its left edge on the field's (a field without a border: centred under it), at least as wide. A bordered field's list is joined to it (no gap, the field's
  // border between them); the others pop out a little below
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const field = fieldRef.current
    if (e.newState !== 'open' || !field) return
    const rect = field.getBoundingClientRect()
    // A field without a border: the list is centred under it (a shift of half its own width, whatever that is)
    e.currentTarget.style.left = `${bordered ? rect.left : rect.left + rect.width / 2}px`
    e.currentTarget.style.translate = bordered ? '' : '-50% 0'
    e.currentTarget.style.transformOrigin = bordered ? '' : 'top center'
    // (the opening animation keeps the sideways shift: animations.css --dropdown-x)
    e.currentTarget.style.setProperty('--dropdown-x', bordered ? '0px' : '-50%')
    e.currentTarget.style.top = `${bordered ? rect.bottom : rect.bottom + 4}px`
    // A bordered field's list is exactly as wide as the field
    if (bordered) e.currentTarget.style.width = `${rect.width}px`
    else e.currentTarget.style.minWidth = `${rect.width}px`
  }
  // Where the tags are, from where the rows with a hint are in the list (again when the list scrolls)
  const measure = () => {
    const list = listRef.current
    if (!list) return
    const next: Tag[] = []
    for (const row of list.querySelectorAll<HTMLElement>('[data-tag]')) {
      const top = row.offsetTop - list.scrollTop + row.offsetHeight / 2
      if (top >= 0 && top <= list.clientHeight) next.push({ text: row.dataset.tag ?? '', top })
    }
    setTags(next)
  }
  const watch = (e: ToggleEvent<HTMLDivElement>) => {
    setOpen(e.newState === 'open')
    if (e.newState === 'open') {
      stopWatching.current = closeOnOutsideScroll(e.currentTarget, close)
      if (bordered) requestAnimationFrame(measure)
    } else {
      setTags([])
      stopWatching.current?.()
      stopWatching.current = null
    }
  }

  const pick = (o: DropdownFieldOption) => {
    close()
    onChange(o.value)
  }
  // The options in order; the squares that follow each other are one grid of two rows
  const items: ReactNode[] = []
  let squares: DropdownFieldOption[] = []
  const flushSquares = () => {
    if (squares.length === 0) return
    const run = squares
    squares = []
    items.push(
      <div key={`squares:${run[0].value}`} role="group" className="grid grid-flow-col grid-rows-2 gap-1 p-1">
        {run.map((o) => (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={o.checked ?? o.value === value}
            aria-label={o.label}
            title={o.label}
            onClick={() => pick(o)}
            className={`relative size-6 cursor-pointer rounded-(--corner-xs) border border-line-strong ${(o.checked ?? o.value === value) ? 'ring-2 ring-fg' : 'hover:ring-2 hover:ring-fg-subtle'}`}
            style={{ backgroundColor: o.swatch || 'transparent' }}
          >
            {/* No colour: a slash across the square */}
            {!o.swatch && <span aria-hidden className="absolute inset-0 m-auto h-px w-[130%] -translate-x-[11%] rotate-45 bg-fg-muted" />}
          </button>
        ))}
      </div>,
    )
  }
  for (const o of options) {
    if (o.squares && !o.heading) {
      squares.push(o)
      continue
    }
    flushSquares()
    items.push(
      o.heading ? (
        <p key={o.value} className="px-(--menu-item-px) pt-1 pb-0.5 text-small text-fg-subtle">
          {o.label}
        </p>
      ) : (
        <button
          key={o.value}
          type="button"
          role="menuitemradio"
          aria-checked={o.checked ?? o.value === value}
          // A bordered field's hint is a tag outside the row (see `tags`), found by this
          data-tag={bordered ? o.hint : undefined}
          onClick={() => pick(o)}
          className={`${DROPDOWN_ITEM} ${centerOptions ? 'justify-center' : ''}`}
        >
          {o.swatch !== undefined && (
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-(--corner-xs) border border-line-strong"
              style={{ backgroundColor: o.swatch || 'transparent' }}
            />
          )}
          {/* (a label with its own underline is not clipped: the lower waves of a wavy one would be cut off) */}
          <span
            className={`min-w-0 ${o.style?.textDecorationLine ? 'whitespace-nowrap' : 'truncate'} ${centerOptions ? 'text-center' : 'flex-1 text-start'}`}
            style={o.style}
          >
            {o.label}
          </span>
          {o.hint && !bordered && <span className={`shrink-0 ${o.hintBig ? 'text-body text-fg-muted' : 'text-small text-fg-subtle'}`}>{o.hint}</span>}
        </button>
      ),
    )
  }
  flushSquares()

  return (
    <div
      ref={fieldRef}
      className={`flex items-stretch ${bordered && open ? 'rounded-t-(--field-radius)' : 'rounded-(--field-radius)'} ${bordered ? 'border border-line-strong bg-surface focus-within:border-fg-subtle' : 'ui-dropfield-plain'} ${width}`}
    >
      {children ?? (
        <Button
          variant="ghost"
          plain
          popoverTarget={id}
          aria-haspopup="menu"
          aria-label={`${label}: ${current?.label ?? ''}`}
          title={label}
          onMouseDown={(e) => e.preventDefault()}
          style={current?.style}
          className="ui-dropfield-display"
        >
          {display ?? current?.label ?? ''}
        </Button>
      )}
      <IconButton
        icon={bordered ? LuChevronDown : NarrowChevron}
        label={label}
        popoverTarget={id}
        aria-haspopup="menu"
        onMouseDown={(e) => e.preventDefault()}
        className="ui-dropfield-arrow"
        // The arrow turns over, anticlockwise, while the list is open
        iconClassName={`transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? '-rotate-180' : ''}`}
      />
      <div
        ref={menuRef}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        onBeforeToggle={place}
        onToggle={watch}
        className={bordered ? JOINED_MENU : `${DROPDOWN_MENU} max-h-80 overflow-y-auto`}
      >
        {bordered ? (
          <>
            <div ref={listRef} onScroll={measure} className={JOINED_LIST}>
              {items}
            </div>
            {/* The hints: tags hanging over the list's right edge, only a little over it (6px) so they do not touch the centred numbers, each level with its row */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
              {tags.map((t) => (
                <span
                  key={t.text}
                  className="absolute right-0 translate-x-[calc(100%-6px)] -translate-y-1/2 rounded-(--corner-xs) border border-line-strong bg-surface px-1.5 py-px text-small whitespace-nowrap text-fg-subtle"
                  style={{ top: t.top }}
                >
                  {t.text}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            {items}
            {extra}
          </>
        )}
      </div>
    </div>
  )
}
