import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

export const validate = (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    req.body = result.data
    next()
  }

// Schemas reutilizáveis
export const schemas = {
  generatePlan: z.object({
    goal:         z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance']),
    fitness_level: z.enum(['beginner', 'intermediate', 'advanced']),
    weekly_days:  z.number().int().min(1).max(7),
    restrictions: z.array(z.string().max(50)).max(10).optional(),
    daily_calories: z.number().int().min(1000).max(6000).optional(),
  }),

  progressLog: z.object({
    weight_kg:          z.number().min(10).max(500).optional(),
    body_fat_pct:       z.number().min(1).max(70).optional(),
    energy_level:       z.number().int().min(1).max(5).optional(),
    mood:               z.number().int().min(1).max(5).optional(),
    sleep_hours:        z.number().min(0).max(24).optional(),
    workout_completed:  z.boolean().optional(),
    meals_adhered:      z.number().int().min(0).max(10).optional(),
    notes:              z.string().max(500).optional(),
  }),

  updateProfile: z.object({
    username:      z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
    full_name:     z.string().min(1).max(100).optional(),
    goal:          z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance']).optional(),
    fitness_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    height_cm:     z.number().min(50).max(300).optional(),
    weight_kg:     z.number().min(10).max(500).optional(),
    birth_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    locale:        z.string().max(10).optional(),
    timezone:      z.string().max(50).optional(),
  }),
}