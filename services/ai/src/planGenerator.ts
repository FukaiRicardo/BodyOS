import dotenv from 'dotenv';

dotenv.config();

// Puxa a chave da Groq que já está nas suas variáveis de ambiente do Render
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

/**
 * Função centralizada para chamadas à API da Groq
 */
async function callGroq(prompt: string) {
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
      messages: [{ 
        role: "system", 
        content: "Você é um assistente especializado em fitness que responde apenas em JSON puro." 
      }, { 
        role: "user", 
        content: prompt 
      }],
      model: "llama-3.1-8b-instant", // Modelo atualizado e suportado
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json() as any; // 'as any' resolve o erro de tipagem unknown

  if (!response.ok) {
    console.error("Erro detalhado Groq:", data);
    throw new Error(data.error?.message || "Erro na comunicação com a API Groq");
  }

  return data.choices[0].message.content;
}

export async function generateWorkoutPlan(userData: any) {
  try {
    const prompt = `Gere um plano de treino JSON para objetivo: ${userData.goal}, nível: ${userData.fitness_level}, dias por semana: ${userData.weekly_days}. 
    Use EXATAMENTE este formato: 
    {
      "name": "Nome do Treino",
      "duration_weeks": 4,
      "methodology": "Ex: ABC, Full Body",
      "sessions": [
        {
          "day_of_week": 1,
          "name": "Treino A",
          "focus": "Músculos alvo",
          "estimated_minutes": 60,
          "exercises": [
            { "name": "Exercício", "sets": 3, "reps": "12", "rest_seconds": 60, "technique_tip": "Dica" }
          ]
        }
      ],
      "trainer_notes": "Dicas gerais"
    }`;

    const content = await callGroq(prompt);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("ERRO GROQ WORKOUT:", error.message);
    throw error;
  }
}

export async function generateNutritionPlan(userData: any) {
  try {
    const prompt = `Gere uma dieta JSON para objetivo: ${userData.goal}, peso: ${userData.current_weight_kg}kg. 
    Use EXATAMENTE este formato: 
    {
      "daily_calories": 2000,
      "protein_g": 150,
      "carbs_g": 200,
      "fat_g": 60,
      "water_ml": 3000,
      "meals": [
        {
          "name": "Café da manhã",
          "meal_type": "breakfast",
          "time_suggestion": "08:00",
          "total_calories": 500,
          "foods": [{ "name": "Alimento", "quantity_g": 100, "calories": 100 }]
        }
      ],
      "supplements": [{ "name": "Creatina", "dose": "5g", "timing": "Pós-treino" }],
      "nutritionist_notes": "Dica nutricional"
    }`;

    const content = await callGroq(prompt);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("ERRO GROQ NUTRIÇÃO:", error.message);
    throw error;
  }
}

// Funções obrigatórias para manter a compatibilidade com o index.ts
export async function analyzeReport(data: any) { return { status: 'success' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'Mandando bem!' }; }
export async function adaptProtocol(data: any) { return { status: 'adapted' }; }