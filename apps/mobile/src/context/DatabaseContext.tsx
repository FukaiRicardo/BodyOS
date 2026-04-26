import React, { createContext, useContext, useState } from 'react'
import { supabase, Profile, Plan, Report } from '../lib/supabase'
import { useAuth } from './AuthContext'

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

  return (
    <DatabaseContext.Provider value={{
      saveProfile,
      loadProfile,
      savePlan,
      loadLatestPlan,
      saveReport,
      loadReports,
      loadTodayReport,
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