import Groq from 'groq-sdk'
import crypto from 'crypto'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })
// Modelo estável com alta cota de tokens
const MODEL = 'llama-3.1-8b-instant' 

// ─── INTERFACES ──────────────────────────────────────────────────────────────

export interface UserProfile {
  goal: string;
  fitness_level: string;
  weekly_days: number;
  current_weight_kg?: number;
  height_cm?: number;
  age?: number;
  gender?: string;
  language?: string;
}

export interface DailyReport {
  user_profile: UserProfile;
  date: string;
  weight_kg?: number;
  meals_logged: { name: string; calories: number; protein: number }[];
  workout_completed: boolean;
  energy_level: 1 | 2 | 3 | 4 | 5;
  language?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getLanguageName(code?: string): string {
  // Converte para minúsculo e pega apenas o prefixo (ex: 'pt-BR' vira 'pt')
  const cleanCode = String(code || 'en').split('-')[0].toLowerCase();
  
  const map: Record<string, string> = { 
    pt: 'Portuguese', 
    en: 'English', 
    ja: 'Japanese',
    es: 'Spanish' 
  };

  const lang = map[cleanCode] || 'English';
  console.log(`DEBUG: Idioma detectado [${cleanCode}] -> Enviando para IA como: ${lang}`);
  return lang;
}

async function callAI(system: string, user: string) {
  const promptHash = crypto.createHash('sha256').update(user).digest('hex')
  
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.1, // Torna a IA mais precisa e obediente ao idioma
      messages: [
        { 
          role: 'system', 
          content: `${system} 
          IMPORTANT: You MUST speak ONLY in the requested language. 
          All names, descriptions, and notes must be in that language. 
          CRITICAL: Return a valid JSON. DO NOT use English unless requested.` 
        },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content ?? '{}'
    console.log("─── AI DEBUG ───", text);

    return {
      data: JSON.parse(text),
      ai_model: MODEL,
      prompt_hash: promptHash,
      generated_at: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error("AI SERVICE ERROR:", error.message);
    throw error;
  }
}

// ─── EXPORTED FUNCTIONS ───────────────────────────────────────────────────────

export async function generateNutritionPlan(input: UserProfile) {
  const lang = getLanguageName(input.language);
  
  const system = `You are a professional nutritionist. Respond in ${lang}.
  
  STRICT RULE: The fields "name" inside "meals" and "foods" MUST BE FILLED in ${lang}.
  Example for ${lang}: If Spanish, use "Desayuno" and "Pollo". If Japanese, use "朝食" and "鶏肉".

  STRICT JSON STRUCTURE:
  {
    "daily_calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "water_ml": number,
    "meals": [
      {
        "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
        "name": "Meal name in ${lang}",
        "time_suggestion": "HH:MM",
        "total_calories": number,
        "foods": [
          { "name": "Food name in ${lang}", "quantity_g": number, "calories": number }
        ]
      }
    ],
    "supplements": [ { "name": "string", "dose": "string", "timing": "string" } ],
    "nutritionist_notes": "Advice in ${lang}"
  }`;

  const user = `Generate a nutrition plan for goal: ${input.goal} in ${lang}. 
  Ensure ALL name fields are translated and NOT empty.`;

  return callAI(system, user);
}

export async function generateWorkoutPlan(input: UserProfile) {
  const lang = getLanguageName(input.language);
  
  const system = `You are a fitness coach. Respond in ${lang}.
  STRICT JSON STRUCTURE:
  {
    "name": "Workout name in ${lang}",
    "duration_weeks": 4,
    "methodology": "Methodology description in ${lang}",
    "sessions": [
      {
        "day_of_week": number (0-6),
        "name": "Session name in ${lang}",
        "focus": "Focus in ${lang}",
        "estimated_minutes": number,
        "exercises": [
          { "name": "Exercise name in ${lang}", "sets": number, "reps": "string", "rest_seconds": number, "technique_tip": "string in ${lang}" }
        ]
      }
    ],
    "trainer_notes": "Notes in ${lang}"
  }`;

  const user = `Generate a ${input.fitness_level} level workout in ${lang}. Focus: ${input.goal}.`;
  return callAI(system, user);
}

export async function adaptProtocol(input: any) {
  const profile = input.user_profile || input;
  return generateNutritionPlan(profile);
}

export async function analyzeReport(report: DailyReport) {
  const lang = getLanguageName(report.language);
  return callAI(`Analyze progress in ${lang} as JSON. { "analysis": "string", "score": number }`, `Report: ${JSON.stringify(report)}`);
}

export async function generateClientFeedback(report: DailyReport) {
  const lang = getLanguageName(report.language);
  return callAI(`Motivational feedback in ${lang} as JSON. { "feedback": "string" }`, `Report: ${JSON.stringify(report)}`);
}