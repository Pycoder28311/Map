import type { Editor } from '@tiptap/react'
import IconButton from '../../components/ui/buttons/IconButton'
import type { SymbolSection } from './symbols'

/**
 * Sections of characters, each section a title and a grid of small buttons: a press puts that character in the text (the editor keeps its
 * caret and selection while the panel is used). Pure content: the sections above say what there is.
 */
export default function SymbolSections({ editor, sections }: { editor: Editor; sections: SymbolSection[] }) {
  return (
    <div className="flex flex-col gap-2">
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title}>
          <h3 className="px-1 pb-0.5 text-small text-fg-subtle">{section.title}</h3>
          <div className="flex flex-wrap gap-0.5">
            {section.symbols.split(' ').map((char) => (
              <IconButton
                key={char}
                label={`Insert ${char}`}
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().insertContent(char).run()}
              >
                <span aria-hidden className="text-body leading-none">
                  {char}
                </span>
              </IconButton>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** The characters of a string (separated by spaces) as a row of small buttons, each putting its character in the text */
export function SymbolRow({ editor, symbols }: { editor: Editor; symbols: string }) {
  return (
    <>
      {symbols.split(' ').map((char) => (
        <IconButton
          key={char}
          label={`Insert ${char}`}
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().insertContent(char).run()}
        >
          <span aria-hidden className="text-body leading-none">
            {char}
          </span>
        </IconButton>
      ))}
    </>
  )
}
