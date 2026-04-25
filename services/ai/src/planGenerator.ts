import { GoogleGenerativeAI } from '@google/generative-ai'
import crypto from 'crypto'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
const MODEL = 'gemini-2.0-flash'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserProfile {
  goal: string
  fitness_level: string
  weekly_days: number
  daily_calories?: number
  restrictions?: string[]
  health_conditions?: string[]
  current_weight_kg?: number
  target_weight_kg?: number
  height_cm?: number
  age?: number
  gender?: string
}

export interface DailyReport {
  user_profile: UserProfile
  date: string
  weight_kg?: number
  meals_logged: { name: string; calories: number; protein: number }[]
  workout_completed: boolean
  workout_notes?: string
  energy_level: 1 | 2 | 3 | 4 | 5
  sleep_hours?: number
  mood?: string
  water_ml?: number
  adherence_percent: number
}

export interface AdaptationInput {
  user_profile: UserProfile
  current_plan: object
  reports: DailyReport[]
  weeks_on_plan: number
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

// Respostas mock separadas por tipo de prompt — cada rota da IA tem sua estrutura própria
// Isso evita que a tela de relatório receba dados de nutrição e vice-versa
function getMockResponse(prompt: string): object {

  // Plano nutricional — identificado pela palavra "nutricional" no prompt
  if (prompt.includes('nutricional')) {
    return {
      name: 'Plano Hipertrofia — Mock',
      daily_calories: 2800,
      protein_g: 200,
      carbs_g: 300,
      fat_g: 80,
      water_ml: 3000,
      meals: [
        {
          meal_type: 'breakfast',
          name: 'Café da manhã proteico',
          time_suggestion: '07:00',
          total_calories: 550,
          foods: [
            { name: 'Ovos inteiros', quantity_g: 180, calories: 250, protein: 18, carbs: 2, fat: 18 },
            { name: 'Aveia', quantity_g: 80, calories: 300, protein: 10, carbs: 54, fat: 6 },
          ],
        },
        {
          meal_type: 'lunch',
          name: 'Almoço completo',
          time_suggestion: '12:00',
          total_calories: 750,
          foods: [
            { name: 'Frango grelhado', quantity_g: 200, calories: 330, protein: 62, carbs: 0, fat: 7 },
            { name: 'Arroz integral', quantity_g: 150, calories: 195, protein: 4, carbs: 42, fat: 2 },
            { name: 'Brócolis', quantity_g: 100, calories: 35, protein: 3, carbs: 6, fat: 0 },
          ],
        },
        {
          meal_type: 'snack',
          name: 'Lanche pré-treino',
          time_suggestion: '16:00',
          total_calories: 400,
          foods: [
            { name: 'Batata doce', quantity_g: 150, calories: 135, protein: 2, carbs: 31, fat: 0 },
            { name: 'Whey protein', quantity_g: 35, calories: 130, protein: 25, carbs: 4, fat: 2 },
          ],
        },
        {
          meal_type: 'dinner',
          name: 'Jantar recuperação',
          time_suggestion: '20:00',
          total_calories: 600,
          foods: [
            { name: 'Salmão', quantity_g: 200, calories: 370, protein: 40, carbs: 0, fat: 22 },
            { name: 'Quinoa', quantity_g: 100, calories: 120, protein: 4, carbs: 21, fat: 2 },
          ],
        },
      ],
      supplements: [
        { name: 'Creatina', dose: '5g', timing: 'Pós-treino' },
        { name: 'Whey Protein', dose: '35g', timing: 'Pós-treino' },
        { name: 'Vitamina D', dose: '2000UI', timing: 'Com almoço' },
      ],
      nutritionist_notes: 'Plano baseado em hipertrofia muscular. Ajuste as porções conforme evolução do peso.',
    }
  }

  // Plano de treino — identificado pela palavra "treino" no prompt
  if (prompt.includes('treino')) {
    return {
      name: 'Plano Hipertrofia 5x — Mock',
      duration_weeks: 8,
      methodology: 'Treino dividido por grupos musculares com progressão de carga semanal',
      sessions: [
        {
          day_of_week: 1,
          name: 'Peito e Tríceps',
          focus: 'Hipertrofia',
          estimated_minutes: 60,
          warmup: [
            { exercise: 'Esteira leve', duration_min: 5 },
            { exercise: 'Mobilidade de ombro', duration_min: 3 },
          ],
          exercises: [
            { name: 'Supino reto', sets: 4, reps: 10, duration_sec: null, rest_seconds: 90, weight_suggestion: '70% 1RM', technique_tip: 'Desça controlado em 3 segundos' },
            { name: 'Crucifixo inclinado', sets: 3, reps: 12, duration_sec: null, rest_seconds: 75, weight_suggestion: 'Moderado', technique_tip: 'Mantenha leve flexão no cotovelo' },
            { name: 'Tríceps corda', sets: 4, reps: 12, duration_sec: null, rest_seconds: 60, weight_suggestion: 'Moderado', technique_tip: 'Cotovelos fixos ao lado do corpo' },
          ],
          cooldown: [{ exercise: 'Alongamento de peito', duration_min: 3 }],
        },
        {
          day_of_week: 2,
          name: 'Costas e Bíceps',
          focus: 'Hipertrofia',
          estimated_minutes: 65,
          warmup: [{ exercise: 'Remada com elástico', duration_min: 5 }],
          exercises: [
            { name: 'Puxada frontal', sets: 4, reps: 10, duration_sec: null, rest_seconds: 90, weight_suggestion: '70% 1RM', technique_tip: 'Puxe até o queixo, escápulas juntas' },
            { name: 'Remada curvada', sets: 4, reps: 10, duration_sec: null, rest_seconds: 90, weight_suggestion: '65% 1RM', technique_tip: 'Coluna neutra durante todo o movimento' },
            { name: 'Rosca direta', sets: 3, reps: 12, duration_sec: null, rest_seconds: 60, weight_suggestion: 'Moderado', technique_tip: 'Sem balanço de tronco' },
          ],
          cooldown: [{ exercise: 'Alongamento de costas', duration_min: 3 }],
        },
        {
          day_of_week: 4,
          name: 'Pernas',
          focus: 'Força e Hipertrofia',
          estimated_minutes: 75,
          warmup: [{ exercise: 'Agachamento com peso corporal', duration_min: 5 }],
          exercises: [
            { name: 'Agachamento livre', sets: 4, reps: 8, duration_sec: null, rest_seconds: 120, weight_suggestion: '75% 1RM', technique_tip: 'Joelhos alinhados com os pés' },
            { name: 'Leg press', sets: 3, reps: 12, duration_sec: null, rest_seconds: 90, weight_suggestion: 'Moderado-pesado', technique_tip: 'Não trave os joelhos na extensão' },
            { name: 'Cadeira extensora', sets: 3, reps: 15, duration_sec: null, rest_seconds: 60, weight_suggestion: 'Leve-moderado', technique_tip: 'Contração máxima no topo' },
          ],
          cooldown: [{ exercise: 'Alongamento de quadríceps e isquiotibiais', duration_min: 5 }],
        },
      ],
      trainer_notes: 'Progrida 2.5kg por semana nos exercícios compostos. Descanse 48h entre grupos musculares iguais.',
    }
  }

  // Feedback personalizado do coach — identificado pela palavra "feedback" no prompt
if (prompt.includes('Escreva feedback personalizado')) {
    return {
      subject: 'Seu dia de hoje 💪',
      greeting: 'Ótimo trabalho hoje!',
      body: 'Você completou mais um dia no seu protocolo. Sua consistência é o que vai te diferenciar no longo prazo. Continue focado no processo e os resultados virão naturalmente. Cada pequena ação conta para o resultado final.',
      action_items: [
        'Beba pelo menos 500ml de água ao acordar amanhã',
        'Prepare suas refeições com antecedência para manter a aderência',
      ],
      closing: 'Você está no caminho certo. Confie no processo! 🚀',
      emoji_summary: '💪🔥✅',
    }
  }

  // Análise de relatório diário — fallback para qualquer outro prompt
  return {
    overall_score: 78,
    highlights: ['Treino concluído no horário', 'Boa ingestão proteica'],
    attention_points: ['Sono abaixo do ideal'],
    nutrition_feedback: 'Boa adesão ao plano nutricional hoje. Continue mantendo as refeições nos horários certos.',
    workout_feedback: 'Treino executado com qualidade. A progressão de carga está adequada para seu nível.',
    recovery_feedback: 'Tente dormir pelo menos 8h esta noite para otimizar a recuperação muscular.',
    tomorrow_tips: ['Hidrate-se bem ao acordar', 'Prepare as refeições com antecedência'],
    motivational_message: 'Cada treino te aproxima do seu objetivo. Continue assim!',
    alert_level: 'green',
  }
}

// ─── Core AI ──────────────────────────────────────────────────────────────────

// Função central que chama a IA — suporta modo mock para desenvolvimento sem custos
// O hash do prompt permite rastreamento de qual versão do prompt gerou cada plano
async function callAI(system: string, user: string) {
  const promptHash = crypto.createHash('sha256').update(user).digest('hex')

  if (process.env.MOCK_AI === 'true') {
    // Simula latência real da IA para não mascarar problemas de UX no loading
    await new Promise(r => setTimeout(r, 1200))
    return {
      data: getMockResponse(user),
      ai_model: 'mock',
      prompt_hash: promptHash,
      generated_at: new Date().toISOString(),
    }
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      temperature: 0.3, // baixo para respostas consistentes e previsíveis
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(user)
  const text = result.response.text()
  const data = JSON.parse(text)

  return {
    data,
    ai_model: MODEL,
    prompt_hash: promptHash,
    generated_at: new Date().toISOString(),
  }
}

// ─── Exported Functions ───────────────────────────────────────────────────────

export async function generateNutritionPlan(input: UserProfile) {
  return callAI(
    `Você é um nutricionista esportivo certificado. Responda APENAS em JSON válido com a estrutura exata solicitada.`,
    `Crie um plano nutricional semanal com estes dados:
- Objetivo: ${input.goal}
- Nível: ${input.fitness_level}
- Dias de treino/semana: ${input.weekly_days}
- Calorias alvo: ${input.daily_calories ?? 'calcule pelo TDEE'}
- Restrições: ${input.restrictions?.join(', ') || 'nenhuma'}
- Condições de saúde: ${input.health_conditions?.join(', ') || 'nenhuma'}
${input.current_weight_kg ? `- Peso: ${input.current_weight_kg}kg` : ''}
${input.height_cm ? `- Altura: ${input.height_cm}cm` : ''}
${input.age ? `- Idade: ${input.age}` : ''}
${input.gender ? `- Gênero: ${input.gender}` : ''}
Inclua: name, daily_calories, protein_g, carbs_g, fat_g, water_ml, meals, supplements, nutritionist_notes`
  )
}

export async function generateWorkoutPlan(input: UserProfile) {
  return callAI(
    `Você é um personal trainer certificado. Responda APENAS em JSON válido com a estrutura exata solicitada.`,
    `Crie um plano de treino semanal com estes dados:
- Objetivo: ${input.goal}
- Nível: ${input.fitness_level}
- Dias de treino/semana: ${input.weekly_days}
- Restrições físicas: ${input.restrictions?.join(', ') || 'nenhuma'}
${input.current_weight_kg ? `- Peso: ${input.current_weight_kg}kg` : ''}
${input.age ? `- Idade: ${input.age}` : ''}
Inclua: name, duration_weeks, methodology, sessions (com warmup, exercises, cooldown), trainer_notes`
  )
}

export async function analyzeReport(report: DailyReport) {
  return callAI(
    `Você é um coach de saúde analisando o progresso de um cliente. Responda APENAS em JSON válido.`,
    `Analise o relatório diário:
Objetivo: ${report.user_profile.goal}
Data: ${report.date}
Treino realizado: ${report.workout_completed ? 'Sim' : 'Não'}
Energia: ${report.energy_level}/5
Aderência: ${report.adherence_percent}%
Sono: ${report.sleep_hours ?? 'não informado'}h
Hidratação: ${report.water_ml ? `${report.water_ml}ml` : 'não informado'}
Inclua: overall_score, highlights, attention_points, nutrition_feedback, workout_feedback, recovery_feedback, tomorrow_tips, motivational_message, alert_level`
  )
}

export async function generateClientFeedback(report: DailyReport) {
  return callAI(
    `Você é um coach pessoal que escreve mensagens motivacionais. Responda APENAS em JSON válido.`,
    `Escreva feedback personalizado para o cliente:
Objetivo: ${report.user_profile.goal}
Aderência: ${report.adherence_percent}%
Treino feito: ${report.workout_completed ? 'Sim' : 'Não'}
Energia: ${report.energy_level}/5
Hidratação: ${report.water_ml ? `${report.water_ml}ml` : 'não informado'}
Inclua: subject, greeting, body, action_items, closing, emoji_summary`
  )
}

export async function adaptProtocol(input: AdaptationInput) {
  const avgAdherence = input.reports.reduce((sum, r) => sum + r.adherence_percent, 0) / input.reports.length
  const avgEnergy = input.reports.reduce((sum, r) => sum + r.energy_level, 0) / input.reports.length

  return callAI(
    `Você é um coach especialista em periodização. Responda APENAS em JSON válido.`,
    `Adapte o protocolo com base nas últimas ${input.reports.length} semanas:
Aderência média: ${avgAdherence.toFixed(1)}%
Energia média: ${avgEnergy.toFixed(1)}/5
Semanas no plano: ${input.weeks_on_plan}
Inclua: adaptation_reason, changes, new_calorie_target, intensity_adjustment, intensity_percent, recovery_recommendation, next_check_in_days, coach_message`
  )
}