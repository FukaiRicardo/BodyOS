import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { createLogger, createContextLogger, createLogHelpers, sanitize } from '../shared/logger'
import { helmetConfig, getCorsMiddleware, generalLimiter, aiLimiter, createApiKeyMiddleware } from '../shared/security-config'
import { SUPPORTED_LANGUAGES, UserProfileSchema, ReportSchema, FeedbackSchema, AdaptationSchema } from '../shared/schemas'
import {
  generateNutritionPlan,
  generateWorkoutPlan,
  adaptProtocol,
  analyzeReport,
  generateClientFeedback
} from './planGenerator'

const logger = createLogger('bodyos-ai')
const log = createLogHelpers(logger)

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

app.use(helmetConfig)
app.use(getCorsMiddleware())
app.use(express.json({ limit: '10kb' }))
app.use(generalLimiter)
app.use(aiLimiter)

// ─────────────────────────────────────────────────────────────
// API KEY AUTH
// ─────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
  log.error('GROQ_API_KEY is missing — cannot start service')
  process.exit(1)
}

const requireApiKey = createApiKeyMiddleware('AI_API_KEY')

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
    const validatedData = AdaptationSchema.parse(req.body)
    ctxLog.info('Protocol adaptation started', { weeks: validatedData.weeks_on_plan })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 30000)
    )

    const result = await Promise.race([
      adaptProtocol(validatedData),
      timeoutPromise
    ])

    ctxLog.info('Protocol adaptation completed')
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Protocol adaptation validation failed', { requestId, errors: error.errors })
      return res.status(400).json({ error: 'Invalid request data', details: error.errors })
    }
    if (error?.message === 'Timeout') {
      log.warn('Protocol adaptation timeout', { requestId })
      return res.status(408).json({ error: 'Request timeout' })
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

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 30000)
    )

    const result = await Promise.race([
      analyzeReport(validatedData),
      timeoutPromise
    ])

    ctxLog.info('Report analysis completed', { score: result?.score })
    res.json(result)
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      log.warn('Report analysis validation failed', { requestId, errors: error.errors })
      return res.status(400).json({ error: 'Invalid request data', details: error.errors })
    }
    if (error?.message === 'Timeout') {
      log.warn('Report analysis timeout', { requestId })
      return res.status(408).json({ error: 'Request timeout' })
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
