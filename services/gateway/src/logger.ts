/**
 * Logger profissional para BodyOS Gateway
 * Reutiliza mesma estratégia do AI service:
 * - Pino JSON estruturado
 * - Data masking automático
 * - Contexto: requestId, userId, action
 */

import pino from 'pino'

// ─────────────────────────────────────────────────────────────
// DATA MASKING
// ─────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'password', 'senha', 'secret', 'token', 'access_token',
  'refresh_token', 'authorization', 'x-api-key', 'apikey',
  'api_key', 'jwt', 'bearer', 'credit_card', 'cpf', 'ssn',
  'private_key', 'client_secret', 'supabase_key',
])

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
]

export function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    let masked = obj
    for (const pattern of SENSITIVE_PATTERNS) {
      masked = masked.replace(pattern, '[REDACTED]')
    }
    return masked
  }
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => sanitize(item, depth + 1))

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : sanitize(value, depth + 1)
  }
  return result
}

// ─────────────────────────────────────────────────────────────
// PINO CONFIG
// ─────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production'
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')

const transport = isDev
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    })
  : undefined

export const logger = transport
  ? pino({ level: logLevel, base: { service: 'bodyos-gateway' }, timestamp: pino.stdTimeFunctions.isoTime }, transport)
  : pino({ level: logLevel, base: { service: 'bodyos-gateway' }, timestamp: pino.stdTimeFunctions.isoTime })

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  [key: string]: unknown
}

export function createContextLogger(ctx: LogContext) {
  return logger.child(sanitize(ctx) as LogContext)
}

export const log = {
  info: (msg: string, data?: unknown) => logger.info(sanitize(data) as object, msg),
  warn: (msg: string, data?: unknown) => logger.warn(sanitize(data) as object, msg),
  error: (msg: string, err?: unknown, data?: unknown) => {
    const errInfo = err instanceof Error
      ? { errorMessage: err.message, errorName: err.name, stack: err.stack }
      : { error: sanitize(err) }
    logger.error({ ...errInfo, ...(sanitize(data) as object) }, msg)
  },
  fatal: (msg: string, err?: unknown, data?: unknown) => {
    const errInfo = err instanceof Error
      ? { errorMessage: err.message, errorName: err.name, stack: err.stack }
      : { error: sanitize(err) }
    logger.fatal({ ...errInfo, ...(sanitize(data) as object) }, msg)
  },
  debug: (msg: string, data?: unknown) => logger.debug(sanitize(data) as object, msg),
}

export default logger
