import dotenv from 'dotenv'
import path from 'path'
import express from 'express'
import { corsMiddleware, securityHeaders, apiLimiter, authLimiter, requestId } from './middleware/security'
import { authMiddleware } from './middleware/auth'

// Tenta carregar do diretório local e da raiz do monorepo
dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const app  = express()
const PORT = process.env.PORT ?? 3000

app.use(requestId)
app.use(corsMiddleware)
app.use(securityHeaders)
app.use(express.json({ limit: '10mb' }))

// Rotas públicas
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Rotas de auth (rate limit restrito)
app.use('/auth', authLimiter)

// Rotas protegidas (rate limit geral + auth)
const apiRouter = express.Router()
apiRouter.use(authMiddleware)

apiRouter.all('*', async (req, res) => {
  const targetUrl = `${process.env.AI_SERVICE_URL}${req.url}`
  console.log(`[Gateway Proxy] Encaminhando ${req.method} ${req.originalUrl} -> ${targetUrl}`)

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_API_KEY ?? '',
      },
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    
    if (!response.ok) {
      console.error(`[Gateway Proxy Error] Status ${response.status} de ${targetUrl}`)
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        return res.status(response.status).json(errorJson)
      } catch {
        return res.status(response.status).send(errorText)
      }
    }

    const data = await response.json()
    return res.json(data)
  } catch (error: any) {
    console.error(`[Gateway Proxy Exception] Erro ao acessar ${targetUrl}:`, error)
    return res.status(502).json({ error: 'Erro de comunicação com o serviço interno' })
  }
})

app.use('/api', apiLimiter, apiRouter)

app.listen(PORT, () => {
  console.log(`Gateway rodando na porta ${PORT}`)
})

export default app