import { previewOf, projectsConfig, type Project, type ProjectFilter, type ProjectInput, type ProjectListItem, type ProjectUpdate } from '@map/shared'
import { and, eq } from 'drizzle-orm'
import { projects } from '../../db/schema'
import { hasChanges, userId, type Ctx, type Repo } from '../../lib/crud'
import { fetchLimit, mapPage, toPage } from '../../lib/pagination'
import { listSort, pickOrder, sortColumnsOf } from '../../lib/sort'

// The list's order comes from projectsConfig.order (shared/src/projects.ts); the table's index (projects_list_idx) has the same order
const projectSort = listSort(sortColumnsOf(projects, projectsConfig.order))

type Row = typeof projects.$inferSelect

/** A project without its content: what a list reads and returns (the content column is not even selected) */
type ListRow = Omit<Row, 'content'>

/** The only fields that leave the server; typed by the shared contract */
const toListItem = (project: ListRow): ProjectListItem => ({
  id: project.id,
  title: project.title,
  preview: project.preview,
  archived: project.archived,
  ...pickOrder(project, projectsConfig.order), // pinned and position, whichever the config turns on
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
})

const toJson = (project: Row): Project => ({ ...toListItem(project), content: project.content })

/**
 * The preview is derived from the content in the same write, so the two never differ: only a write that sets the content
 * sets the preview (the content is already cleaned by the contract; the preview is plain text made from it).
 */
const withPreview = <T extends { content?: string }>(fields: T) =>
  fields.content === undefined ? fields : { ...fields, preview: previewOf(fields.content) }

const mine = (ctx: Ctx, id: number) => and(eq(projects.id, id), eq(projects.userId, userId(ctx)))

export const projectsRepo: Repo<ProjectInput, ProjectUpdate, Project, ProjectFilter, ProjectListItem> = {
  async list(ctx, page, { archived }) {
    const rows = await ctx.db.query.projects.findMany({
      where: and(eq(projects.userId, userId(ctx)), eq(projects.archived, archived), projectSort.after(page)),
      columns: { content: false }, // a list shows the preview: the (up to 100 KB) content is not read
      orderBy: projectSort.orderBy,
      limit: fetchLimit(page),
    })
    return mapPage(toPage(rows, page, projectSort.cursorOf), toListItem)
  },

  async get(ctx, id) {
    const project = await ctx.db.query.projects.findFirst({ where: mine(ctx, id) })
    return project ? toJson(project) : null
  },

  async create(ctx, fields) {
    const project = await ctx.db.insert(projects).values({ ...withPreview(fields), userId: userId(ctx) }).returning().get()
    return toJson(project)
  },

  // updated_at is refreshed by the schema on every update
  async update(ctx, id, fields) {
    if (!hasChanges(fields)) return projectsRepo.get(ctx, id) // nothing to change (Drizzle rejects an empty SET): the project as it is
    const project = await ctx.db.update(projects).set(withPreview(fields)).where(mine(ctx, id)).returning().get()
    return project ? toJson(project) : null
  },

  async remove(ctx, id) {
    const gone = await ctx.db.delete(projects).where(mine(ctx, id)).returning({ id: projects.id }).get()
    return gone !== undefined
  },
}
