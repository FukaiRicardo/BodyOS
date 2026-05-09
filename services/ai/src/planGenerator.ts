import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

async function callGroq(prompt: string, language: string) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  // Mapeia códigos curtos para nomes completos para facilitar a vida da IA
  const languageMap: { [key: string]: string } = {
    'pt': 'Portuguese (Brazil)',
    'es': 'Spanish',
    'ja': 'Japanese',
    'en': 'English'
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
          content: `You are a fitness expert. You MUST respond in ${fullLanguage}. All exercises and foods must be in ${fullLanguage}. Keep JSON structure.` 
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
  return data.choices[0].message.content;
}

export async function generateWorkoutPlan(userData: any) {
  try {
    // Se o app enviado não mandar language, tentamos pegar de outro campo ou usamos o padrão
    const lang = userData.language || 'Portuguese';

    const prompt = `
      Create a REAL workout plan.
      TARGET LANGUAGE: ${lang}
      Goal: ${userData.goal}
      
      CRITICAL: Write EVERYTHING in ${lang}.
      Return ONLY this JSON:
      {
        "name": "Plan Name",
        "duration_weeks": 4,
        "methodology": "Methodology",
        "sessions": [{
          "day_of_week": 1,
          "name": "Session Name",
          "focus": "Focus",
          "exercises": [{ "name": "Exercise Name", "sets": 3, "reps": "12", "technique_tip": "Tip" }]
        }],
        "trainer_notes": "Notes"
      }`;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    throw error;
  }
}

export async function generateNutritionPlan(userData: any) {
  try {
    const lang = userData.language || 'Portuguese';

    const prompt = `
      Create a REAL nutrition plan.
      TARGET LANGUAGE: ${lang}
      Goal: ${userData.goal}

      CRITICAL: Write EVERYTHING in ${lang}.
      Return ONLY this JSON:
      {
        "daily_calories": 2000,
        "protein_g": 160, "carbs_g": 220, "fat_g": 70, "water_ml": 3500,
        "meals": [{
          "name": "Meal Name",
          "meal_type": "breakfast",
          "time_suggestion": "08:00",
          "foods": [{ "name": "Food Name", "quantity_g": 100, "calories": 150 }]
        }],
        "supplements": [{ "name": "Supplement", "dose": "5g", "timing": "Post-workout" }],
        "nutritionist_notes": "Specific advice"
      }`;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    throw error;
  }
}

export async function analyzeReport(data: any) { return { status: 'success' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'Keep it up!' }; }
export async function adaptProtocol(data: any) { return { status: 'adapted' }; }