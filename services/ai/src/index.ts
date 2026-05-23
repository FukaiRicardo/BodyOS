import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { logger, pinoHttpLogger } from './logger'
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
// SEGURANÇA: HEADERS
// ─────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }))
app.use(pinoHttpLogger)
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://bodyos-gateway.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  credentials: false
}))

app.use(express.json({ limit: '10kb' }))

// ─────────────────────────────────────────────────────────────
// SEGURANÇA: RATE LIMITING
// ─────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Too many requests' },
  skip: (req) => req.path === '/health',
})
app.use(limiter)

// Rate limit mais restrito para rotas de IA (custosas)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many AI requests. Wait a moment.' },
})

// ─────────────────────────────────────────────────────────────
// SEGURANÇA: API KEY
// ─────────────────────────────────────────────────────────────

const AI_API_KEY = process.env.AI_API_KEY

const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  if (!AI_API_KEY) return next()
  const key = req.headers['x-api-key']
  if (!key || key !== AI_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO: SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'] as const

// ✅ FIX: location agora está no schema — Zod não descarta mais o campo
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

// ─────────────────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────────────────

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai' })
})

app.post('/nutrition/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = UserProfileSchema.parse(req.body)
    const result = await generateNutritionPlan(validatedData)
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      logger.warn({ error: error.errors }, 'Nutrition validation failed')
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    logger.error({ error: error?.message }, 'Nutrition generation failed')
    res.status(500).json({ error: 'AI service error' })
  }
})

app.post('/workout/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  try {
    await sleep(1000)
    const validatedData = UserProfileSchema.parse(req.body)
    const result = await generateWorkoutPlan(validatedData)
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    console.error('Erro Workout:', error?.message)
    res.status(500).json({ error: 'AI service error' })
  }
})

app.post('/protocol/adapt', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = UserProfileSchema.parse(req.body)
    const result = await adaptProtocol(validatedData)
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    console.error('Erro Adapt:', error?.message)
    res.status(500).json({ error: 'Protocol adaptation failed' })
  }
})

app.post('/report/analyze', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = UserProfileSchema.parse(req.body)
    const result = await analyzeReport(validatedData)
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    console.error('Erro Report:', error?.message)
    res.status(500).json({ error: 'Report analysis failed' })
  }
})

app.post('/feedback/generate', requireApiKey, aiLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = UserProfileSchema.parse(req.body)
    const report = await analyzeReport(validatedData)
    const feedback = await generateClientFeedback({
      ...validatedData,
      analysis: report
    })
    res.json(feedback)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors })
      return
    }
    console.error('Erro Feedback:', error?.message)
    res.status(500).json({ error: 'Feedback generation failed' })
  }
})

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`AI service rodando na porta ${PORT}`)
})