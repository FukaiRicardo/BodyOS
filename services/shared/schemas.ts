import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'ja'] as const

// ─────────────────────────────────────────────────────────────
// SHARED SCHEMAS
// ─────────────────────────────────────────────────────────────

export const LocationSchema = z.object({
  country: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().nullable().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
}).optional()

export const UserProfileSchema = z.object({
  goal: z.string(),
  fitness_level: z.string(),
  weekly_days: z.number(),
  daily_calories: z.number().optional(),
  current_weight_kg: z.number().optional(),
  height_cm: z.number().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
  history: z.any().optional(),
  training_location: z.string().optional(),
  location: LocationSchema,
})

export const ReportSchema = z.object({
  weight_kg: z.number().min(0).optional(),
  water_intake_ml: z.number().min(0).optional(),
  energy_level: z.number().min(0).max(10).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  mood: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
}).passthrough()

export const FeedbackSchema = z.object({
  analysis: z.any().optional(),
  report: ReportSchema.optional(),
}).passthrough()

export const AdaptationSchema = z.object({
  user_profile: z.object({
    goal: z.string(),
    fitness_level: z.string(),
    weekly_days: z.number(),
    current_weight_kg: z.number().optional(),
    height_cm: z.number().optional(),
    age: z.number().optional(),
    gender: z.string().optional(),
  }),
  current_plan: z.object({
    nutrition: z.any(),
    workout: z.any(),
  }),
  reports: z.array(z.any()),
  weeks_on_plan: z.number(),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default('pt'),
}).passthrough()
