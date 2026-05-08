import dotenv from 'dotenv';

dotenv.config();

// Puxa a chave da Groq das variáveis de ambiente do Render
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
      messages: [
        { 
          role: "system", 
          content: "Você é um assistente de fitness e nutrição de elite. Você deve gerar planos detalhados e responder SEMPRE no idioma solicitado pelo usuário, seguindo rigorosamente o formato JSON." 
        }, 
        { 
          role: "user", 
          content: prompt 
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2, // Um pouco mais de criatividade para os nomes, mas ainda estável
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json() as any;

  if (!response.ok) {
    console.error("Erro detalhado Groq:", data);
    throw new Error(data.error?.message || "Erro na comunicação com a API Groq");
  }

  return data.choices[0].message.content;
}

export async function generateWorkoutPlan(userData: any) {
  try {
    const lang = userData.language || 'Português';
    
    const prompt = `
      ATENÇÃO: Responda OBRIGATORIAMENTE em ${lang}. Todos os nomes de exercícios e notas devem estar em ${lang}.
      Gere um plano de treino JSON para:
      Objetivo: ${userData.goal}
      Nível: ${userData.fitness_level}
      Dias por semana: ${userData.weekly_days}

      Formato esperado:
      {
        "name": "Nome do Treino em ${lang}",
        "duration_weeks": 4,
        "methodology": "Ex: ABC, Full Body",
        "sessions": [
          {
            "day_of_week": 1,
            "name": "Nome da Sessão",
            "focus": "Músculos alvo",
            "estimated_minutes": 60,
            "exercises": [
              { "name": "Nome do Exercício em ${lang}", "sets": 3, "reps": "12", "rest_seconds": 60, "technique_tip": "Dica em ${lang}" }
            ]
          }
        ],
        "trainer_notes": "Notas finais em ${lang}"
      }
    `;

    const content = await callGroq(prompt);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("ERRO WORKOUT (IDIOMA):", error.message);
    throw error;
  }
}

export async function generateNutritionPlan(userData: any) {
  try {
    const lang = userData.language || 'Português';

    const prompt = `
      ATENÇÃO: Responda OBRIGATORIAMENTE em ${lang}. Todos os nomes de alimentos e refeições devem estar em ${lang}.
      Gere uma dieta JSON para:
      Objetivo: ${userData.goal}
      Peso atual: ${userData.current_weight_kg}kg

      Formato esperado:
      {
        "daily_calories": 2000,
        "protein_g": 150,
        "carbs_g": 200,
        "fat_g": 60,
        "water_ml": 3000,
        "meals": [
          {
            "name": "Nome da Refeição em ${lang}",
            "meal_type": "breakfast",
            "time_suggestion": "08:00",
            "total_calories": 500,
            "foods": [{ "name": "Nome do Alimento em ${lang}", "quantity_g": 100, "calories": 100 }]
          }
        ],
        "supplements": [{ "name": "Suplemento", "dose": "5g", "timing": "Sugestão em ${lang}" }],
        "nutritionist_notes": "Dicas de nutrição em ${lang}"
      }
    `;

    const content = await callGroq(prompt);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("ERRO NUTRIÇÃO (IDIOMA):", error.message);
    throw error;
  }
}

// Placeholders para manter compatibilidade
export async function analyzeReport(data: any) { return { status: 'success' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'Excelente progresso!' }; }
export async function adaptProtocol(data: any) { return { status: 'adapted' }; }