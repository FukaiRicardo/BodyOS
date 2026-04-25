import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response } from 'express'
import cors from 'cors'
import {
  generateNutritionPlan,
  generateWorkoutPlan,
  analyzeReport,
  generateClientFeedback,
  adaptProtocol,
} from './planGenerator'

const app  = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json({ limit: '10kb' }))

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai' })
})

app.post('/nutrition/generate', async (req: Request, res: Response) => {
  try {
    const result = await generateNutritionPlan(req.body)
    res.json(result)
  } catch (error) {
    console.error('NUTRITION ERROR:', error)
    res.status(500).json({ error: 'Failed to generate nutrition plan' })
  }
})

app.post('/workout/generate', async (req: Request, res: Response) => {
  try {
    const result = await generateWorkoutPlan(req.body)
    res.json(result)
  } catch (error) {
    console.error('WORKOUT ERROR:', error)
    res.status(500).json({ error: 'Failed to generate workout plan' })
  }
})

app.post('/report/analyze', async (req: Request, res: Response) => {
  try {
    const result = await analyzeReport(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze report' })
  }
})

app.post('/feedback/generate', async (req: Request, res: Response) => {
  try {
    const result = await generateClientFeedback(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate feedback' })
  }
})

app.post('/protocol/adapt', async (req: Request, res: Response) => {
  try {
    const result = await adaptProtocol(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to adapt protocol' })
  }
})

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`AI service rodando na porta ${PORT}`)
})