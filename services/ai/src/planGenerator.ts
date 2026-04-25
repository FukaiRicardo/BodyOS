import Groq from 'groq-sdk'
import crypto from 'crypto'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })
const MODEL = 'llama-3.3-70b-versatile'

// ═══ Interfaces ═══════════════════════════════════════════════════════════════

export interface UserProfile {
  goal: string
  fitness_level: string
  weekly_days: number
  daily_calories?: number
  restrictions?: string[]
  health_conditions?: string[]
  current_weight_kg?: number
  target_weight_kg?: number
  height_cm?: number
  age?: number
  gender?: string
}

export interface DailyReport {
  user_profile: UserProfile
  date: string
  weight_kg?: number
  meals_logged: { name: string; calories: number; protein: number }[]
  workout_completed: boolean
  workout_notes?: string
  energy_level: 1 | 2 | 3 | 4 | 5
  sleep_hours?: number
  mood?: string
  water_ml?: number
  adherence_percent: number
}

export interface AdaptationInput {
  user_profile: UserProfile
  current_plan: object
  reports: DailyReport[]
  weeks_on_plan: number
}

// ═══ Mock ═════════════════════════════════════════════════════════════════════

function getMockResponse(prompt: string): object {
  if (prompt.includes('nutricional')) {
    return {
      name: 'Hypertrophy Plan — Mock',
      daily_calories: 2800,
      protein_g: 200,
      carbs_g: 300,
      fat_g: 80,
      water_ml: 3000,
      meals: [
        {
          meal_type: 'breakfast',
          name: 'Protein breakfast',
          time_suggestion: '07:00',
          total_calories: 550,
          foods: [
            { name: 'Whole eggs', quantity_g: 180, calories: 250, protein: 18, carbs: 2, fat: 18 },
            { name: 'Oats', quantity_g: 80, calories: 300, protein: 10, carbs: 54, fat: 6 },
          ],
        },
        {
          meal_type: 'lunch',
          name: 'Complete lunch',
          time_suggestion: '12:00',
          total_calories: 750,
          foods: [
            { name: 'Grilled chicken', quantity_g: 200, calories: 330, protein: 62, carbs: 0, fat: 7 },
            { name: 'Brown rice', quantity_g: 150, calories: 195, protein: 4, carbs: 42, fat: 2 },
            { name: 'Broccoli', quantity_g: 100, calories: 35, protein: 3, carbs: 6, fat: 0 },
          ],
        },
        {
          meal_type: 'snack',
          name: 'Pre-workout snack',
          time_suggestion: '16:00',
          total_calories: 400,
          foods: [
            { name: 'Sweet potato', quantity_g: 150, calories: 135, protein: 2, carbs: 31, fat: 0 },
            { name: 'Whey protein', quantity_g: 35, calories: 130, protein: 25, carbs: 4, fat: 2 },
          ],
        },
        {
          meal_type: 'dinner',
          name: 'Recovery dinner',
          time_suggestion: '20:00',
          total_calories: 600,
          foods: [
            { name: 'Salmon', quantity_g: 200, calories: 370, protein: 40, carbs: 0, fat: 22 },
            { name: 'Quinoa', quantity_g: 100, calories: 120, protein: 4, carbs: 21, fat: 2 },
          ],
        },
      ],
      supplements: [
        { name: 'Creatine', dose: '5g', timing: 'Post-workout' },
        { name: 'Whey Protein', dose: '35g', timing: 'Post-workout' },
        { name: 'Vitamin D', dose: '2000IU', timing: 'With lunch' },
      ],
      nutritionist_notes: 'Plan based on muscle hypertrophy. Adjust portions as weight progresses.',
    }
  }

  if (prompt.includes('treino')) {
    return {
      name: 'Hypertrophy 5x — Mock',
      duration_weeks: 8,
      methodology: 'Split training by muscle groups with weekly load progression',
      sessions: [
        {
          day_of_week: 1,
          name: 'Chest and Triceps',
          focus: 'Hypertrophy',
          estimated_minutes: 60,
          warmup: [
            { exercise: 'Light treadmill', duration_min: 5 },
            { exercise: 'Shoulder mobility', duration_min: 3 },
          ],
          exercises: [
            { name: 'Flat bench press', sets: 4, reps: 10, rest_seconds: 90, weight_suggestion: '70% 1RM', technique_tip: 'Lower controlled in 3 seconds' },
            { name: 'Incline dumbbell fly', sets: 3, reps: 12, rest_seconds: 75, weight_suggestion: 'Moderate', technique_tip: 'Keep slight elbow bend' },
            { name: 'Tricep rope pushdown', sets: 4, reps: 12, rest_seconds: 60, weight_suggestion: 'Moderate', technique_tip: 'Keep elbows fixed to sides' },
          ],
          cooldown: [{ exercise: 'Chest stretch', duration_min: 3 }],
        },
      ],
      trainer_notes: 'Progress 2.5kg per week on compound exercises. Rest 48h between same muscle groups.',
    }
  }

  if (prompt.includes('Escreva feedback')) {
    return {
      subject: 'Your day today',
      greeting: 'Great work today!',
      body: 'You completed another day on your protocol. Your consistency is what will set you apart in the long run.',
      action_items: ['Drink 500ml of water when you wake up', 'Prepare meals in advance'],
      closing: 'You are on the right track. Trust the process!',
      emoji_summary: '💪',
    }
  }

  return {
    overall_score: 78,
    highlights: ['Workout completed on time', 'Good protein intake'],
    attention_points: ['Sleep below ideal'],
    nutrition_feedback: 'Good adherence to the nutrition plan today.',
    workout_feedback: 'Workout executed with quality.',
    recovery_feedback: 'Try to sleep at least 8h tonight.',
    tomorrow_tips: ['Hydrate well when you wake up', 'Prepare meals in advance'],
    motivational_message: 'Every workout brings you closer to your goal. Keep it up!',
    alert_level: 'green',
  }
}

// ═══ Core AI ══════════════════════════════════════════════════════════════════

async function callAI(system: string, user: string) {
  const promptHash = crypto.createHash('sha256').update(user).digest('hex')

  if (process.env.MOCK_AI === 'true') {
    await new Promise(r => setTimeout(r, 1200))
    return {
      data: getMockResponse(user),
      ai_model: 'mock',
      prompt_hash: promptHash,
      generated_at: new Date().toISOString(),
    }
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0]?.message?.content ?? '{}'
  const data = JSON.parse(text)

  return {
    data,
    ai_model: MODEL,
    prompt_hash: promptHash,
    generated_at: new Date().toISOString(),
  }
}

// ═══ Exported Functions ═══════════════════════════════════════════════════════

export async function generateNutritionPlan(input: UserProfile) {
  return callAI(
    `You are a certified sports nutritionist. Respond ONLY in valid JSON with the exact structure requested. All text content must be in Brazilian Portuguese.`,
    `Create a weekly nutrition plan with this data:
- Goal: ${input.goal}
- Level: ${input.fitness_level}
- Training days/week: ${input.weekly_days}
- Target calories: ${input.daily_calories ?? 'calculate by TDEE'}
- Restrictions: ${input.restrictions?.join(', ') || 'none'}
- Health conditions: ${input.health_conditions?.join(', ') || 'none'}
${input.current_weight_kg ? `- Weight: ${input.current_weight_kg}kg` : ''}
${input.height_cm ? `- Height: ${input.height_cm}cm` : ''}
${input.age ? `- Age: ${input.age}` : ''}
${input.gender ? `- Gender: ${input.gender}` : ''}
Include: name, daily_calories, protein_g, carbs_g, fat_g, water_ml, meals (array with meal_type, name, time_suggestion, total_calories, foods array with name/quantity_g/calories/protein/carbs/fat), supplements (array with name/dose/timing), nutritionist_notes`
  )
}

export async function generateWorkoutPlan(input: UserProfile) {
  return callAI(
    `You are a certified personal trainer. Respond ONLY in valid JSON with the exact structure requested. All text content must be in Brazilian Portuguese.`,
    `Create a weekly workout plan with this data:
- Goal: ${input.goal}
- Level: ${input.fitness_level}
- Training days/week: ${input.weekly_days}
- Physical restrictions: ${input.restrictions?.join(', ') || 'none'}
${input.current_weight_kg ? `- Weight: ${input.current_weight_kg}kg` : ''}
${input.age ? `- Age: ${input.age}` : ''}
Include: name, duration_weeks, methodology, sessions (array with day_of_week/name/focus/estimated_minutes/warmup/exercises with name/sets/reps/rest_seconds/weight_suggestion/technique_tip/cooldown), trainer_notes`
  )
}

export async function analyzeReport(report: DailyReport) {
  return callAI(
    `You are a health coach analyzing a client's progress. Respond ONLY in valid JSON. All text content must be in Brazilian Portuguese.`,
    `Analyze the daily report:
Goal: ${report.user_profile.goal}
Date: ${report.date}
Workout completed: ${report.workout_completed ? 'Yes' : 'No'}
Energy: ${report.energy_level}/5
Adherence: ${report.adherence_percent}%
Sleep: ${report.sleep_hours ?? 'not informed'}h
Hydration: ${report.water_ml ? `${report.water_ml}ml` : 'not informed'}
Include: overall_score (0-100), highlights (array), attention_points (array), nutrition_feedback, workout_feedback, recovery_feedback, tomorrow_tips (array), motivational_message, alert_level (green/yellow/red)`
  )
}

export async function generateClientFeedback(report: DailyReport) {
  return callAI(
    `You are a personal coach writing motivational messages. Respond ONLY in valid JSON. All text content must be in Brazilian Portuguese.`,
    `Escreva feedback personalizado para o cliente:
Goal: ${report.user_profile.goal}
Adherence: ${report.adherence_percent}%
Workout done: ${report.workout_completed ? 'Yes' : 'No'}
Energy: ${report.energy_level}/5
Include: subject, greeting, body, action_items (array), closing, emoji_summary`
  )
}

export async function adaptProtocol(input: AdaptationInput) {
  const avgAdherence = input.reports.reduce((sum, r) => sum + r.adherence_percent, 0) / input.reports.length
  const avgEnergy = input.reports.reduce((sum, r) => sum + r.energy_level, 0) / input.reports.length

  return callAI(
    `You are a coach specializing in periodization. Respond ONLY in valid JSON. All text content must be in Brazilian Portuguese.`,
    `Adapt the protocol based on the last ${input.reports.length} weeks:
Average adherence: ${avgAdherence.toFixed(1)}%
Average energy: ${avgEnergy.toFixed(1)}/5
Weeks on plan: ${input.weeks_on_plan}
Include: adaptation_reason, changes (array), new_calorie_target, intensity_adjustment, intensity_percent, recovery_recommendation, next_check_in_days, coach_message`
  )
}