import React, { createContext, useContext } from 'react'
import { getSupabaseClient, Profile, Plan, Report } from '../lib/supabase'
import { useAuth } from './AuthContext'
import i18n from '../i18n'
import { API_CONFIG, REQUEST_TIMEOUT_MS, createAuthHeaders } from '../config/api'

type DatabaseContextType = {
  // Profile
  saveProfile: (
    profile: Omit<
      Profile,
      'id' | 'email' | 'created_at' | 'updated_at'
    >
  ) => Promise<{ error: any }>

  loadProfile: () => Promise<{
    data: Profile | null
    error: any
  }>

  // Plans
  savePlan: (
    nutritionPlan: any,
    workoutPlan: any,
    aiModel: string
  ) => Promise<{
    data: Plan | null
    error: any
  }>

  loadLatestPlan: () => Promise<{
    data: Plan | null
    error: any
  }>

  // Reports
  saveReport: (
    report: Omit<
      Report,
      'id' | 'user_id' | 'created_at'
    >
  ) => Promise<{
    data: Report | null
    error: any
  }>

  loadReports: (
    limit?: number
  ) => Promise<{
    data: Report[]
    error: any
  }>

  loadTodayReport: () => Promise<{
    data: Report | null
    error: any
  }>

  // Adaptation
  adaptProtocol: () => Promise<{
    data: any | null
    error: any
  }>
}

const DatabaseContext = createContext<
  DatabaseContextType | undefined
>(undefined)

export function DatabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, session } = useAuth()
  const supabase = getSupabaseClient()

  // ════════════════════════════════════════
  // PROFILE
  // ════════════════════════════════════════

  const saveProfile = async (
    profile: Omit<
      Profile,
      'id' | 'email' | 'created_at' | 'updated_at'
    >
  ) => {
    if (!user) {
      return { error: 'Not authenticated' }
    }

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
    if (!user) {
      return {
        data: null,
        error: 'Not authenticated',
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      data: data as Profile | null,
      error,
    }
  }

  // ════════════════════════════════════════
  // PLANS
  // ════════════════════════════════════════

  const savePlan = async (
    nutritionPlan: any,
    workoutPlan: any,
    aiModel: string
  ) => {
    if (!user) {
      return {
        data: null,
        error: 'Not authenticated',
      }
    }

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

    return {
      data: data as Plan | null,
      error,
    }
  }

  const loadLatestPlan = async () => {
    if (!user) {
      return {
        data: null,
        error: 'Not authenticated',
      }
    }

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .single()

    return {
      data: data as Plan | null,
      error,
    }
  }

  // ════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════

  const saveReport = async (
    report: Omit<
      Report,
      'id' | 'user_id' | 'created_at'
    >
  ) => {
    if (!user) {
      return {
        data: null,
        error: 'Not authenticated',
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .upsert({
        user_id: user.id,
        ...report,
      })
      .select()
      .single()

    return {
      data: data as Report | null,
      error,
    }
  }

  const loadReports = async (limit = 30) => {
    if (!user) {
      return {
        data: [],
        error: 'Not authenticated',
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('date', {
        ascending: false,
      })
      .limit(limit)

    return {
      data: (data as Report[]) ?? [],
      error,
    }
  }

  const loadTodayReport = async () => {
    if (!user) {
      return {
        data: null,
        error: 'Not authenticated',
      }
    }

    const today = new Date()
      .toISOString()
      .split('T')[0]

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    return {
      data: data as Report | null,
      error,
    }
  }

  // ════════════════════════════════════════
  // ADAPT PROTOCOL
  // ════════════════════════════════════════

  const adaptProtocol = async (): Promise<{
    data: any | null
    error: any
  }> => {

    if (!user) {
      return {
        data: null,
        error: 'Not authenticated',
      }
    }

    try {

      const [
        profileResult,
        planResult,
        reportsResult,
      ] = await Promise.all([
        loadProfile(),
        loadLatestPlan(),
        loadReports(14),
      ])

      // VALIDAÇÕES

      if (!profileResult.data) {
        return {
          data: null,
          error: 'Perfil não encontrado',
        }
      }

      if (!planResult.data) {
        return {
          data: null,
          error: 'Plano não encontrado',
        }
      }

      if (reportsResult.data.length < 3) {
        return {
          data: null,
          error:
            'Precisa de pelo menos 3 relatórios',
        }
      }

      const profile = profileResult.data
      const plan = planResult.data

      // INPUT IA — only send necessary metadata, not full plans

      const adaptationInput = {
        user_profile: {
          goal: profile.goal,
          fitness_level:
            profile.fitness_level,
          weekly_days:
            profile.weekly_days,
          current_weight_kg:
            profile.current_weight_kg,
          height_cm:
            profile.height_cm,
          age: profile.age,
          gender: profile.gender,
        },

        current_plan: {
          nutrition_session_count: plan.nutrition_plan?.meals?.length ?? 0,
          workout_session_count: plan.workout_plan?.sessions?.length ?? 0,
        },

        reports: reportsResult.data.map(
          (r) => ({
            date: r.date,
            workout_completed:
              r.workout_completed,
            energy_level:
              r.energy_level,
            adherence_percent:
              r.adherence_percent,
          })
        ),

        weeks_on_plan: Math.ceil(
          reportsResult.data.length / 7
        ),
      }

      // FETCH IA with 30s timeout

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await fetch(
          API_CONFIG.getFullUrl('protocol'),
          {
            method: 'POST',

            headers: createAuthHeaders(session?.access_token),

            body: JSON.stringify({
              ...adaptationInput,

              language:
                i18n.language.split('-')[0],
            }),

            signal: controller.signal,
          }
        )

        if (!response.ok) {
          return {
            data: null,
            error:
              'Erro ao conectar com servidor de IA',
          }
        }

        const result = await response.json()

        if (!result) {
          return {
            data: null,
            error:
              'IA não retornou dados válidos',
          }
        }

        return {
          data: result,
          error: null,
        }
      } finally {
        clearTimeout(timeout)
      }

    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return {
          data: null,
          error: 'Requisição expirou',
        }
      }

      return {
        data: null,
        error:
          'Erro ao conectar com o serviço de IA',
      }
    }
  }

  return (
    <DatabaseContext.Provider
      value={{
        saveProfile,
        loadProfile,

        savePlan,
        loadLatestPlan,

        saveReport,
        loadReports,
        loadTodayReport,

        adaptProtocol,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {

  const context =
    useContext(DatabaseContext)

  if (!context) {
    throw new Error(
      'useDatabase deve ser usado dentro de DatabaseProvider'
    )
  }

  return context
}