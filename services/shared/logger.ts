/**
 * Shared logger for BodyOS services (AI, Gateway, etc.)
 * - Pino JSON structured logging
 * - Automatic data masking for sensitive info
 * - Context: requestId, userId, action
 */

import pino from 'pino'

// ─────────────────────────────────────────────────────────────
// DATA MASKING
// ─────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'password', 'senha', 'secret', 'token', 'access_token',
  'refresh_token', 'authorization', 'x-api-key', 'apikey',
  'api_key', 'groq_api_key', 'supabase_key', 'jwt', 'bearer',
  'credit_card', 'cpf', 'ssn', 'private_key', 'client_secret',
])

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g, // JWT
  /sk-[a-zA-Z0-9]{20,}/g,   // OpenAI keys
  /gsk_[a-zA-Z0-9]{20,}/g,  // Groq keys
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, // CPF
  /\b\d{16}\b/g,             // Credit card numbers
]

export function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return maskString(obj)
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => sanitize(item, depth + 1))

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else {
      result[key] = sanitize(value, depth + 1)
    }
  }
  return result
}

function maskString(str: string): string {
  let masked = str
  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, '[REDACTED]')
  }
  return masked
}

// ─────────────────────────────────────────────────────────────
// PINO CONFIG
// ─────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production'
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')

const pinoConfig: pino.LoggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.id,
      userAgent: req.headers?.['user-agent'],
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.body.password',
      'req.body.token',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
}

const transport = isDev
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{service} | {msg}',
      },
    })
  : undefined

export function createLogger(serviceName: string) {
  const config = {
    ...pinoConfig,
    base: {
      service: serviceName,
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    },
  }

  return transport
    ? pino(config, transport)
    : pino(config)
}

// ─────────────────────────────────────────────────────────────
// CONTEXT & HELPERS
// ─────────────────────────────────────────────────────────────

export interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  [key: string]: unknown
}

export function createContextLogger(logger: pino.Logger, ctx: LogContext) {
  const safeCtx = sanitize(ctx) as LogContext
  return logger.child(safeCtx)
}

export function createLogHelpers(logger: pino.Logger) {
  return {
    info: (msg: string, data?: unknown) =>
      logger.info(sanitize(data) as object, msg),

    warn: (msg: string, data?: unknown) =>
      logger.warn(sanitize(data) as object, msg),

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

    debug: (msg: string, data?: unknown) =>
      logger.debug(sanitize(data) as object, msg),
  }
}
