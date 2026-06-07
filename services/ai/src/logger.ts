type LogLevel = 'info' | 'warn' | 'error' | 'fatal'

interface LogContext {
  [key: string]: any
}

function formatMessage(level: LogLevel, message: string, error?: any, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  const err = error instanceof Error ? ` | Error: ${error.message}` : error ? ` | ${JSON.stringify(error)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${err}${ctx}`
}

export const log = {
  info(message: string, context?: LogContext) {
    console.log(formatMessage('info', message, undefined, context))
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatMessage('warn', message, undefined, context))
  },
  error(message: string, error?: any, context?: LogContext) {
    console.error(formatMessage('error', message, error, context))
  },
  fatal(message: string, error?: any, context?: LogContext) {
    console.error(formatMessage('fatal', message, error, context))
  },
}

export function createContextLogger(baseContext: LogContext) {
  return {
    info(message: string, context?: LogContext) {
      log.info(message, { ...baseContext, ...context })
    },
    warn(message: string, context?: LogContext) {
      log.warn(message, { ...baseContext, ...context })
    },
    error(message: string, error?: any, context?: LogContext) {
      log.error(message, error, { ...baseContext, ...context })
    },
  }
}

export function sanitize(data: any): any {
  if (!data || typeof data !== 'object') return data
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization']
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      sensitive.some(s => k.toLowerCase().includes(s)) ? [k, '[REDACTED]'] : [k, v]
    )
  )
}
