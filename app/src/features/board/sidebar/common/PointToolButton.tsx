import { LuMousePointer2, LuWaypoints } from 'react-icons/lu'

type Props = { on: boolean; onToggle: () => void; /** What it edits: "line" or "border" */ what: string }

// The same tabs as the Add note / Add article ones (AddNoteForm): the picked one is half as wide again, the width gliding
const TAB =
  'flex basis-0 cursor-pointer items-center justify-center gap-2 rounded-(--btn-radius) border px-2.5 py-1.5 text-body font-medium whitespace-nowrap transition-[flex-grow,background-color,color] duration-200 ' +
  'motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

/** Below the title of the Line and Border sidebars: Tools (the usual tool) or the Point tool, to catch and move the points of the lines or borders */
export default function PointToolButton({ on, onToggle, what }: Props) {
  const tabs = [
    { point: false, label: 'Tools', title: `Draw and edit a ${what}`, icon: LuMousePointer2 },
    { point: true, label: 'Point Tool', title: `Point tool: move the points of a ${what}`, icon: LuWaypoints },
  ]
  return (
    <div role="tablist" aria-label="Tool" className="flex gap-1">
      {tabs.map((t) => (
        <button
          key={t.label}
          type="button"
          role="tab"
          title={t.title}
          aria-selected={on === t.point}
          onClick={() => on !== t.point && onToggle()}
          className={`${TAB} ${on === t.point ? 'grow-3 border-line-strong bg-fill-strong text-fg' : 'grow-2 border-line-strong text-fg-muted hover-fill hover:text-fg'}`}
        >
          <t.icon className="size-(--btn-icon-size) shrink-0" aria-hidden />
          {t.label}
        </button>
      ))}
    </div>
  )
}
