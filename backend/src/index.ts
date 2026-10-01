import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',
    "https://map.kopotitore.workers.dev",
  ],   // add your real website domain later
}))

app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Hono!' })
})

export default app
