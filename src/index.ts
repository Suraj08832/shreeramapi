import app from './server'

const port = Number(process.env.PORT) || 5000

Bun.serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

console.log(`Server is running on http://0.0.0.0:${port}`)
