import { LuInfo } from 'react-icons/lu'
import HoverInfo from '../../components/ui/overlays/HoverInfo'

type Props<T extends string> = {
  /** Its name for screen readers */
  label: string
  options: { id: T; name: string }[]
  value: T
  onChange: (id: T) => void
}

/**
 * The styles of a point or an object, over its Info box in the left form: "Choose style" with an ⓘ (the text and the icon show what a style
 * does, on the right), then the styles as small chips that wrap onto more rows when they do not fit
 */
export default function StyleChips<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    // A line under the styles, like the one over the form's bottom buttons
    <div className="mb-base flex flex-col gap-sm border-b border-line pb-base">
      <HoverInfo
        side="right"
        delay={250}
        title="Styles"
        text="A style adds the Info box sections that suit this kind of thing. You can add the same sections yourself: it does not change the object, it only makes it quicker."
      >
        <span tabIndex={0} className="inline-flex cursor-default items-center gap-1 self-start rounded-(--corner-sm) text-small text-fg-muted outline-none focus-visible:outline-2 focus-visible:outline-accent">
          Choose style
          <LuInfo aria-hidden className="size-3.5" />
        </span>
      </HoverInfo>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onChange(o.id)}
              className={`cursor-pointer rounded-[4px] border px-2 py-0.5 text-small transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                on ? 'border-fg-subtle bg-fill-strong text-fg' : 'border-line-strong bg-fill text-fg-muted hover:bg-fill-strong hover:text-fg'
              }`}
            >
              {o.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
