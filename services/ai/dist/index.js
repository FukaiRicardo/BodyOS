"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const logger_1 = require("./logger");
const planGenerator_1 = require("./planGenerator");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 3001;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: REQUEST ID
// Injeta requestId em cada request para rastreabilidade
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] ?? (0, crypto_1.randomUUID)();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});
// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: REQUEST LOGGING
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'];
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
                : 'info';
        logger_1.log[level](`${req.method} ${req.path}`, {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: duration,
            // NUNCA loga body ou headers completos
            ip: req.ip,
        });
    });
    next();
});
// ─────────────────────────────────────────────────────────────
// SEGURANÇA
// ─────────────────────────────────────────────────────────────
const DEFAULT_ALLOWED_ORIGINS = [
    'https://bodyos.app',
    'https://www.bodyos.app',
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
app.use((0, helmet_1.default)({
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
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-ID'],
    credentials: false,
    maxAge: 86400,
}));
app.use(express_1.default.json({ limit: '10kb' }));
// ─────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: 'Too many requests' },
    skip: (req) => req.path === '/health',
});
app.use(limiter);
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 200,
    message: { error: 'Too many AI requests. Wait a moment.' },
});
// ─────────────────────────────────────────────────────────────
// API KEY AUTH
// ─────────────────────────────────────────────────────────────
const AI_API_KEY = process.env.AI_API_KEY;
const requireApiKey = (req, res, next) => {
    const requestId = req.headers['x-request-id'];
    const key = req.headers['x-api-key'];
    if (!AI_API_KEY) {
        if (process.env.NODE_ENV === 'production') {
            logger_1.log.error('AI_API_KEY is missing in production', { requestId, path: req.path, ip: req.ip });
            return res.status(500).json({ error: 'Service misconfigured' });
        }
        logger_1.log.warn('AI_API_KEY not configured; skipping API key validation in non-production', {
            requestId,
            path: req.path,
            ip: req.ip,
        });
        return next();
    }
    if (!key || key !== AI_API_KEY) {
        logger_1.log.warn('Unauthorized API access attempt', { requestId, path: req.path, ip: req.ip });
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
};
// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO ZOD
// ─────────────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'];
const LocationSchema = zod_1.z.object({
    country: zod_1.z.string().optional(),
    countryCode: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    region: zod_1.z.string().nullable().optional(),
    currency: zod_1.z.string().optional(),
    currencySymbol: zod_1.z.string().optional(),
}).optional();
const UserProfileSchema = zod_1.z.object({
    goal: zod_1.z.string(),
    fitness_level: zod_1.z.string(),
    weekly_days: zod_1.z.number(),
    daily_calories: zod_1.z.number().optional(),
    current_weight_kg: zod_1.z.number().optional(),
    height_cm: zod_1.z.number().optional(),
    age: zod_1.z.number().optional(),
    gender: zod_1.z.string().optional(),
    language: zod_1.z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
    history: zod_1.z.any().optional(),
    training_location: zod_1.z.string().optional(),
    location: LocationSchema,
});
const AnyObjectSchema = zod_1.z.object({}).passthrough();
const ReportSchema = zod_1.z.object({
    weight_kg: zod_1.z.number().min(0).optional(),
    water_intake_ml: zod_1.z.number().min(0).optional(),
    energy_level: zod_1.z.number().min(0).max(10).optional(),
    sleep_hours: zod_1.z.number().min(0).max(24).optional(),
    mood: zod_1.z.number().min(0).max(10).optional(),
    notes: zod_1.z.string().max(500).optional(),
}).passthrough();
const FeedbackSchema = zod_1.z.object({
    analysis: zod_1.z.any().optional(),
    report: ReportSchema.optional(),
}).passthrough();
// ─────────────────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
    res.json({ status: 'ok', service: 'ai' });
});
app.post('/nutrition/generate', requireApiKey, aiLimiter, async (req, res) => {
    const requestId = req.headers['x-request-id'];
    const ctxLog = (0, logger_1.createContextLogger)({ requestId, action: 'generateNutrition' });
    try {
        const validatedData = UserProfileSchema.parse(req.body);
        ctxLog.info('Nutrition plan generation started', {
            goal: validatedData.goal,
            fitness_level: validatedData.fitness_level,
            language: validatedData.language,
            hasLocation: !!validatedData.location,
        });
        const result = await (0, planGenerator_1.generateNutritionPlan)(validatedData);
        ctxLog.info('Nutrition plan generated successfully', {
            mealsCount: result?.meals?.length,
            hasSupplements: !!result?.supplements?.length,
        });
        res.json(result);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            logger_1.log.warn('Nutrition validation failed', { requestId, errors: error.errors });
            res.status(400).json({ error: 'Invalid request data', details: error.errors });
            return;
        }
        logger_1.log.error('Nutrition plan generation failed', error, { requestId });
        res.status(500).json({ error: 'AI service error' });
    }
});
app.post('/workout/generate', requireApiKey, aiLimiter, async (req, res) => {
    const requestId = req.headers['x-request-id'];
    const ctxLog = (0, logger_1.createContextLogger)({ requestId, action: 'generateWorkout' });
    try {
        await sleep(1000);
        const validatedData = UserProfileSchema.parse(req.body);
        ctxLog.info('Workout plan generation started', {
            goal: validatedData.goal,
            fitness_level: validatedData.fitness_level,
            training_location: validatedData.training_location,
            weekly_days: validatedData.weekly_days,
        });
        const result = await (0, planGenerator_1.generateWorkoutPlan)(validatedData);
        ctxLog.info('Workout plan generated successfully', {
            sessionsCount: result?.sessions?.length,
        });
        res.json(result);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            logger_1.log.warn('Workout validation failed', { requestId, errors: error.errors });
            res.status(400).json({ error: 'Invalid request data', details: error.errors });
            return;
        }
        logger_1.log.error('Workout plan generation failed', error, { requestId });
        res.status(500).json({ error: 'AI service error' });
    }
});
app.post('/protocol/adapt', requireApiKey, aiLimiter, async (req, res) => {
    const requestId = req.headers['x-request-id'];
    const ctxLog = (0, logger_1.createContextLogger)({ requestId, action: 'adaptProtocol' });
    try {
        const validatedData = AnyObjectSchema.parse(req.body);
        ctxLog.info('Protocol adaptation started');
        const result = await (0, planGenerator_1.adaptProtocol)(validatedData);
        ctxLog.info('Protocol adaptation completed');
        res.json(result);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            logger_1.log.warn('Protocol adaptation validation failed', { requestId, errors: error.errors });
            return res.status(400).json({ error: 'Invalid request data', details: error.errors });
        }
        logger_1.log.error('Protocol adaptation failed', error, { requestId });
        res.status(500).json({ error: 'Erro ao adaptar protocolo' });
    }
});
app.post('/report/analyze', requireApiKey, aiLimiter, async (req, res) => {
    const requestId = req.headers['x-request-id'];
    const ctxLog = (0, logger_1.createContextLogger)({ requestId, action: 'analyzeReport' });
    try {
        const validatedData = ReportSchema.parse(req.body);
        ctxLog.info('Report analysis started', {
            hasWaterIntake: !!validatedData.water_intake_ml,
            hasEnergyLevel: !!validatedData.energy_level,
        });
        const result = await (0, planGenerator_1.analyzeReport)(validatedData);
        ctxLog.info('Report analysis completed', { score: result?.score });
        res.json(result);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            logger_1.log.warn('Report analysis validation failed', { requestId, errors: error.errors });
            return res.status(400).json({ error: 'Invalid request data', details: error.errors });
        }
        logger_1.log.error('Report analysis failed', error, { requestId });
        res.status(500).json({ error: 'Erro ao analisar relatório' });
    }
});
app.post('/feedback/generate', requireApiKey, aiLimiter, async (req, res) => {
    const requestId = req.headers['x-request-id'];
    const ctxLog = (0, logger_1.createContextLogger)({ requestId, action: 'generateFeedback' });
    try {
        const validatedData = FeedbackSchema.parse(req.body);
        ctxLog.info('Feedback generation started');
        const report = await (0, planGenerator_1.analyzeReport)(validatedData);
        const feedback = await (0, planGenerator_1.generateClientFeedback)({ ...validatedData, analysis: report });
        ctxLog.info('Feedback generated successfully');
        res.json(feedback);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            logger_1.log.warn('Feedback generation validation failed', { requestId, errors: error.errors });
            return res.status(400).json({ error: 'Invalid request data', details: error.errors });
        }
        logger_1.log.error('Feedback generation failed', error, { requestId });
        res.status(500).json({ error: 'Erro ao gerar feedback' });
    }
});
// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// Captura erros não tratados — falhas silenciosas eliminadas
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    const requestId = req.headers['x-request-id'];
    logger_1.log.fatal('Unhandled error in express', err, { requestId, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
});
// ─────────────────────────────────────────────────────────────
// PROCESS ERROR HANDLERS
// Garante que crashes sejam sempre logados
// ─────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    logger_1.log.fatal('Uncaught exception — process will exit', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.log.fatal('Unhandled promise rejection', reason);
    process.exit(1);
});
// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
app.listen(Number(PORT), '0.0.0.0', () => {
    logger_1.log.info(`AI service started`, { port: PORT, env: process.env.NODE_ENV });
});
