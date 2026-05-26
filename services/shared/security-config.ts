import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

// ─────────────────────────────────────────────────────────────
// ALLOWED ORIGINS
// ─────────────────────────────────────────────────────────────

const DEFAULT_ALLOWED_ORIGINS = [
  'https://bodyos.app',
  'https://www.bodyos.app',
]

export function getAllowedOrigins(): string[] {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS
}

// ─────────────────────────────────────────────────────────────
// HELMET CONFIG
// ─────────────────────────────────────────────────────────────

export const helmetConfig = helmet({
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
})

// ─────────────────────────────────────────────────────────────
// CORS CONFIG
// ─────────────────────────────────────────────────────────────

export function getCorsMiddleware() {
  const allowedOrigins = getAllowedOrigins()

  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-ID'],
    credentials: false,
    maxAge: 86400,
  })
}

// ─────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Too many requests' },
  skip: (req) => req.path === '/health',
})

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many AI requests. Wait a moment.' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many auth attempts' },
})

// ─────────────────────────────────────────────────────────────
// API KEY VALIDATION
// ─────────────────────────────────────────────────────────────

export function createApiKeyMiddleware(apiKeyEnvVar: string) {
  const apiKey = process.env[apiKeyEnvVar]

  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const requestId = req.headers['x-request-id'] as string
    const key = req.headers['x-api-key']

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'Service misconfigured' })
      }
      return next()
    }

    if (!key || key !== apiKey) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    next()
  }
}
