import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Tenta carregar a chave
const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateWorkoutPlan(userData: any) {
  try {
    // Usamos o gemini-1.5-flash que é o mais atualizado
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Gere um treino JSON para objetivo ${userData.goal}. Responda apenas o JSON puro.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Limpeza de Markdown
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error: any) {
    // ESTA LINHA É A MAIS IMPORTANTE:
    console.error("DETALHE DO ERRO NO RENDER:", error?.message || error);
    throw new Error("Erro na geração: " + (error?.message || "Desconhecido"));
  }
}

// Repita a mesma lógica para a Nutrição
export async function generateNutritionPlan(userData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Gere uma dieta JSON para objetivo ${userData.goal}. Responda apenas o JSON puro.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("ERRO NUTRIÇÃO:", error?.message || error);
    throw error;
  }
}

export async function analyzeReport(data: any) { return { status: 'ok' }; }
export async function generateClientFeedback(data: any) { return { feedback: 'ok' }; }
export async function adaptProtocol(data: any) { return { status: 'ok' }; }