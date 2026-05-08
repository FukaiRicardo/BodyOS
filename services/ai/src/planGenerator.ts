import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateWorkoutPlan(userData: any) {
  try {
    // gemini-pro é o modelo mais estável e compatível com todas as regiões do Render
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Gere um plano de treino JSON para objetivo ${userData.goal} com ${userData.weekly_days} dias por semana. 
    Responda APENAS o JSON no formato: 
    {"name":"Treino", "duration_weeks":4, "methodology":"", "sessions":[], "trainer_notes":""}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("DETALHE DO ERRO WORKOUT:", error?.message || error);
    throw new Error("Falha no treino");
  }
}

export async function generateNutritionPlan(userData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Gere um plano alimentar JSON para objetivo ${userData.goal} e peso ${userData.current_weight_kg}kg. 
    Responda APENAS o JSON no formato: 
    {"daily_calories":2000, "protein_g":150, "carbs_g":200, "fat_g":60, "water_ml":3000, "meals":[], "supplements":[], "nutritionist_notes":""}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("DETALHE DO ERRO NUTRIÇÃO:", error?.message || error);
    throw new Error("Falha na nutrição");
  }
}

export async function analyzeReport(data: any) { return { status: 'ok' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'ok' }; }
export async function adaptProtocol(data: any) { return { status: 'ok' }; }