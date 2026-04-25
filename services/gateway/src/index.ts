import express from 'express'
import { corsMiddleware, securityHeaders, apiLimiter, authLimiter, requestId } from './middleware/security'

const app  = express()
const PORT = process.env.PORT ?? 3000

app.use(requestId)
app.use(corsMiddleware)
app.use(securityHeaders)
app.use(express.json({ limit: '10kb' }))

// Rotas públicas
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Rotas de auth (rate limit restrito)
app.use('/auth', authLimiter)

// Rotas protegidas (rate limit geral)
app.use('/api', apiLimiter)

app.listen(PORT, () => {
  console.log(`Gateway rodando na porta ${PORT}`)
})

export default app