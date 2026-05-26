import dotenv from 'dotenv'
import path from 'path'
import express, { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { corsMiddleware, securityHeaders, permissionsPolicyHeaders, apiLimiter, authLimiter, requestId } from './middleware/security'
import { authMiddleware } from './middleware/auth'
import { createLogger, createContextLogger as sharedCreateContextLogger, createLogHelpers } from '../shared/logger'

dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const logger = createLogger('bodyos-gateway')
const log = createLogHelpers(logger)

const createContextLogger = (ctx: any) => sharedCreateContextLogger(logger, ctx)

const app = express()
const PORT = process.env.PORT ?? 3000

app.set('trust proxy', 1)

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: REQUEST ID
// ─────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) ?? randomUUID()
  req.headers['x-request-id'] = id
  res.setHeader('X-Request-ID', id)
  next()
})

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: REQUEST LOGGING
// ─────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'info'

    log[level](`${req.method} ${req.path}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
    })
  })

  next()
})

app.use(requestId)
app.use(corsMiddleware)
app.use(securityHeaders)
app.use(permissionsPolicyHeaders)
app.use(express.json({ limit: '10mb' }))

// ─────────────────────────────────────────────────────────────
// ROTAS PÚBLICAS
// ─────────────────────────────────────────────────────────────

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'gateway' })
})

// ─────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────

app.use('/auth', authLimiter)

// ─────────────────────────────────────────────────────────────
// API ROUTES — PROXY COM AUTH
// ─────────────────────────────────────────────────────────────

const apiRouter = express.Router()
apiRouter.use(authMiddleware)

apiRouter.all('*', async (req: Request & { user?: { id: string } }, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const userId = req.user?.id
  const targetUrl = `${process.env.AI_SERVICE_URL}${req.url}`
  const ctxLog = createContextLogger({ requestId, userId, action: 'proxy' })

  ctxLog.info('Proxying request to AI service', {
    method: req.method,
    path: req.url,
    // NUNCA loga body completo — pode conter dados pessoais
    hasBody: !!req.body && Object.keys(req.body).length > 0,
  })

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_API_KEY ?? '',
        'X-Request-ID': requestId,
        'X-User-ID': userId ?? '',
      },
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      ctxLog.warn('AI service returned error', {
        statusCode: response.status,
        targetUrl,
      })
      try {
        return res.status(response.status).json(JSON.parse(errorText))
      } catch {
        return res.status(response.status).send(errorText)
      }
    }

    const data = await response.json()
    ctxLog.info('Proxy request completed successfully', {
      statusCode: response.status,
    })
    return res.json(data)

  } catch (error: any) {
    log.error('Proxy request failed — AI service unreachable', error, {
      requestId,
      userId,
      targetUrl,
    })
    return res.status(502).json({ error: 'Erro de comunicação com o serviço interno' })
  }
})

app.use('/api', apiLimiter, apiRouter)

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string
  log.fatal('Unhandled error in gateway', err, { requestId, path: req.path })
  res.status(500).json({ error: 'Internal server error' })
})

// ─────────────────────────────────────────────────────────────
// PROCESS ERROR HANDLERS
// ─────────────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  log.fatal('Uncaught exception — process will exit', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.fatal('Unhandled promise rejection', reason as Error)
  process.exit(1)
})

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────

app.listen(Number(PORT), '0.0.0.0', () => {
  log.info('Gateway started', { port: PORT, env: process.env.NODE_ENV })
})
