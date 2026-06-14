import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { randomUUID, timingSafeEqual } from 'crypto'
import { log, createContextLogger } from './logger'
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
// ─────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID()
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
})

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: REQUEST LOGGING
// Nunca loga body ou headers completos
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

// ─────────────────────────────────────────────────────────────
// SEGURANÇA: Helmet com CSP ativo
// ─────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
}))

// CORS restrito às origens configuradas
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? []

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (ex: health checks internos do Render)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }
    log.warn('CORS blocked request', { origin })
    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  credentials: false,
}))

// Limite de tamanho do body — previne DoS via payload gigante
app.use(express.json({ limit: '10kb' }))

// Remove header que revela tecnologia
app.disable('x-powered-by')

// ─────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────

// Rate limit global — todas as rotas
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a minute.' },
  skip: (req) => req.path === '/health',
  keyGenerator: (req) => req.ip ?? 'unknown',
})
app.use(globalLimiter)

// Rate limit específico para rotas de IA — mais restritivo
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // máximo 10 chamadas de IA por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Wait a moment.' },
  keyGenerator: (req) => req.ip ?? 'unknown',
})

// ─────────────────────────────────────────────────────────────
// API KEY AUTH — timing-safe comparison
// ─────────────────────────────────────────────────────────────

const AI_API_KEY = process.env.AI_API_KEY

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  if (!AI_API_KEY) {
    log.warn('AI_API_KEY not configured — all requests allowed', { path: req.path })
    return next()
  }
  const key = req.headers['x-api-key'] as string | undefined
  if (!key || !timingSafeCompare(key, AI_API_KEY)) {
    const requestId = req.headers['x-request-id'] as string
    log.warn('Unauthorized API access attempt', { requestId, path: req.path, ip: req.ip })
    // Delay para dificultar brute-force
    setTimeout(() => {
      res.status(401).json({ error: 'Unauthorized' })
    }, 200)
    return
  }
  next()
}

// ─────────────────────────────────────────────────────────────
// SCHEMAS ZOD — validação estrita de todos os inputs
// ─────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'] as const

const HOME_EQUIPMENT_VALUES = [
  'dumbbells',
  'pull_up_bar',
  'resistance_bands',
  'kettlebell',
  'bench',
  'jump_rope',
  'barbell',
  'none',
] as const

const DIVISION_TYPES = [
  'AB',
  'ABC',
  'ABCD',
  'PPL',
  'FULL_BODY',
  'UPPER_LOWER',
] as const

const LocationSchema = z.object({
  country: z.string().max(100).nullable().optional(),
  countryCode: z.string().max(10).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  currencySymbol: z.string().max(5).nullable().optional(),
}).optional()

const UserProfileSchema = z.object({
  goal: z.string().min(1).max(100),
  fitness_level: z.string().min(1).max(50),
  weekly_days: z.number().int().min(1).max(7),
  daily_calories: z.number().positive().max(10000).optional(),
  current_weight_kg: z.number().positive().max(400).optional(),
  target_weight_kg: z.number().positive().max(400).optional(),
  height_cm: z.number().positive().max(300).optional(),
  age: z.number().int().min(10).max(100).optional(),
  gender: z.string().max(20).optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
  history: z.any().optional(),
  training_location: z.string().max(50).optional(),
  // NOVO: equipamentos em casa
  home_equipment: z.array(z.enum(HOME_EQUIPMENT_VALUES)).max(10).optional(),
  // NOVO: divisão preferida
  preferred_division: z.enum(DIVISION_TYPES).optional(),
  location: LocationSchema,
})

// Schema separado para relatórios — campos diferentes
const ReportSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
  water_intake_ml: z.number().min(0).max(10000).optional(),
  energy_level: z.number().min(0).max(10).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  workout_completed: z.boolean().optional(),
  diet_adherence: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
  goal: z.string().max(100).optional(),
  fitness_level: z.string().max(50).optional(),
})

// Schema para adaptação de protocolo
const AdaptProtocolSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
  goal: z.string().min(1).max(100),
  fitness_level: z.string().min(1).max(50),
  weekly_days: z.number().int().min(1).max(7).optional(),
  current_weight_kg: z.number().positive().max(400).optional(),
  history: z.any().optional(),
  location: LocationSchema,
})

// ─────────────────────────────────────────────────────────────
// HELPER: resposta de erro padronizada sem vazar detalhes internos
// ─────────────────────────────────────────────────────────────

function handleZodError(res: Response, error: z.ZodError, requestId: string, context: string) {
  log.warn(`${context} validation failed`, { requestId, errors: error.errors })
  // Retorna apenas path e message — não vaza estrutura interna
  const safeErrors = error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message,
  }))
  res.status(400).json({ error: 'Invalid request data', fields: safeErrors })
}

function handleInternalError(res: Response, error: any, requestId: string, context: string) {
  log.error(`${context} failed`, error, { requestId })
  // Nunca vaza detalhes do erro interno para o cliente
  res.status(500).json({ error: 'Internal server error' })
}

// ─────────────────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────────────────

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai', timestamp: new Date().toISOString() })
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
      hasHomeEquipment: !!validatedData.home_equipment?.length,
    })

    const result = await generateNutritionPlan(validatedData)

    ctxLog.info('Nutrition plan generated successfully', {
      hasWeeklyMenu: !!result?.weekly_menu,
      hasSupplements: !!result?.supplements?.length,
    })

    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      handleZodError(res, error, requestId, 'Nutrition')
      return
    }
    handleInternalError(res, error, requestId, 'Nutrition plan generation')
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
      preferred_division: validatedData.preferred_division,
      home_equipment: validatedData.home_equipment,
    })

    const result = await generateWorkoutPlan(validatedData)

    ctxLog.info('Workout plan generated successfully', {
      sessionsCount: result?.sessions?.length,
      divisionType: result?.division_type,
    })

    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      handleZodError(res, error, requestId, 'Workout')
      return
    }
    handleInternalError(res, error, requestId, 'Workout plan generation')
  }
})

app.post('/protocol/adapt', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'adaptProtocol' })

  try {
    const validatedData = AdaptProtocolSchema.parse(req.body)
    ctxLog.info('Protocol adaptation started', { goal: validatedData.goal })
    const result = await adaptProtocol(validatedData)
    ctxLog.info('Protocol adaptation completed')
    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      handleZodError(res, error, requestId, 'Protocol adapt')
      return
    }
    handleInternalError(res, error, requestId, 'Protocol adaptation')
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
    if (error instanceof z.ZodError) {
      handleZodError(res, error, requestId, 'Report')
      return
    }
    handleInternalError(res, error, requestId, 'Report analysis')
  }
})

app.post('/feedback/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string
  const ctxLog = createContextLogger({ requestId, action: 'generateFeedback' })

  try {
    const validatedData = ReportSchema.parse(req.body)
    ctxLog.info('Feedback generation started')
    const report = await analyzeReport(validatedData)
    const feedback = await generateClientFeedback({ ...validatedData, analysis: report })
    ctxLog.info('Feedback generated successfully')
    res.json(feedback)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      handleZodError(res, error, requestId, 'Feedback')
      return
    }
    handleInternalError(res, error, requestId, 'Feedback generation')
  }
})

// Bloqueia métodos não permitidos e rotas desconhecidas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string
  log.fatal('Unhandled error in express', err, { requestId, path: req.path })
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
  log.info(`AI service started`, { port: PORT, env: process.env.NODE_ENV })
})