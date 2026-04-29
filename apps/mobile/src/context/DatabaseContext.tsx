import React, { createContext, useContext } from 'react'
import { supabase, Profile, Plan, Report } from '../lib/supabase'
import { useAuth } from './AuthContext'

const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL ?? 'http://192.168.0.205:3001'

type DatabaseContextType = {
  // Profile
  saveProfile: (profile: Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>) => Promise<{ error: any }>
  loadProfile: () => Promise<{ data: Profile | null; error: any }>

  // Plans
  savePlan: (nutritionPlan: any, workoutPlan: any, aiModel: string) => Promise<{ data: Plan | null; error: any }>
  loadLatestPlan: () => Promise<{ data: Plan | null; error: any }>

  // Reports
  saveReport: (report: Omit<Report, 'id' | 'user_id' | 'created_at'>) => Promise<{ data: Report | null; error: any }>
  loadReports: (limit?: number) => Promise<{ data: Report[]; error: any }>
  loadTodayReport: () => Promise<{ data: Report | null; error: any }>

  // Adaptation
  adaptProtocol: () => Promise<{ data: any | null; error: any }>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // ═══ Profile ═══════════════════════════════════════════════

  const saveProfile = async (profile: Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        ...profile,
        updated_at: new Date().toISOString(),
      })

    return { error }
  }

  const loadProfile = async () => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return { data: data as Profile | null, error }
  }

  // ═══ Plans ════════════════════════════════════════════════

  const savePlan = async (nutritionPlan: any, workoutPlan: any, aiModel: string) => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        nutrition_plan: nutritionPlan,
        workout_plan: workoutPlan,
        ai_model: aiModel,
      })
      .select()
      .single()

    return { data: data as Plan | null, error }
  }

  const loadLatestPlan = async () => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return { data: data as Plan | null, error }
  }

  // ═══ Reports ══════════════════════════════════════════════

  const saveReport = async (report: Omit<Report, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('reports')
      .upsert({
        user_id: user.id,
        ...report,
      })
      .select()
      .single()

    return { data: data as Report | null, error }
  }

  const loadReports = async (limit = 30) => {
    if (!user) return { data: [], error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit)

    return { data: (data as Report[]) ?? [], error }
  }

  const loadTodayReport = async () => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    return { data: data as Report | null, error }
  }

  // ═══ Adaptation ═══════════════════════════════════════════

  const adaptProtocol = async () => {
    if (!user) return { data: null, error: 'Not authenticated' }

    try {
      // Busca perfil, plano atual e últimos 14 relatórios em paralelo
      const [profileResult, planResult, reportsResult] = await Promise.all([
        loadProfile(),
        loadLatestPlan(),
        loadReports(14),
      ])

      if (!profileResult.data) return { data: null, error: 'Perfil não encontrado' }
      if (!planResult.data) return { data: null, error: 'Plano não encontrado' }
      if (reportsResult.data.length < 3) return { data: null, error: 'Precisa de pelo menos 3 relatórios para adaptar o protocolo' }

      const profile = profileResult.data
      const plan = planResult.data

      // Monta o payload para o AI service
      const adaptationInput = {
        user_profile: {
          goal: profile.goal,
          fitness_level: profile.fitness_level,
          weekly_days: profile.weekly_days,
          current_weight_kg: profile.current_weight_kg,
          height_cm: profile.height_cm,
          age: profile.age,
          gender: profile.gender,
        },
        current_plan: {
          nutrition: plan.nutrition_plan,
          workout: plan.workout_plan,
        },
        reports: reportsResult.data.map(r => ({
  user_profile: {
    goal: profile.goal,
    fitness_level: profile.fitness_level,
    weekly_days: profile.weekly_days,
  },
  date: r.date,
  workout_completed: r.workout_completed,
  energy_level: r.energy_level,
  ...(r.sleep_hours != null && { sleep_hours: r.sleep_hours }),
  mood: r.mood,
  ...(r.weight_kg != null && { weight_kg: r.weight_kg }),
  ...(r.water_ml != null && { water_ml: r.water_ml }),
  adherence_percent: r.adherence_percent,
  meals_logged: [],
})),
        weeks_on_plan: Math.ceil(reportsResult.data.length / 7),
      }

    // Chama o AI service
const response = await fetch(`${AI_SERVICE_URL}/protocol/adapt`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(adaptationInput),
})

console.log('ADAPT STATUS:', response.status)
const result = await response.json()
console.log('ADAPT RESULT:', JSON.stringify(result))

if (!result.data) return { data: null, error: 'Erro na resposta da IA' }

return { 
  data: { adaptation: result.data, plan: plan }, 
  error: null 
}

    } catch (e) {
      return { data: null, error: 'Erro ao conectar com o serviço de IA' }
    }
  }

  return (
    <DatabaseContext.Provider value={{
      saveProfile,
      loadProfile,
      savePlan,
      loadLatestPlan,
      saveReport,
      loadReports,
      loadTodayReport,
      adaptProtocol,
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (!context) throw new Error('useDatabase deve ser usado dentro de DatabaseProvider')
  return context
}