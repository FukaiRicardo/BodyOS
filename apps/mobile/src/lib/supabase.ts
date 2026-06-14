import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const isWeb = Platform.OS === 'web'

export type Profile = {
  id: string
  email: string | null
  goal: string
  fitness_level: string
  weekly_days: number
  age: number | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  country: string | null
  country_code: string | null
  city: string | null
  region: string | null
  currency: string | null
  currency_symbol: string | null
  training_location: string | null
  created_at: string
  updated_at: string
}

export type Plan = {
  id: string
  user_id: string
  nutrition_plan: any
  workout_plan: any
  ai_model: string | null
  created_at: string
}

export type Report = {
  id: string
  user_id: string
  date: string
  workout_completed: boolean
  workout_notes: string | null
  energy_level: number
  sleep_hours: number | null
  mood: string | null
  weight_kg: number | null
  water_ml: number | null
  adherence_percent: number
  analysis: any
  feedback: any
  created_at: string
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb ? true : false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: -1,
    },
  },
})

export function getSupabaseClient() {
  return supabase
}
// cache-bust
