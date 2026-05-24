import pino from 'pino'

const logLevel = process.env.LOG_LEVEL || 'info'

export const logger = pino({
  level: logLevel,
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
})

export const pinoHttpLogger = require('pino-http')({
  logger: logger,
  customLogLevel: (req: any, res: any, err: any) => {
    if (res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  customSuccessMessage: (req: any, res: any) => {
    return `${req.method} ${req.url} - ${res.statusCode}`
  },
  customErrorMessage: (req: any, res: any, err: any) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err?.message}`
  }
})

export default logger
