import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

const ALLOWED_ORIGINS = [
  'https://bodyos.app',
  'https://www.bodyos.app',
  'https://bodyos-web.vercel.app',
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:8082']
    : []),
]

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,
})

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://storage.bodyos.app'],
      connectSrc: ["'self'", 'https://api.openai.com'],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
})

export const permissionsPolicyHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  next()
}

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
  keyGenerator: (req) => req.ip + ':' + req.path,
})

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req: Request & { user?: { id: string } }) =>
    req.user?.id ?? req.ip ?? 'unknown',
})

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id = (req.headers['x-request-id'] as string) ?? crypto.randomUUID()
  req.headers['x-request-id'] = id
  res.setHeader('X-Request-ID', id)
  next()
}