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
const planGenerator_1 = require("./planGenerator");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 3001;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// ─────────────────────────────────────────────────────────────
// SEGURANÇA: HEADERS
// ─────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
}));
app.use(express_1.default.json({ limit: '10kb' }));
// ─────────────────────────────────────────────────────────────
// SEGURANÇA: RATE LIMITING
// ─────────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 50,
    message: { error: 'Too many requests' },
    skip: (req) => req.path === '/health',
});
app.use(limiter);
// Rate limit mais restrito para rotas de IA (custosas)
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 200,
    message: { error: 'Too many AI requests. Wait a moment.' },
});
// ─────────────────────────────────────────────────────────────
// SEGURANÇA: API KEY
// ─────────────────────────────────────────────────────────────
const AI_API_KEY = process.env.AI_API_KEY;
const requireApiKey = (req, res, next) => {
    if (!AI_API_KEY)
        return next();
    const key = req.headers['x-api-key'];
    if (!key || key !== AI_API_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
};
// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO: SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'];
// ✅ FIX: location agora está no schema — Zod não descarta mais o campo
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
// ─────────────────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
    res.json({ status: 'ok', service: 'ai' });
});
app.post('/nutrition/generate', requireApiKey, aiLimiter, async (req, res) => {
    try {
        const validatedData = UserProfileSchema.parse(req.body);
        console.log('📍 [nutrition] location recebida:', JSON.stringify(validatedData.location, null, 2));
        const result = await (0, planGenerator_1.generateNutritionPlan)(validatedData);
        res.json(result);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            res.status(400).json({ error: 'Invalid request data', details: error.errors });
            return;
        }
        console.error('Erro Nutrition:', error?.message);
        res.status(500).json({ error: 'AI service error' });
    }
});
app.post('/workout/generate', requireApiKey, aiLimiter, async (req, res) => {
    try {
        await sleep(1000);
        const validatedData = UserProfileSchema.parse(req.body);
        console.log('📍 [workout] location recebida:', JSON.stringify(validatedData.location, null, 2));
        console.log('🏋️ [workout] training_location DIRETO:', validatedData.training_location);
        const result = await (0, planGenerator_1.generateWorkoutPlan)(validatedData);
        res.json(result);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            res.status(400).json({ error: 'Invalid request data', details: error.errors });
            return;
        }
        console.error('Erro Workout:', error?.message);
        res.status(500).json({ error: 'AI service error' });
    }
});
app.post('/protocol/adapt', requireApiKey, aiLimiter, async (req, res) => {
    try {
        const result = await (0, planGenerator_1.adaptProtocol)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Erro Adapt:', error?.message);
        res.status(500).json({ error: 'Erro ao adaptar protocolo' });
    }
});
app.post('/report/analyze', requireApiKey, aiLimiter, async (req, res) => {
    try {
        const result = await (0, planGenerator_1.analyzeReport)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('Erro Report:', error?.message);
        res.status(500).json({ error: 'Erro ao analisar relatório' });
    }
});
app.post('/feedback/generate', requireApiKey, aiLimiter, async (req, res) => {
    try {
        const report = await (0, planGenerator_1.analyzeReport)(req.body);
        const feedback = await (0, planGenerator_1.generateClientFeedback)({
            ...req.body,
            analysis: report
        });
        res.json(feedback);
    }
    catch (error) {
        console.error('Erro Feedback:', error?.message);
        res.status(500).json({ error: 'Erro ao gerar feedback' });
    }
});
app.get('/debug/routes', (_req, res) => {
    res.json({
        routes: [
            '/health',
            '/nutrition/generate',
            '/workout/generate',
            '/protocol/adapt',
            '/report/analyze',
            '/feedback/generate',
        ],
    });
});
// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`AI service rodando na porta ${PORT}`);
});
