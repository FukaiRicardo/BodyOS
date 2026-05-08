import dotenv from 'dotenv';
dotenv.config();

// Usaremos o motor da Groq que já está no seu Render
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
async function callGroq(prompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  // O "as any" resolve o erro "'data' is of type 'unknown'"
  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(data.error?.message || "Erro Groq");
  }

  return data.choices[0].message.content;
}

export async function generateWorkoutPlan(userData: any) {
  try {
    const prompt = `Gere um plano de treino JSON para objetivo ${userData.goal} com ${userData.weekly_days} dias por semana. Use este formato: {"name":"Treino", "duration_weeks":4, "methodology":"", "sessions":[], "trainer_notes":""}`;
    const content = await callGroq(prompt);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("ERRO GROQ WORKOUT:", error.message);
    throw error;
  }
}

export async function generateNutritionPlan(userData: any) {
  try {
    const prompt = `Gere uma dieta JSON para objetivo ${userData.goal}. Use este formato: {"daily_calories":2000, "protein_g":150, "carbs_g":200, "fat_g":60, "water_ml":3000, "meals":[], "supplements":[], "nutritionist_notes":""}`;
    const content = await callGroq(prompt);
    return JSON.parse(content);
  } catch (error: any) {
    console.error("ERRO GROQ NUTRIÇÃO:", error.message);
    throw error;
  }
}

export async function analyzeReport(data: any) { return { status: 'ok' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'ok' }; }
export async function adaptProtocol(data: any) { return { status: 'ok' }; }