import type { CSSProperties, ReactNode } from 'react'
import Button from '../buttons/Button'
import NavButton from '../buttons/NavButton'
import TreeIcon from './TreeIcon'
import TreeLabel from './TreeLabel'
import TreeRowIcon from './TreeRowIcon'
import type { TreeIcons, TreeNode, TreeRowState } from './types'

/**
 * Renders a row's link (e.g. a draggable one), for leaves and for folders that open a page. It
 * gets the classes and indent the tree computed, and `children`: the row's icon + label, to
 * put inside the link as they are.
 */
export type RenderLink = (
  node: TreeNode,
  props: { className: string; style: CSSProperties; children: ReactNode },
) => ReactNode

type Props = {
  node: TreeNode
  expanded: Set<string>
  onToggle: (id: string) => void
  renderLink?: RenderLink
  icons?: TreeIcons
  editableLabels?: boolean
}

// Fills the row; the right icons sit over its end and the label fades before them
const ROW_CLASS = 'min-w-0 flex-1 justify-start'
// Same start padding for every row; deeper levels are indented by their group's margin (below)
const INDENT: CSSProperties = { paddingInlineStart: 'var(--btn-px)', paddingInlineEnd: 0 }
// A folder that is also a link: its icon is a separate button laid over the link's start, so the
// link's label starts after it (padding + the icon's box + the gap before the label)
const INDENT_AFTER_ICON: CSSProperties = {
  paddingInlineStart: 'calc(var(--btn-px) + var(--btn-icon-size) + 2 * var(--btn-close-p) + var(--tree-label-gap))',
  paddingInlineEnd: 0,
}

// Width of n right icons: their boxes + the 2px gaps between them (gap-0.5) + the end padding
const iconsWidth = (n: number) =>
  n === 0 ? '0px' : `calc(${n} * (var(--btn-icon-size) + 2 * var(--btn-close-p)) + ${n - 1} * 2px + var(--btn-px))`

/**
 * One row: [icon] [label] ……… [right icons], then its children if it's an open folder. A folder's
 * icon turns into the open/closed arrow while the row is hovered.
 * - folder without a page: the whole row is a button that opens/closes it
 * - folder with a page (`to` or `panel`): the row is a link to it; the icon alone opens/closes
 * - leaf: the row is a link
 * The right icons sit over the end of the row (not inside the button/link), so they can be buttons.
 */
export default function TreeItem({ node, expanded, onToggle, renderLink, icons = {}, editableLabels }: Props) {
  const state: TreeRowState = { isFolder: !!node.children?.length, isOpen: expanded.has(node.id) }
  const isLink = !state.isFolder || !!(node.to || node.panel)
  const icon = state.isOpen ? (node.openIcon ?? node.icon) : node.icon
  const folder = state.isFolder ? { isOpen: state.isOpen } : undefined
  const right = icons.right?.(node, state) ?? []
  const alwaysShown = right.filter((i) => (i.show ?? 'always') === 'always').length

  // [icon] then the label (--tree-label-gap between). One child for the button/link, so the tree's
  // gap applies instead of the button's own --btn-gap.
  const content = (rowIcon?: ReactNode) => (
    <span className="flex min-w-0 flex-1 items-center gap-(--tree-label-gap)">
      {rowIcon}
      <TreeLabel editable={editableLabels}>{node.label}</TreeLabel>
    </span>
  )

  const linkProps =
    state.isFolder
      ? { className: ROW_CLASS, style: INDENT_AFTER_ICON, children: content() }
      : { className: ROW_CLASS, style: INDENT, children: content(icon && <TreeRowIcon icon={icon} />) }

  return (
    <li role="treeitem" aria-expanded={state.isFolder ? state.isOpen : undefined}>
      {/* The row: its hover background spans the button/link and the right icons */}
      <div
        style={{ '--icons-rest': iconsWidth(alwaysShown), '--icons-hover': iconsWidth(right.length) } as CSSProperties}
        className="group/row relative flex items-center rounded-(--btn-radius) hover:bg-fill [--icons:var(--icons-rest)] hover:[--icons:var(--icons-hover)] has-[:focus-visible]:[--icons:var(--icons-hover)]"
      >
        {!isLink ? (
          <Button variant="ghost" onClick={() => onToggle(node.id)} className={ROW_CLASS} style={INDENT}>
            {content(<TreeRowIcon icon={icon} folder={folder} />)}
          </Button>
        ) : (
          <>
            {state.isFolder && (
              <span className="absolute start-(--btn-px) top-1/2 z-10 flex -translate-y-1/2">
                <TreeRowIcon
                  icon={icon}
                  folder={folder}
                  toggle={{
                    onClick: () => onToggle(node.id),
                    label: state.isOpen ? `Collapse ${node.label}` : `Expand ${node.label}`,
                  }}
                />
              </span>
            )}
            {renderLink ? (
              renderLink(node, linkProps)
            ) : (
              <NavButton to={node.to ?? '/'} {...linkProps} />
            )}
          </>
        )}

        {right.length > 0 && (
          <div className="absolute inset-y-0 end-0 z-10 flex items-center gap-0.5 pe-(--btn-px)">
            {right.map((icon, i) => (
              <TreeIcon key={i} {...icon} />
            ))}
          </div>
        )}
      </div>

      {state.isFolder && state.isOpen && (
        // Children: narrower rows, moved right by one indent step
        <ul role="group" className="mt-1 ms-(--tree-indent) flex flex-col gap-1">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              renderLink={renderLink}
              icons={icons}
              editableLabels={editableLabels}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
