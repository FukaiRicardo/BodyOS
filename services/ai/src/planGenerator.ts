import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Tenta pegar a chave de dois nomes comuns para evitar erro de digitação no Render
const apiKey = process.env.GOOGLE_API_KEY || process.env.API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateNutritionPlan(userData: any) {
  try {
    // Usando gemini-pro que tem maior disponibilidade global
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Gere um plano nutricional em JSON para objetivo ${userData.goal}. 
    Responda APENAS o objeto JSON abaixo:
    {"daily_calories":2000, "protein_g":150, "carbs_g":200, "fat_g":60, "water_ml":3000, "meals":[], "supplements":[], "nutritionist_notes":"Foco em proteínas."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error) {
    console.error("NUTRITION ERROR:", error);
    throw error;
  }
}

export async function generateWorkoutPlan(userData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Gere um treino em JSON para objetivo ${userData.goal} e ${userData.weekly_days} dias.
    Responda APENAS o objeto JSON abaixo:
    {"name":"Treino Base", "duration_weeks":4, "methodology":"Hipertrofia", "sessions":[], "trainer_notes":"Aquecer bem."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (error) {
    console.error("WORKOUT ERROR:", error);
    throw error;
  }
}

// Placeholders obrigatórios para o index.ts não dar erro
export async function analyzeReport(data: any) { return { status: 'ok' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'ok' }; }
export async function adaptProtocol(data: any) { return { status: 'ok' }; }