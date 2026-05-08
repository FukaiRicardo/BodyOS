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

// Segurança básica
app.use(helmet({ contentSecurityPolicy: false }))

// CORS LIBERADO PARA TESTE (Aceita qualquer origem para o celular conectar)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}))

app.use(express.json({ limit: '10kb' }))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // Aumentado para evitar bloqueios em testes
  message: { error: 'Too many requests' },
  skip: (req) => req.path === '/health',
})
app.use(limiter)

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

const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'] as const
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
})

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai' })
})

app.post('/nutrition/generate', requireApiKey, async (req: Request, res: Response) => {
  try {
    const result = await generateNutritionPlan(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate nutrition' })
  }
})

app.post('/workout/generate', requireApiKey, async (req: Request, res: Response) => {
  try {
    const result = await generateWorkoutPlan(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate workout' })
  }
})

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`AI service rodando na porta ${PORT}`)
})