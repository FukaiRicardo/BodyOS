import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

async function callGroq(prompt: string, language: string) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  const languageMap: { [key: string]: string } = {
    pt: 'Portuguese (Brazil)',
    es: 'Spanish',
    ja: 'Japanese',
    en: 'English'
  };

  const fullLanguage = languageMap[language.toLowerCase()] || language;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are a world-class fitness AI coach and analyst.

RULES:
- Always respond in ${fullLanguage}
- JSON keys must always remain in English
- Be strict, precise, and avoid generic motivational phrases
- Focus on real behavior, not vague encouragement
`
        },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error?.message || "Erro Groq");

  return JSON.parse(data.choices[0].message.content);
}

/**
 * 💧 HYDRATION SCORE (novo)
 */
function calculateHydrationScore(water_ml: number = 0) {
  if (water_ml < 500) return 0;
  if (water_ml < 1000) return 20;
  if (water_ml < 1500) return 40;
  if (water_ml < 2000) return 60;
  if (water_ml < 2500) return 75;
  if (water_ml < 3000) return 90;
  return 100;
}

export async function generateWorkoutPlan(userData: any) {
  const lang = userData.language || 'pt';

  const prompt = `
Create a professional workout plan for goal: ${userData.goal}.

Return ONLY valid JSON:
{
  "name": "Plan Name",
  "duration_weeks": 4,
  "methodology": "Methodology",
  "sessions": [
    {
      "day_of_week": 1,
      "name": "Session Name",
      "focus": "Focus",
      "estimated_minutes": 60,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": "12",
          "rest_seconds": 60,
          "technique_tip": "Tip"
        }
      ]
    }
  ],
  "trainer_notes": "Notes"
}
`;

  return await callGroq(prompt, lang);
}

export async function generateNutritionPlan(userData: any) {
  const lang = userData.language || 'pt';

  const prompt = `
Create a professional nutrition plan for goal: ${userData.goal}.

Return ONLY valid JSON:
{
  "calories": 2000,
  "protein": 160,
  "carbs": 220,
  "fat": 70,
  "water_ml": 3500,
  "meals": [
    {
      "name": "Meal Name",
      "meal_type": "breakfast",
      "time_suggestion": "08:00",
      "total_calories": 400,
      "foods": [
        {
          "name": "Food Name",
          "quantity_g": 100,
          "calories": 150
        }
      ]
    }
  ],
  "supplements": [
    {
      "name": "Supplement",
      "dose": "5g",
      "timing": "Post-workout"
    }
  ],
  "nutritionist_notes": "Notes"
}
`;

  return await callGroq(prompt, lang);
}

/**
 * 🔥 ANALYZE REPORT COM HYDRATION SCORE
 */
export async function analyzeReport(reportData: any) {
  const lang = reportData.language || 'pt';

  const hydrationScore = calculateHydrationScore(
    reportData.water_intake_ml || 0
  );

  const prompt = `
Analyze this fitness report rigorously:

${JSON.stringify(reportData)}

HYDRATION SCORE (pre-calculated): ${hydrationScore}/100

IMPORTANT METRICS:
- Water intake is in milliliters (water_intake_ml)
- Recommended baseline: 2500ml/day

STRICT RULES:
- Hydration MUST affect score
- If hydration < 2000ml → mention dehydration risk
- If hydration 2000–3000ml → mention adequate hydration
- If hydration > 3000ml → mention excellent hydration

Return ONLY valid JSON:
{
  "score": 85,
  "hydration_score": ${hydrationScore},
  "highlights": [],
  "attention_points": [],
  "tomorrow_tips": []
}
`;

  return await callGroq(prompt, lang);
}

export async function adaptProtocol(userData: any) {
  const lang = userData.language || 'pt';

  const prompt = `
Adapt the fitness protocol based on real performance and history.

Goal: ${userData.goal}
Data: ${JSON.stringify(userData)}

Return ONLY valid JSON:
{
  "adjustment_reason": "Reason for adapting the plan",
  "changes_made": "Specific changes made to diet/workout",
  "new_calories": 2100,
  "recovery_status": "Status of recovery",
  "new_workout_focus": "New focus"
}
`;

  return await callGroq(prompt, lang);
}

/**
 * 🔥 FEEDBACK COACH
 */
export async function generateClientFeedback(data: any) {
  const lang = data.language || 'pt';

  const prompt = `
You are a strict elite fitness coach.

ANALYSIS:
${JSON.stringify(data.analysis)}

RULES:
- Be honest and direct
- Call out bad behavior clearly
- Only praise when deserved
- Avoid generic motivational phrases

Return ONLY valid JSON:
{
  "emoji_summary": "🔥",
  "subject": "Short evaluation title",
  "greeting": "Direct opening sentence",
  "body": "Main feedback with honesty and precision",
  "closing": "Final instruction or warning"
}
`;

  return await callGroq(prompt, lang);
}