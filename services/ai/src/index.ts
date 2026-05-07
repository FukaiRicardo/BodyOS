import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import {
  generateNutritionPlan,
  generateWorkoutPlan,
  analyzeReport,
  generateClientFeedback,
  adaptProtocol,
} from './planGenerator'

const app = express()
const PORT = process.env.PORT ?? 3001

// ─── Segurança - Headers ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}))

// ─── CORS - só origens autorizadas ────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  ...(process.env.LOCAL_IP ? [`http://${process.env.LOCAL_IP}:8081`] : []),
  ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o.trim()))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}))

// ─── Body Parser - limite seguro ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
})

app.use(limiter)

// ─── API Key - autenticação interna ───────────────────────────────────────────
const AI_API_KEY = process.env.AI_API_KEY

const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  if (!AI_API_KEY) {
    next()
    return
  }
  const key = req.headers['x-api-key']
  if (!key || key !== AI_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// ─── Schemas Zod ──────────────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'] as const

const UserProfileSchema = z.object({
  goal: z.string().min(1).max(50),
  fitness_level: z.string().min(1).max(50),
  weekly_days: z.number().int().min(1).max(7),
  daily_calories: z.number().int().min(500).max(8000).optional(),
  restrictions: z.array(z.string().max(100)).max(20).optional(),
  health_conditions: z.array(z.string().max(100)).max(20).optional(),
  current_weight_kg: z.number().min(20).max(500).optional(),
  target_weight_kg: z.number().min(20).max(500).optional(),
  height_cm: z.number().min(50).max(300).optional(),
  age: z.number().int().min(10).max(120).optional(),
  gender: z.string().max(20).optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
})

const DailyReportSchema = z.object({
  user_profile: UserProfileSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().min(20).max(500).optional(),
  meals_logged: z.array(z.object({
    name: z.string().max(100),
    calories: z.number().min(0).max(5000),
    protein: z.number().min(0).max(500),
  })).max(20),
  workout_completed: z.boolean(),
  workout_notes: z.string().max(500).optional(),
  energy_level: z.number().int().min(1).max(5),
  sleep_hours: z.number().min(0).max(24).optional(),
  mood: z.string().max(50).optional(),
  water_ml: z.number().min(0).max(10000).optional(),
  adherence_percent: z.number().int().min(0).max(100),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
})

const AdaptationSchema = z.object({
  user_profile: UserProfileSchema,
  current_plan: z.object({}).passthrough(),
  reports: z.array(DailyReportSchema).min(1).max(30),
  weeks_on_plan: z.number().int().min(1).max(52),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
})

const validate = (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: result.error.flatten().fieldErrors,
      })
      return
    }
    req.body = result.data
    next()
  }

// ─── Request ID - rastreabilidade ─────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) ?? crypto.randomUUID()
  req.headers['x-request-id'] = id
  res.setHeader('X-Request-ID', id)
  next()
})

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai', timestamp: new Date().toISOString() })
})

app.post('/nutrition/generate',
  requireApiKey,
  validate(UserProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await generateNutritionPlan(req.body)
      res.json(result)
    } catch (error) {
      console.error('NUTRITION ERROR:', error)
      res.status(500).json({ error: 'Failed to generate nutrition plan' })
    }
  }
)

app.post('/workout/generate',
  requireApiKey,
  validate(UserProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await generateWorkoutPlan(req.body)
      res.json(result)
    } catch (error) {
      console.error('WORKOUT ERROR:', error)
      res.status(500).json({ error: 'Failed to generate workout plan' })
    }
  }
)

app.post('/report/analyze',
  requireApiKey,
  validate(DailyReportSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await analyzeReport(req.body)
      res.json(result)
    } catch (error) {
      console.error('REPORT ERROR:', error)
      res.status(500).json({ error: 'Failed to analyze report' })
    }
  }
)

app.post('/feedback/generate',
  requireApiKey,
  validate(DailyReportSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await generateClientFeedback(req.body)
      res.json(result)
    } catch (error) {
      console.error('FEEDBACK ERROR:', error)
      res.status(500).json({ error: 'Failed to generate feedback' })
    }
  }
)

app.post('/protocol/adapt',
  requireApiKey,
  validate(AdaptationSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await adaptProtocol(req.body)
      res.json(result)
    } catch (error) {
      console.error('ADAPT ERROR:', error)
      res.status(500).json({ error: 'Failed to adapt protocol' })
    }
  }
)

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`AI service rodando na porta ${PORT}`)
  console.log(`Rate limit: 20 req/min por IP`)
  console.log(`API Key: ${AI_API_KEY ? 'ativa' : 'desabilitada (dev mode)'}`)
})