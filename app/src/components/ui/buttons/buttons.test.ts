// Keeps every button in one place: the components of this folder, styled only by styles/buttons.css. A new button
// anywhere else must use them (Button, ButtonLink, NavButton, IconButton, SplitButton; how: instructions/buttons.md).
import { describe, expect, it } from 'vitest'

const BUTTONS = 'components/ui/buttons/'

/**
 * Raw <button>s that aren't buttons (rows, options of a picker, swatches, tree icons, tiles, drag handles), and how
 * many each file has. They keep the theme's look until the other elements get theirs.
 */
const ALLOWED: Record<string, { count: number; why: string }> = {
  'components/layout/sidebar/TrashBin.tsx': { count: 1, why: 'a sidebar row (a drop target among the rows)' },
  'components/layout/sidebar/ResourceRows.tsx': { count: 2, why: 'Show more / Load more: sidebar rows' },
  'features/layouts/LayoutsSection.tsx': { count: 1, why: 'Show more: a sidebar row' },
  'components/ui/Divider.tsx': { count: 1, why: 'an icon in the divider line, like the tree icons' },
  'components/ui/fields/ColourField.tsx': { count: 1, why: 'a colour swatch of a field' },
  'components/ui/fields/ColourPicker.tsx': { count: 1, why: 'colour swatches' },
  'components/ui/fields/ValueBar.tsx': { count: 2, why: 'the reset icon inside a field, and the options of its list' },
  'components/ui/overlays/Dropdown.tsx': { count: 1, why: 'the menu items' },
  'components/ui/overlays/ExtendMenu.tsx': { count: 1, why: 'the menu items' },
  'components/ui/overlays/SideMenu.tsx': { count: 1, why: 'the menu items' },
  'components/ui/tree/IconMenu.tsx': { count: 2, why: 'a tree row icon (+) and the menu items' },
  'components/ui/tree/TreeIcon.tsx': { count: 1, why: 'a tree row icon' },
  'components/ui/tree/TreeMenu.tsx': { count: 4, why: 'a tree row icon (⋯), the menu items, an item that opens a submenu and the submenu items' },
  'components/ui/tree/TreeRowIcon.tsx': { count: 1, why: 'a tree row icon' },
  'features/board/BranchesPopout.tsx': { count: 1, why: 'list rows' },
  'features/board/ForwardLink.tsx': { count: 1, why: 'list rows' },
  'features/board/LayersButton.tsx': { count: 1, why: 'list rows' },
  'features/board/MapPicker.tsx': { count: 2, why: "list rows, and the map's title that opens them" },
  'features/board/PinPicker.tsx': { count: 1, why: 'options of a picker' },
  'features/board/presenter/Presenter.tsx': { count: 2, why: 'a segmented choice, and the slide thumbnails' },
  'features/board/ShapeGrid.tsx': { count: 2, why: 'options of a picker' },
  'features/board/sidebar/border/BorderCountySection.tsx': { count: 1, why: 'an upload area' },
  'features/board/sidebar/border/BorderShapeSection.tsx': { count: 1, why: 'an option of a picker' },
  'features/board/sidebar/border/BorderWaySection.tsx': { count: 1, why: 'options of a picker' },
  'features/board/sidebar/common/OptionRowPicker.tsx': { count: 2, why: 'a select field and its options' },
  'features/board/sidebar/common/PointToolButton.tsx': { count: 1, why: 'tabs' },
  'features/board/sidebar/common/SidebarSection.tsx': { count: 1, why: "a section's header row" },
  'features/board/sidebar/line/LineArrowsSection.tsx': { count: 1, why: 'options of a picker' },
  'features/board/sidebar/line/LineWaySection.tsx': { count: 1, why: 'options of a picker' },
  'features/board/sidebar/point/PointBannerSection.tsx': { count: 1, why: 'an upload area' },
  'features/board/sidebar/selection/SelectionList.tsx': { count: 1, why: 'list rows' },
  'features/board/sidebar/text/TextStylesSection.tsx': { count: 1, why: 'list rows' },
  'features/dashboard/DashboardColumns.tsx': { count: 1, why: 'a drag handle' },
  'features/dashboard/RowHeader.tsx': { count: 1, why: "the row's title (a heading that opens its project)" },
  'features/layouts/LayoutThumb.tsx': { count: 1, why: 'a layout tile' },
  'features/objects/ListRows.tsx': { count: 1, why: 'list rows' },
  'features/search/SearchPanel.tsx': { count: 3, why: 'a segmented choice, a result row and its drag handle' },
}

/** Where the button classes (ui-btn…) may be written: the buttons, and ExtendMenu's growing box */
const CLASSES_ALLOWED = [BUTTONS, 'components/ui/overlays/ExtendMenu.tsx']

/** Classes that give a button a look of its own: the look belongs in styles/buttons.css */
const LOOK_CLASS = /(^|[\s`"'{])(bg-|text-\[|px-|py-|p-\d|rounded|shadow|border\b|border-)/

// Every source file of the app (src/), as text, by its path from src/
const raw = import.meta.glob(['../../../**/*.{ts,tsx}', '!../../../**/*.test.{ts,tsx}'], { query: '?raw', import: 'default', eager: true })
const sources = Object.entries(raw).map(([key, text]) => ({
  // (the keys are relative to this file, as short as they can be: './Button.tsx', '../Divider.tsx')
  path: new URL(key, import.meta.url).pathname.replace(/^.*?\/src\//, ''),
  text: text as string,
}))

/** Without comments (a comment may name a class or a component) */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** The opening tags of a component: from `<Name` to its `>` (braces and strings skipped, so `=>` inside doesn't end it) */
function openingTags(text: string, name: string): string[] {
  const tags: string[] = []
  const start = new RegExp(`<${name}[\\s/>]`, 'g')
  for (const match of text.matchAll(start)) {
    let depth = 0
    let quote: string | null = null
    let i = match.index + 1
    for (; i < text.length; i++) {
      const c = text[i]
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    tags.push(text.slice(match.index, i + 1))
  }
  return tags
}

describe('buttons', () => {
  it('has no <button> outside components/ui/buttons, except the allowed rows and options', () => {
    const wrong = sources
      .filter((f) => !f.path.startsWith(BUTTONS))
      .map((f) => ({ path: f.path, count: (code(f.text).match(/<button\b/g) ?? []).length }))
      .filter((f) => f.count !== (ALLOWED[f.path]?.count ?? 0))
      .map((f) => `${f.path}: ${f.count} <button> (allowed: ${ALLOWED[f.path]?.count ?? 0}). Use Button / IconButton / SplitButton / ButtonLink / NavButton`)
    expect(wrong).toEqual([])
  })

  it('writes the button classes (ui-btn…) only in the buttons', () => {
    const wrong = sources
      .filter((f) => !CLASSES_ALLOWED.some((allowed) => f.path.startsWith(allowed)) && /\bui-btn/.test(code(f.text)))
      .map((f) => `${f.path}: uses ui-btn classes. Use a component of ${BUTTONS}`)
    expect(wrong).toEqual([])
  })

  it('uses the Panel button only for the floating Create button', () => {
    const wrong = sources
      .filter((f) => f.path !== 'features/create/CreateFab.tsx' && !f.path.startsWith(BUTTONS) && /\bPanelFrame\b/.test(code(f.text)))
      .map((f) => f.path)
    expect(wrong).toEqual([])
  })

  it('gives buttons no look of their own (colours, padding, corners, shadows: styles/buttons.css)', () => {
    const wrong = sources.flatMap((f) =>
      ['Button', 'ButtonLink', 'NavButton', 'IconButton', 'SplitButton', 'LinkButton', 'ButtonLook'].flatMap((name) =>
        openingTags(code(f.text), name)
          .map((tag) => tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/))
          .filter((m): m is RegExpMatchArray => !!m && LOOK_CLASS.test(m[1] ?? m[2]))
          .map((m) => `${f.path}: <${name} className="${m[1] ?? m[2]}">`),
      ),
    )
    expect(wrong).toEqual([])
  })
})
