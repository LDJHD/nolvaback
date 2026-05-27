import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  env.get('FRONTEND_URL'),
].filter(Boolean)

const corsConfig = defineConfig({
  enabled: true,
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
