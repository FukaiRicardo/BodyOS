import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { log, createContextLogger, sanitize } from './logger'
import {
  generateNutritionPlan,
  generateWorkoutPlan,
  adaptProtocol,
  analyzeReport,
  generateClientFeedback
} from './planGenerator'

const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT ?? 3001

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: REQUEST ID
// Injeta requestId em cada request para rastreabilidade
// ─────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID()
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
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
      // NUNCA loga body ou headers completos
      ip: req.ip,
    })
  })

  next()
})

// ─────────────────────────────────────────────────────────────
// SEGURANÇA
// ─────────────────────────────────────────────────────────────

const DEFAULT_ALLOWED_ORIGINS = [
  'https://bodyos.app',
  'https://www.bodyos.app',
]

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xFrameOptions: { action: 'deny' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-ID'],
  credentials: false,
  maxAge: 86400,
}))

app.use(express.json({ limit: '10kb' }))

// ─────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Too many requests' },
  skip: (req) => req.path === '/health',
})
app.use(limiter)

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many AI requests. Wait a moment.' },
})

// ─────────────────────────────────────────────────────────────
// API KEY AUTH
// ─────────────────────────────────────────────────────────────

const AI_API_KEY = process.env.AI_API_KEY

const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string
  const key = req.headers['x-api-key']

  if (!AI_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      log.error('AI_API_KEY is missing in production', { requestId, path: req.path, ip: req.ip })
      return res.status(500).json({ error: 'Service misconfigured' })
    }
    log.warn('AI_API_KEY not configured; skipping API key validation in non-production', {
      requestId,
      path: req.path,
      ip: req.ip,
    })
    return next()
  }

  if (!key || key !== AI_API_KEY) {
    log.warn('Unauthorized API access attempt', { requestId, path: req.path, ip: req.ip })
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO ZOD
// ─────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'] as const

const LocationSchema = z.object({
  country: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().nullable().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
}).optional()

const UserProfileSchema = z.object({
  goal: z.string(),
  fitness_level: z.string(),
  weekly_days: z.number(),
  daily_calories: z.number().optional(),
  current_weight_kg: z.number().optional(),
  height_cm: z.number().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
  history: z.any().optional(),
  training_location: z.string().optional(),
  location: LocationSchema,
})

const AnyObjectSchema = z.object({}).passthrough()

const ReportSchema = z.object({
  weight_kg: z.number().min(0).optional(),
  water_intake_ml: z.number().min(0).optional(),
  energy_level: z.number().min(0).max(10).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  mood: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
}).passthrough()

const FeedbackSchema = z.object({
  analysis: z.any().optional(),
  report: ReportSchema.optional(),
}).passthrough()

// ─────────────────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────────────────

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai' })
})

app.post('/nutrition/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'generateNutrition' })

  try {
    const validatedData = UserProfileSchema.parse(req.body)

    ctxLog.info('Nutrition plan generation started', {
      goal: validatedData.goal,
      fitness_level: validatedData.fitness_level,
      language: validatedData.language,
      hasLocation: !!validatedData.location,
    })

    const result = await generateNutritionPlan(validatedData)

    ctxLog.info('Nutrition plan generated successfully', {
      mealsCount: result?.meals?.length,
      hasSupplements: !!result?.supplements?.length,
    })

    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Nutrition validation failed', { requestId, errors: error.errors })
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    log.error('Nutrition plan generation failed', error, { requestId })
    res.status(500).json({ error: 'AI service error' })
  }
})

app.post('/workout/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'generateWorkout' })

  try {
    await sleep(1000)
    const validatedData = UserProfileSchema.parse(req.body)

    ctxLog.info('Workout plan generation started', {
      goal: validatedData.goal,
      fitness_level: validatedData.fitness_level,
      training_location: validatedData.training_location,
      weekly_days: validatedData.weekly_days,
    })

    const result = await generateWorkoutPlan(validatedData)

    ctxLog.info('Workout plan generated successfully', {
      sessionsCount: result?.sessions?.length,
    })

    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Workout validation failed', { requestId, errors: error.errors })
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    log.error('Workout plan generation failed', error, { requestId })
    res.status(500).json({ error: 'AI service error' })
  }
})

app.post('/protocol/adapt', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'adaptProtocol' })

  try {
    const validatedData = AnyObjectSchema.parse(req.body)
    ctxLog.info('Protocol adaptation started')
    const result = await adaptProtocol(validatedData)
    ctxLog.info('Protocol adaptation completed')
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Protocol adaptation validation failed', { requestId, errors: error.errors })
      return res.status(400).json({ error: 'Invalid request data', details: error.errors })
    }
    log.error('Protocol adaptation failed', error, { requestId })
    res.status(500).json({ error: 'Erro ao adaptar protocolo' })
  }
})

app.post('/report/analyze', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'analyzeReport' })

  try {
    const validatedData = ReportSchema.parse(req.body)
    ctxLog.info('Report analysis started', {
      hasWaterIntake: !!validatedData.water_intake_ml,
      hasEnergyLevel: !!validatedData.energy_level,
    })
    const result = await analyzeReport(validatedData)
    ctxLog.info('Report analysis completed', { score: result?.score })
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Report analysis validation failed', { requestId, errors: error.errors })
      return res.status(400).json({ error: 'Invalid request data', details: error.errors })
    }
    log.error('Report analysis failed', error, { requestId })
    res.status(500).json({ error: 'Erro ao analisar relatório' })
  }
})

app.post('/feedback/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'generateFeedback' })

  try {
    const validatedData = FeedbackSchema.parse(req.body)
    ctxLog.info('Feedback generation started')
    const report = await analyzeReport(validatedData)
    const feedback = await generateClientFeedback({ ...validatedData, analysis: report })
    ctxLog.info('Feedback generated successfully')
    res.json(feedback)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Feedback generation validation failed', { requestId, errors: error.errors })
      return res.status(400).json({ error: 'Invalid request data', details: error.errors })
    }
    log.error('Feedback generation failed', error, { requestId })
    res.status(500).json({ error: 'Erro ao gerar feedback' })
  }
})

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// Captura erros não tratados — falhas silenciosas eliminadas
// ─────────────────────────────────────────────────────────────

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string
  log.fatal('Unhandled error in express', err, { requestId, path: req.path })
  res.status(500).json({ error: 'Internal server error' })
})

// ─────────────────────────────────────────────────────────────
// PROCESS ERROR HANDLERS
// Garante que crashes sejam sempre logados
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
  log.info(`AI service started`, { port: PORT, env: process.env.NODE_ENV })
})
