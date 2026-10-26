import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { CSSProperties, ReactNode } from 'react'
import TreeRowLink from './TreeRowLink'
import DropIcon from '../drop/DropIcon'
import TreeIcon from './TreeIcon'
import TreeLabel from './TreeLabel'
import TreeRowIcon from './TreeRowIcon'
import { css, EASING, reducedMotion, TIMING } from './dragEffects'
import { useCollapsible } from './useCollapsible'
import type { TreeDnd, TreeDropPosition, TreeIcons, TreeNode, TreeRowState } from './types'

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
  /** The row whose name is being edited, and how it changes (TreeView) */
  editingId?: string | null
  onEditingChange?: (id: string | null) => void
  onRename?: (node: TreeNode, name: string) => void
  canRename?: (node: TreeNode) => boolean
  keepVisible?: (node: TreeNode) => boolean
  dnd?: TreeDnd
  compact?: boolean
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
// A row that isn't a link: a folder without a page, or any row while its name is edited (an input
// can't sit inside a link). As tall as a link row (rounded, for the editing highlight); the end
// padding keeps the text off the edge
const PLAIN_ROW = `${ROW_CLASS} flex min-h-(--sidebar-row) items-center rounded-(--btn-radius) py-(--pill-py) pe-(--btn-px) text-body`

// Children: one indent step right; none in compact (one column), sliding with the width animation
const GROUP =
  'mt-1 ms-[var(--tree-indent-now,var(--tree-indent))] flex flex-col gap-1 ' +
  'transition-[margin] duration-(--tree-compact-duration) ease-out motion-reduce:transition-none'
// The children that stay visible under a closed folder fade in (the Zen reel's expand)
const KEPT = 'animate-tree-expand motion-reduce:animate-none'

/** The descendants of a collapsed folder that must stay visible (e.g. open ones), in tree order */
function keptDescendants(node: TreeNode, keep: (node: TreeNode) => boolean): TreeNode[] {
  return (node.children ?? []).flatMap((child) => (keep(child) ? [child] : keptDescendants(child, keep)))
}

// Where a drop would land: a line with a dot at its start, in the gap above or below the row (the
// Zen reel's insertion line), 4px wider than the row on both sides (the sidebar's scroll box has that much room, so nothing clips it).
// A child's row is narrower (indented), so its line is too
const LINE: Record<'before' | 'after', string> = {
  before: '-top-[3px]',
  after: '-bottom-[3px]',
}
// The row being dragged: its place keeps a faded copy of it (icon and name; the hover icons are hidden), while the
// lifted copy follows the pointer
const LEFT_BEHIND = 'opacity-50 hover:bg-transparent [&_[data-row-icons]]:invisible'
// A folder about to receive something: tinted, with a ring
const INTO = 'bg-drop/16 ring-[1.4px] ring-inset ring-drop/55'

function DropLine({ at }: { at: 'before' | 'after' }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute -start-1 -end-1 z-20 h-0.5 bg-drop ${LINE[at]}`}>
      <span className="absolute start-0 -top-[2px] size-1.5 rounded-(--radius-pill) bg-drop" />
    </span>
  )
}

// Width of n right icons: their boxes + the 2px gaps between them (gap-0.5) + the end padding
const iconsWidth = (n: number) =>
  n === 0 ? '0px' : `calc(${n} * (var(--btn-icon-size) + 2 * var(--btn-close-p)) + ${n - 1} * 2px + var(--btn-px))`

/**
 * One row: [icon] [label] ……… [right icons], then its children if it's an open folder. A folder's
 * icon turns into the open/closed arrow while the row is hovered; only that icon opens/closes it.
 * - folder without a page: the rest of the row is plain (clicking the name does nothing)
 * - folder with a page (`to` or `panel`): the rest of the row is a link to it
 * - leaf: the row is a link
 * The right icons sit over the end of the row (not inside the button/link), so they can be buttons.
 */
export default function TreeItem({
  node,
  expanded,
  onToggle,
  renderLink,
  icons = {},
  editingId,
  onEditingChange,
  onRename,
  canRename,
  keepVisible,
  dnd,
  compact,
}: Props) {
  const state: TreeRowState = { isFolder: !!node.children?.length, isOpen: expanded.has(node.id) }
  const isLink = !state.isFolder || !!(node.to || node.panel)
  // Open folders, and folders something is falling into (their lid is up), show their open icon
  const icon = state.isOpen || dnd?.lidOpen?.(node.id) ? (node.openIcon ?? node.icon) : node.icon
  const folder = state.isFolder ? { isOpen: state.isOpen } : undefined
  const renamable = !!onRename && !!onEditingChange && (canRename?.(node) ?? true)
  const editing = renamable && editingId === node.id

  // Drag & drop: the row takes drops (dnd.dropData); a row that isn't a link drags itself (links: renderLink)
  const dropData = dnd?.dropData?.(node)
  const { setNodeRef: setDropRef } = useDroppable({ id: `row:${node.id}`, data: dropData, disabled: !dropData })
  const plainDrag = !isLink && !editing ? dnd?.dragData?.(node) : undefined
  const { setNodeRef: setDragRef, listeners: dragListeners, attributes } = useDraggable({
    id: `row:${node.id}`,
    data: plainDrag,
    disabled: !plainDrag,
  })
  // Keep the row's own role (dnd-kit would announce it as a button)
  const { role: _role, ...dragAttributes } = attributes
  const dropAt: TreeDropPosition | null = dnd?.target?.nodeId === node.id ? dnd.target.position : null
  // The drop node sliding out of its right side (none in compact: the rail is too narrow)
  const link = compact ? undefined : dnd?.linkNode?.(node)
  // Compact: no right icons (they'd sit over the left one); none either while the name is edited or
  // while the drop node is out
  const right = compact || editing || link?.state === 'shown' ? [] : (icons.right?.(node, state) ?? [])
  const alwaysShown = right.filter((i) => (i.show ?? 'always') === 'always').length
  const kept = state.isFolder && !state.isOpen && keepVisible ? keptDescendants(node, keepVisible) : []
  // Opening slides the children down from behind the row; closing slides them back up behind it (useCollapsible)
  const slideMs = reducedMotion() ? 0 : TIMING.expand
  const slide = useCollapsible(state.isFolder && state.isOpen, slideMs)

  // [icon] then the label (--tree-label-gap between). One child for the button/link, so the tree's
  // gap applies instead of the button's own --btn-gap.
  const content = (rowIcon?: ReactNode) => (
    <span className="flex min-w-0 flex-1 items-center gap-(--tree-label-gap)">
      {rowIcon}
      <TreeLabel
        badge={node.badge}
        onStartEdit={renamable ? () => onEditingChange!(node.id) : undefined}
        editing={
          editing
            ? {
                onSave: (name) => {
                  onRename!(node, name)
                  onEditingChange!(null)
                },
                onCancel: () => onEditingChange!(null),
              }
            : undefined
        }
      >
        {node.label}
      </TreeLabel>
    </span>
  )

  // Folders: [icon] is a separate button laid over the row's start (opens/closes them), so the label
  // starts after it; leaves: [icon] inside the row
  const rowProps = state.isFolder
    ? { className: ROW_CLASS, style: INDENT_AFTER_ICON, children: content() }
    : {
        className: ROW_CLASS,
        style: INDENT,
        // A row that takes drops marks its icon too: what is dropped on it falls in (a folder's icon is marked above)
        children: content(icon && (dropData ? <span data-drop-icon={node.id} className="flex shrink-0"><TreeRowIcon icon={icon} /></span> : <TreeRowIcon icon={icon} />)),
      }

  const rows = (list: TreeNode[]) =>
    list.map((child) => (
      <TreeItem
        key={child.id}
        node={child}
        expanded={expanded}
        onToggle={onToggle}
        renderLink={renderLink}
        icons={icons}
        editingId={editingId}
        onEditingChange={onEditingChange}
        onRename={onRename}
        canRename={canRename}
        keepVisible={keepVisible}
        dnd={dnd}
        compact={compact}
      />
    ))

  return (
    <li role="treeitem" aria-expanded={state.isFolder ? state.isOpen : undefined} className="relative">
      {(dropAt === 'before' || dropAt === 'after') && <DropLine at={dropAt} />}
      {/* The row: its hover background spans the button/link and the right icons. Compact (TreeView):
          --tree-row-max narrows it to its icon, smoothly over --tree-compact-duration */}
      <div
        ref={setDropRef}
        {...node.rowData}
        data-row-id={node.id}
        style={{ '--icons-rest': iconsWidth(alwaysShown), '--icons-hover': iconsWidth(right.length) } as CSSProperties}
        className={`${dropAt === 'into' ? INTO : ''} ${dnd?.draggingId === node.id ? LEFT_BEHIND : ''} group/row ui-field-row relative flex items-center [--icons:var(--icons-rest)] hover:[--icons:var(--icons-hover)] has-[:focus-visible]:[--icons:var(--icons-hover)] max-w-[var(--tree-row-max,100%)] transition-[max-width] duration-(--tree-compact-duration) ease-out motion-reduce:transition-none`}
      >
        {state.isFolder && (
          <span data-drop-icon={node.id} className="absolute start-(--btn-px) top-1/2 z-10 flex -translate-y-1/2">
            {editing ? (
              // Only the node's own icon while its name is edited (no open/close arrow)
              <TreeRowIcon icon={icon} />
            ) : (
              <TreeRowIcon
                icon={icon}
                folder={folder}
                toggle={{
                  onClick: () => onToggle(node.id),
                  label: state.isOpen ? `Collapse ${node.label}` : `Expand ${node.label}`,
                }}
              />
            )}
          </span>
        )}

        {editing ? (
          <div className={`${PLAIN_ROW} bg-fill`} style={rowProps.style}>
            {rowProps.children}
          </div>
        ) : !isLink ? (
          // A folder without a page: clicking its name does nothing (only its icon opens/closes it)
          <div
            ref={setDragRef}
            {...(plainDrag ? { ...dragListeners, ...dragAttributes } : {})}
            className={PLAIN_ROW}
            style={rowProps.style}
          >
            {rowProps.children}
          </div>
        ) : renderLink ? (
          renderLink(node, rowProps)
        ) : (
          <TreeRowLink to={node.to ?? '/'} {...rowProps} />
        )}

        {link && <DropIcon {...link} className="absolute end-0 top-0 z-20" />}

        {right.length > 0 && (
          <div data-row-icons className="absolute inset-y-0 end-0 z-10 flex items-center gap-0.5 pe-(--btn-px)">
            {right.map((icon, i) => (
              <TreeIcon key={i} {...icon} />
            ))}
          </div>
        )}
      </div>

      {state.isFolder && slide.mounted && (node.children?.length ?? 0) > 0 ? (
        // Children: narrower rows, moved right by one indent step. They slide out from behind the row above: the box grows from nothing
        // while the list moves down into it, clipped by the box until it is still
        <div
          style={{
            display: 'grid',
            gridTemplateRows: slide.shown ? '1fr' : '0fr',
            transition: slideMs ? `grid-template-rows ${slideMs}ms ${css(EASING.expand)}` : 'none',
          }}
        >
          <div className="min-h-0" style={{ overflow: slide.settled ? 'visible' : 'hidden' }}>
            <ul
              role="group"
              className={GROUP}
              style={{ transform: slide.shown ? 'none' : 'translateY(-100%)', transition: slideMs ? `transform ${slideMs}ms ${css(EASING.expand)}, margin var(--tree-compact-duration) ease-out` : undefined }}
            >
              {rows(node.children!)}
            </ul>
          </div>
        </div>
      ) : (
        state.isFolder &&
        kept.length > 0 && (
          // Collapsed: only the children that must stay visible
          <ul role="group" aria-label="Open items" className={`${GROUP} ${KEPT}`}>
            {rows(kept)}
          </ul>
        )
      )}
    </li>
  )
}
