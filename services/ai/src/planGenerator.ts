import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface LocationContext {
  country?: string
  countryCode?: string
  city?: string
  region?: string | null 
  currency?: string
  currencySymbol?: string
}

interface UserData {
  goal?: string
  fitness_level?: string
  age?: number
  gender?: string
  current_weight_kg?: number
  target_weight_kg?: number
  height_cm?: number
  weekly_days?: number
  language?: string
  location?: LocationContext
  [key: string]: any
}

// ─────────────────────────────────────────────────────────────
// CORE: GROQ CLIENT
// ─────────────────────────────────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  pt: 'Portuguese (Brazil)',
  es: 'Spanish',
  ja: 'Japanese',
  en: 'English',
  de: 'German',
  fr: 'French',
  it: 'Italian',
  ko: 'Korean',
  zh: 'Chinese (Simplified)',
}

async function callGroq(prompt: string, language: string, retries = 2): Promise<any> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada.");

  const fullLanguage = LANGUAGE_MAP[language.toLowerCase()] || language;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a world-class fitness AI coach and nutritionist.

STRICT RULES:
- Always respond in ${fullLanguage}
- JSON keys must always remain in English
- Be precise, specific, and avoid generic motivational phrases
- Focus on real, actionable advice based on the user's actual profile
- Never invent data not provided
`,
            },
            { role: "user", content: prompt },
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errData = await response.json() as any;
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      return JSON.parse(data.choices[0].message.content);

    } catch (err: any) {
      clearTimeout(timeout);

      const isLastAttempt = attempt === retries;
      if (isLastAttempt) throw err;

      // Espera antes de retry (backoff simples)
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Gera contexto de localização formatado para os prompts
 * Inclui dicas sobre alimentos e custo local
 */
function buildLocationContext(location?: LocationContext): string {
  if (!location?.country) {
    return `LOCATION: Unknown (use internationally available foods, estimate costs in USD)`;
  }

  const city = location.city ? `${location.city}, ` : '';
  const currency = location.currency || 'USD';
  const symbol = location.currencySymbol || '$';

  return `LOCATION CONTEXT:
- User location: ${city}${location.country} (${location.countryCode || ''})
- Currency: ${currency} (${symbol})
- IMPORTANT: Prioritize foods that are:
  1. Commonly found in ${location.country} supermarkets
  2. Affordable for the local economy
  3. Part of the local food culture when possible
- Estimate food costs in ${currency} (${symbol}) based on typical ${location.country} prices
- Avoid recommending exotic or hard-to-find foods for this region`;
}

/**
 * Constrói o perfil completo do usuário para o prompt
 */
function buildUserProfile(userData: UserData): string {
  return `USER PROFILE:
- Goal: ${userData.goal || 'not specified'}
- Fitness level: ${userData.fitness_level || 'not specified'}
- Age: ${userData.age || 'not specified'}
- Gender: ${userData.gender || 'not specified'}
- Current weight: ${userData.current_weight_kg ? userData.current_weight_kg + 'kg' : 'not specified'}
- Target weight: ${userData.target_weight_kg ? userData.target_weight_kg + 'kg' : 'not specified'}
- Height: ${userData.height_cm ? userData.height_cm + 'cm' : 'not specified'}
- Training days/week: ${userData.weekly_days || 4}`;
}

/**
 * Calcula hydration score
 */
function calculateHydrationScore(water_ml: number = 0): number {
  if (water_ml < 500)  return 0;
  if (water_ml < 1000) return 20;
  if (water_ml < 1500) return 40;
  if (water_ml < 2000) return 60;
  if (water_ml < 2500) return 75;
  if (water_ml < 3000) return 90;
  return 100;
}

// ─────────────────────────────────────────────────────────────
// EXPORTS: GERADORES DE PLANO
// ─────────────────────────────────────────────────────────────

export async function generateWorkoutPlan(userData: UserData) {
  const lang = userData.language || 'pt';
  const userProfile = buildUserProfile(userData);

  const prompt = `
${userProfile}

Create a professional, personalized workout plan based on this exact profile.

Return ONLY valid JSON:
{
  "name": "Plan Name",
  "duration_weeks": 4,
  "methodology": "Methodology description",
  "sessions": [
    {
      "day_of_week": 1,
      "name": "Session Name",
      "focus": "Muscle group or focus",
      "estimated_minutes": 60,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": "12",
          "rest_seconds": 60,
          "technique_tip": "Specific technique tip"
        }
      ]
    }
  ],
  "trainer_notes": "Personalized notes based on the user profile"
}

RULES:
- Adapt intensity and volume to the user's fitness level
- Number of sessions must match weekly_days (${userData.weekly_days || 4})
- Be specific, not generic
`;

  return await callGroq(prompt, lang);
}

export async function generateNutritionPlan(userData: UserData) {
  console.log('📍 LOCATION RECEIVED:', JSON.stringify(userData.location, null, 2))
  const lang = userData.language || 'pt';
  const fullLanguage = LANGUAGE_MAP[lang.toLowerCase()] || lang;
  const userProfile = buildUserProfile(userData);
  const locationContext = buildLocationContext(userData.location);

  const currency = userData.location?.currency || 'USD';
  const symbol = userData.location?.currencySymbol || '$';
  const country = userData.location?.country || 'the user\'s country';

  const prompt = `
${userProfile}

${locationContext}

Create a complete, personalized nutrition plan for this user.

Return ONLY valid JSON:
{
  "calories": 2000,
  "protein": 160,
  "carbs": 220,
  "fat": 70,
  "water_ml": 3500,
  "currency": "${currency}",
  "currency_symbol": "${symbol}",
  "meals": [
    {
      "name": "Meal Name",
      "meal_type": "breakfast",
      "time_suggestion": "08:00",
      "total_calories": 400,
      "estimated_cost": 450,
      "foods": [
        {
          "name": "Food Name (write in ${fullLanguage})",
          "quantity_g": 100,
          "calories": 150,
          "protein_g": 12,
          "unit_description": "1 medium unit / 2 tablespoons / etc."
        }
      ],
      "protein_options": [
        {
          "name": "Protein Option 1 (write in ${fullLanguage})",
          "quantity_g": 150,
          "calories": 165,
          "protein_g": 31,
          "estimated_cost": 120,
          "unit_description": "1 medium fillet"
        },
        {
          "name": "Protein Option 2 (write in ${fullLanguage})",
          "quantity_g": 150,
          "calories": 220,
          "protein_g": 28,
          "estimated_cost": 180,
          "unit_description": "1 palm-sized portion"
        }
      ],
      "food_alternatives": [
        {
          "replaces": "Food it replaces",
          "reason": "cheaper / easier to find / seasonal",
          "food_name": "Alternative (write in ${fullLanguage})",
          "quantity_g": 100,
          "calories": 140,
          "estimated_cost": 80
        }
      ]
    }
  ],
  "supplements": [
    {
      "name": "Supplement",
      "dose": "5g",
      "timing": "Post-workout",
      "available_in": "${country}"
    }
  ],
  "nutritionist_notes": "Personalized notes considering the user location and goal",
  "local_food_tip": "One tip about affordable local foods in ${country} that support the goal"
}

CRITICAL RULES:
- Write ALL food names, meal names, and descriptions in ${fullLanguage} — never use Japanese, kanji, hiragana, or any local script
- ALL foods must be easy to find in regular supermarkets in ${country}
- Prioritize widely available foods: rice, eggs, chicken, fish, tofu, vegetables common in ${country}
- estimated_cost must be a realistic integer in ${currency} — no decimals (e.g. 450, not 450.00)
- currency display: use symbol only — write ¥450, never ¥450.00 JPY
- Every meal MUST include at least 2 protein_options with foods available in ${country}
- food_alternatives must cover at least 2 foods per meal with locally available substitutes
- Adjust macros precisely based on: weight ${userData.current_weight_kg}kg, goal ${userData.goal}, fitness level ${userData.fitness_level}
`;

  const result = await callGroq(prompt, lang);
  return sanitizeNutritionPlan(result, userData.location);
}

function sanitizeNutritionPlan(plan: any, location?: LocationContext): any {
  if (!plan?.meals) return plan;

  plan.currency_symbol = location?.currencySymbol || '$';
  plan.currency = location?.currency || 'USD';

  plan.meals = plan.meals.map((meal: any) => {
    if (meal.estimated_cost != null) {
      meal.estimated_cost = Math.round(meal.estimated_cost);
    }
    return meal;
  });

  return plan;
}

export async function analyzeReport(reportData: UserData) {
  const lang = reportData.language || 'pt';
  const hydrationScore = calculateHydrationScore(reportData.water_intake_ml || 0);

  const prompt = `
Analyze this fitness daily report rigorously and honestly:

${JSON.stringify(reportData)}

PRE-CALCULATED METRICS:
- Hydration score: ${hydrationScore}/100
- Recommended water baseline: 2500ml/day

STRICT ANALYSIS RULES:
- Hydration MUST affect the overall score significantly
- If water < 2000ml → flag dehydration risk clearly
- If water 2000–3000ml → acknowledge adequate hydration
- If water > 3000ml → commend excellent hydration
- Be honest, not encouraging if performance was poor
- Score must reflect actual data, not be inflated

Return ONLY valid JSON:
{
  "score": 85,
  "hydration_score": ${hydrationScore},
  "highlights": ["Specific positive point 1", "Specific positive point 2"],
  "attention_points": ["Specific concern 1", "Specific concern 2"],
  "tomorrow_tips": ["Concrete actionable tip 1", "Concrete actionable tip 2"]
}
`;

  return await callGroq(prompt, lang);
}

export async function adaptProtocol(userData: UserData) {
  const lang = userData.language || 'pt';
  const locationContext = buildLocationContext(userData.location);

  const prompt = `
Adapt this user's fitness protocol based on their real performance history.

${buildUserProfile(userData)}

${locationContext}

Performance data and history:
${JSON.stringify(userData)}

Return ONLY valid JSON:
{
  "adjustment_reason": "Clear explanation of why the protocol needs adjustment",
  "changes_made": "Specific changes to diet and/or workout",
  "new_calories": 2100,
  "recovery_status": "Assessment of current recovery",
  "new_workout_focus": "Adjusted focus based on performance"
}

Rules:
- Base all adjustments on the actual data provided
- Consider the user's location for any dietary changes
- Be direct about what's working and what isn't
`;

  return await callGroq(prompt, lang);
}

export async function generateClientFeedback(data: any) {
  const lang = data.language || 'pt';

  const prompt = `
You are a strict elite fitness coach giving personalized feedback.

USER ANALYSIS:
${JSON.stringify(data.analysis)}

RULES:
- Be honest and direct — no sugarcoating
- Call out poor behavior clearly with specific examples from the data
- Only praise genuinely good results
- End with one concrete action for tomorrow
- Avoid generic motivational phrases

Return ONLY valid JSON:
{
  "emoji_summary": "🔥",
  "subject": "Short, direct evaluation title",
  "greeting": "Direct opening — address the main result immediately",
  "body": "Honest, precise feedback referencing the actual data",
  "closing": "One specific action instruction for tomorrow"
}
`;

  return await callGroq(prompt, lang);
}

