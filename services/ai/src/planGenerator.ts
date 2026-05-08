import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Função com sistema de tentativa (Fallback)
async function askGemini(prompt: string) {
  const models = ["gemini-1.5-flash", "gemini-pro"]; // Tenta o novo, depois o antigo
  
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text.replace(/```json|```/g, '').trim();
    } catch (err) {
      console.error(`Falha no modelo ${modelName}, tentando próximo...`);
      continue; 
    }
  }
  throw new Error("Nenhum modelo do Gemini respondeu.");
}

export async function generateNutritionPlan(userData: any) {
  try {
    const prompt = `Retorne apenas JSON para dieta: Objetivo:${userData.goal}, Peso:${userData.current_weight_kg}kg. Formato: {"daily_calories":2000, "protein_g":150, "carbs_g":200, "fat_g":60, "water_ml":3000, "meals":[], "supplements":[], "nutritionist_notes":""}`;
    const jsonString = await askGemini(prompt);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("NUTRITION ERROR:", error);
    throw error;
  }
}

export async function generateWorkoutPlan(userData: any) {
  try {
    const prompt = `Retorne apenas JSON para treino: Objetivo:${userData.goal}, Dias:${userData.weekly_days}. Formato: {"name":"Treino A", "duration_weeks":4, "methodology":"ABC", "sessions":[], "trainer_notes":""}`;
    const jsonString = await askGemini(prompt);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("WORKOUT ERROR:", error);
    throw error;
  }
}

export async function analyzeReport(data: any) { return { status: 'success' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'Keep going!' }; }
export async function adaptProtocol(data: any) { return { status: 'adapted' }; }