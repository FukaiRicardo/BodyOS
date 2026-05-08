import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

/**
 * Função centralizada para chamadas à API da Groq
 */
async function callGroq(prompt: string, language: string) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada no servidor.");
  }

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
          content: `You are a professional fitness and nutrition expert. You MUST respond exclusively in ${language}. All names of exercises, foods, and notes must be in ${language}. Keep the JSON structure intact.` 
        }, 
        { 
          role: "user", 
          content: prompt 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json() as any;

  if (!response.ok) {
    console.error("Erro Groq:", data);
    throw new Error(data.error?.message || "Erro na API Groq");
  }

  return data.choices[0].message.content;
}

export async function generateWorkoutPlan(userData: any) {
  try {
    // Captura o idioma do dispositivo. Ex: 'Japanese', 'Spanish', 'Portuguese'
    const lang = userData.language || 'Portuguese';

    const prompt = `
      Create a complete workout plan.
      TARGET LANGUAGE: ${lang}
      Goal: ${userData.goal}
      Level: ${userData.fitness_level}
      Days: ${userData.weekly_days}

      STRICT RULES:
      1. All content (exercise names, descriptions, and tips) MUST be written in ${lang}.
      2. If language is Japanese, use Kanji/Kana appropriately.
      3. Return ONLY a valid JSON object.

      Structure:
      {
        "name": "Workout Plan Name in ${lang}",
        "duration_weeks": 4,
        "methodology": "Methodology name in ${lang}",
        "sessions": [
          {
            "day_of_week": 1,
            "name": "Session Name in ${lang}",
            "focus": "Target muscles in ${lang}",
            "exercises": [
              { "name": "Exercise Name in ${lang}", "sets": 3, "reps": "12", "technique_tip": "Tip in ${lang}" }
            ]
          }
        ],
        "trainer_notes": "Final notes in ${lang}"
      }
    `;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("WORKOUT ERROR:", error.message);
    throw error;
  }
}

export async function generateNutritionPlan(userData: any) {
  try {
    const lang = userData.language || 'Portuguese';

    const prompt = `
      Create a nutrition plan.
      TARGET LANGUAGE: ${lang}
      Goal: ${userData.goal}
      Weight: ${userData.current_weight_kg}kg

      STRICT RULES:
      1. All food names, meal names, and nutritionist notes MUST be in ${lang}.
      2. If language is Japanese, use Kanji/Kana appropriately.
      3. Return ONLY a valid JSON object.

      Structure:
      {
        "daily_calories": 2000,
        "protein_g": 150,
        "carbs_g": 200,
        "fat_g": 60,
        "water_ml": 3000,
        "meals": [
          {
            "name": "Meal Name in ${lang}",
            "meal_type": "breakfast",
            "time_suggestion": "08:00",
            "foods": [{ "name": "Food Name in ${lang}", "quantity_g": 100, "calories": 100 }]
          }
        ],
        "supplements": [{ "name": "Supplement Name in ${lang}", "dose": "5g", "timing": "Instructions in ${lang}" }],
        "nutritionist_notes": "Notes in ${lang}"
      }
    `;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("NUTRITION ERROR:", error.message);
    throw error;
  }
}

export async function analyzeReport(data: any) { return { status: 'success' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'Keep going!' }; }
export async function adaptProtocol(data: any) { return { status: 'adapted' }; }