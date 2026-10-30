import { messageFilter, messageImport, messageInput, messageUpdate } from '@map/shared'
import { requireAuth } from '../../middleware/auth'
import { crudRoutes, toCtx } from '../../lib/crud'
import { validate } from '../../lib/validate'
import { importMessages, messagesRepo } from './messages.repo'

/**
 * /api/messages (docs/plans/34): the generic routes (GET /:id when its words are clicked, GET /?articleId=&exclude= "Not in the text",
 * POST, PATCH /:id, DELETE /:id), signed in; the repo checks the article's access. Plus POST /import: an article's old messages at once
 */
const messagesRoutes = crudRoutes({
  access: 'owner',
  create: messageInput,
  update: messageUpdate,
  filter: messageFilter,
  repo: messagesRepo,
}).post('/import', requireAuth, validate('json', messageImport), async (c) => {
  return c.json(await importMessages(toCtx(c), c.req.valid('json') as never), 201)
})

export default messagesRoutes
