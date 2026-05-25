"use strict";
/**
 * Logger profissional para BodyOS AI Service
 * - Logs estruturados JSON (Pino)
 * - Data masking: tokens, senhas, dados pessoais nunca gravados
 * - Níveis: trace, debug, info, warn, error, fatal
 * - Contexto: requestId, userId, action
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logger = void 0;
exports.sanitize = sanitize;
exports.createContextLogger = createContextLogger;
const pino_1 = __importDefault(require("pino"));
// ─────────────────────────────────────────────────────────────
// CAMPOS SENSÍVEIS — NUNCA GRAVADOS
// ─────────────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
    'password', 'senha', 'secret', 'token', 'access_token',
    'refresh_token', 'authorization', 'x-api-key', 'apikey',
    'api_key', 'groq_api_key', 'supabase_key', 'jwt', 'bearer',
    'credit_card', 'cpf', 'ssn', 'private_key', 'client_secret',
]);
const SENSITIVE_PATTERNS = [
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g, // JWT
    /sk-[a-zA-Z0-9]{20,}/g, // OpenAI keys
    /gsk_[a-zA-Z0-9]{20,}/g, // Groq keys
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, // CPF
    /\b\d{16}\b/g, // Credit card numbers
];
/**
 * Sanitiza recursivamente um objeto removendo campos sensíveis
 */
function sanitize(obj, depth = 0) {
    if (depth > 10)
        return '[MAX_DEPTH]';
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'string')
        return maskString(obj);
    if (typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(item => sanitize(item, depth + 1));
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            result[key] = '[REDACTED]';
        }
        else {
            result[key] = sanitize(value, depth + 1);
        }
    }
    return result;
}
function maskString(str) {
    let masked = str;
    for (const pattern of SENSITIVE_PATTERNS) {
        masked = masked.replace(pattern, '[REDACTED]');
    }
    return masked;
}
// ─────────────────────────────────────────────────────────────
// PINO CONFIG
// ─────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const pinoConfig = {
    level: logLevel,
    base: {
        service: 'bodyos-ai',
        env: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    serializers: {
        err: pino_1.default.stdSerializers.err,
        req: (req) => ({
            method: req.method,
            url: req.url,
            requestId: req.id,
            // NUNCA loga headers completos — apenas safe headers
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
};
const transport = isDev
    ? pino_1.default.transport({
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{service} | {msg}',
        },
    })
    : undefined;
exports.logger = transport
    ? (0, pino_1.default)(pinoConfig, transport)
    : (0, pino_1.default)(pinoConfig);
/**
 * Cria um logger filho com contexto fixo
 * Ex: const log = createContextLogger({ requestId, userId, action: 'generateWorkout' })
 */
function createContextLogger(ctx) {
    const safeCtx = sanitize(ctx);
    return exports.logger.child(safeCtx);
}
// ─────────────────────────────────────────────────────────────
// HELPERS DE LOG COM SANITIZAÇÃO AUTOMÁTICA
// ─────────────────────────────────────────────────────────────
exports.log = {
    info: (msg, data) => exports.logger.info(sanitize(data), msg),
    warn: (msg, data) => exports.logger.warn(sanitize(data), msg),
    error: (msg, err, data) => {
        const errInfo = err instanceof Error
            ? { errorMessage: err.message, errorName: err.name, stack: err.stack }
            : { error: sanitize(err) };
        exports.logger.error({ ...errInfo, ...sanitize(data) }, msg);
    },
    fatal: (msg, err, data) => {
        const errInfo = err instanceof Error
            ? { errorMessage: err.message, errorName: err.name, stack: err.stack }
            : { error: sanitize(err) };
        exports.logger.fatal({ ...errInfo, ...sanitize(data) }, msg);
    },
    debug: (msg, data) => exports.logger.debug(sanitize(data), msg),
};
exports.default = exports.logger;
