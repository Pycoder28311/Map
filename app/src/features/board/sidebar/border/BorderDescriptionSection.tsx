import { useState } from 'react'
import SidebarSection from '../common/SidebarSection'

/** The description box: saves when it loses focus (one undo step) */
export default function BorderDescriptionSection({ text, onSave }: { text: string; onSave: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <SidebarSection id="border-description" title="Description">
      <textarea
        id="area-description"
        aria-label="Description"
        rows={3}
        value={draft ?? text}
        placeholder="Shown under the name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== text) onSave(draft)
          setDraft(null)
        }}
        className="resize-y rounded-(--field-radius) border border-line-strong bg-surface p-2 text-body outline-none focus-visible:border-fg-subtle"
      />
    </SidebarSection>
  )
}
