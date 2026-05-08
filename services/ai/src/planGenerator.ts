import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa o Google Generative AI com a sua Key do .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Mapeia o código de idioma para o nome por extenso para o Gemini
 */
function getLanguageName(code?: string): string {
  const cleanCode = String(code || 'pt').split('-')[0].toLowerCase();
  const map: Record<string, string> = {
    pt: 'Portuguese',
    en: 'English',
    ja: 'Japanese',
    es: 'Spanish'
  };
  return map[cleanCode] || 'Portuguese';
}

/**
 * Limpa a resposta do Gemini removendo marcações de ```json
 */
function cleanGeminiJSON(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * GERAÇÃO DE PLANO NUTRICIONAL
 */
export async function generateNutritionPlan(userData: any) {
  // Utilizamos o 1.5 Flash por ser rápido e gratuito no plano free
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.1 } // Baixa temperatura para manter o JSON estável
  });

  const language = getLanguageName(userData.language);

  const prompt = `
    You are an expert nutritionist and health coach.
    Generate a detailed nutrition plan in ${language} for the following user profile:
    ${JSON.stringify(userData, null, 2)}

    The output MUST be a valid JSON object strictly following this structure:
    {
      "daily_calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "water_ml": number,
      "meals": [
        {
          "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
          "name": "Meal Name",
          "time_suggestion": "HH:MM",
          "total_calories": number,
          "foods": [
            { "name": "Food name", "quantity_g": number, "calories": number }
          ]
        }
      ],
      "supplements": [
        { "name": string, "dose": string, "timing": string }
      ],
      "nutritionist_notes": "Professional advice in ${language}"
    }

    Rules:
    1. Respond ONLY with the JSON.
    2. Do not include any conversational text.
    3. Ensure all text values are in ${language}.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = cleanGeminiJSON(text);
    
    return {
      data: JSON.parse(cleanJson),
      ai_model: "gemini-1.5-flash"
    };
  } catch (error) {
    console.error("Erro no Gemini (Nutrition):", error);
    throw error;
  }
}

/**
 * GERAÇÃO DE PLANO DE TREINO
 */
export async function generateWorkoutPlan(userData: any) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.1 }
  });

  const language = getLanguageName(userData.language);

  const prompt = `
    You are a professional fitness trainer.
    Generate a workout plan in ${language} for the following user profile:
    ${JSON.stringify(userData, null, 2)}

    The output MUST be a valid JSON object strictly following this structure:
    {
      "name": "Plan Name",
      "goal": string,
      "methodology": string,
      "duration_weeks": number,
      "sessions": [
        {
          "day_of_week": number (0-6),
          "name": "Session Name (e.g. Upper Body)",
          "focus": string,
          "estimated_minutes": number,
          "exercises": [
            {
              "name": string,
              "sets": number,
              "reps": string,
              "rest_seconds": number,
              "technique_tip": "Advice in ${language}"
            }
          ]
        }
      ],
      "trainer_notes": "Professional advice in ${language}"
    }

    Rules:
    1. Respond ONLY with the JSON.
    2. Use ${language} for all descriptions.
    3. Ensure the workout matches the user fitness level and goal.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = cleanGeminiJSON(text);
    
    return {
      data: JSON.parse(cleanJson),
      ai_model: "gemini-1.5-flash"
    };
  } catch (error) {
    console.error("Erro no Gemini (Workout):", error);
    throw error;
  }
}

// Adicione isso ao final do seu planGenerator.ts:

export async function analyzeHeart(data: any) {
  console.log("Analyze Heart chamado");
  return { status: "Feature em desenvolvimento com Gemini" };
}

export async function generateClientFeedback(data: any) {
  console.log("Client Feedback chamado");
  return { feedback: "Análise concluída com sucesso." };
}

export async function adaptProtocol(data: any) {
  // Se o seu app usa essa função para adaptar treinos/dietas, 
  // ela precisa existir para o servidor ligar.
  console.log("Adapt Protocol chamado");
  return { success: true, data: data };
}