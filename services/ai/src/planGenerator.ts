import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

async function callGroq(prompt: string, language: string) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

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
          content: `You are a fitness expert. You MUST respond in ${fullLanguage}. All names, descriptions and notes must be in ${fullLanguage}. IMPORTANT: The JSON keys MUST remain in English as specified in the prompt.` 
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
    const lang = userData.language || 'pt';
    const prompt = `
      Create a professional workout plan for goal: ${userData.goal}.
      Return ONLY this JSON structure. Keep keys in English, translate values to ${lang}:
      {
        "name": "Plan Name",
        "duration_weeks": 4,
        "methodology": "Methodology",
        "sessions": [{
          "day_of_week": 1,
          "name": "Session Name",
          "focus": "Focus",
          "estimated_minutes": 60,
          "exercises": [{ "name": "Exercise Name", "sets": 3, "reps": "12", "rest_seconds": 60, "technique_tip": "Tip" }]
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
    const lang = userData.language || 'pt';
    const prompt = `
      Create a professional nutrition plan for goal: ${userData.goal}.
      Return ONLY this JSON structure. Keep keys in English, translate values to ${lang}:
      {
        "calories": 2000,
        "protein": 160, 
        "carbs": 220, 
        "fat": 70, 
        "water_ml": 3500,
        "meals": [{
          "name": "Meal Name",
          "meal_type": "breakfast",
          "time_suggestion": "08:00",
          "total_calories": 400,
          "foods": [{ "name": "Food Name", "quantity_g": 100, "calories": 150 }]
        }],
        "supplements": [{ "name": "Supplement", "dose": "5g", "timing": "Post-workout" }],
        "nutritionist_notes": "Notes"
      }`;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    throw error;
  }
}

export async function analyzeReport(reportData: any) {
  try {
    const lang = reportData.language || 'pt';
    const prompt = `
      Analyze this daily fitness report: ${JSON.stringify(reportData)}.
      Return ONLY this JSON structure in English keys, values in ${lang}:
      {
        "score": 85,
        "highlights": ["Strong workout", "Good hydration"],
        "attention_points": ["Sleep was low"],
        "tomorrow_tips": ["Rest more tonight"]
      }`;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Erro analyzeReport:", error);
    throw error;
  }
}

export async function adaptProtocol(userData: any) {
  try {
    const lang = userData.language || 'pt';
    const prompt = `
      Adapt the current fitness protocol based on user history and progress.
      Goal: ${userData.goal}.
      User Data: ${JSON.stringify(userData)}.
      Return ONLY this JSON structure in English keys, values in ${lang}:
      {
        "adjustment_reason": "Reason for adapting the plan",
        "changes_made": "Specific changes made to diet/workout",
        "new_calories": 2100,
        "recovery_status": "Status of recovery",
        "new_workout_focus": "New focus"
      }`;

    const content = await callGroq(prompt, lang);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Erro adaptProtocol:", error);
    throw error;
  }
}

export async function generateClientFeedback(data: any) { 
    return { feedback: 'Keep it up! Your consistency is key to your progress.' }; 
}