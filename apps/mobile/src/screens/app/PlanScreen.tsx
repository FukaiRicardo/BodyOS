import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Localization from 'expo-localization'
import { RootStackParamList } from '../../../App'
import { useDatabase } from '../../context/DatabaseContext'
import { useAuth } from '../../context/AuthContext'

type Nav = any
type Route = RouteProp<RootStackParamList, 'Plan'>

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL ?? 'http://192.168.0.205:3000'

const mealIcon: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍽️',
  dinner: '🌙',
  snack: '🥜',
}

export default function PlanScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const profile = route.params?.profile
  const { savePlan, loadLatestPlan, loadProfile } = useDatabase()
  const { t, i18n } = useTranslation()
  const { session } = useAuth()

  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<{ nutrition?: any; workout?: any; ai_model?: string } | null>(null)
  const [tab, setTab] = useState<'nutrition' | 'workout'>('nutrition')
  const [error, setError] = useState('')

  const dayName: Record<number, string> = {
    0: t('plan.days.sun'), 1: t('plan.days.mon'), 2: t('plan.days.tue'),
    3: t('plan.days.wed'), 4: t('plan.days.thu'), 5: t('plan.days.fri'), 6: t('plan.days.sat'),
  }

  useEffect(() => {
    async function fetchExistingPlan() {
      setLoadingExisting(true)
      try {
        const { data } = await loadLatestPlan()
        if (data && data.nutrition_plan && data.workout_plan) {
          setPlan({
            nutrition: data.nutrition_plan,
            workout: data.workout_plan,
            ai_model: data.ai_model ?? undefined,
          })
        }
      } catch (e) {
        console.error("Erro ao carregar plano local:", e)
      } finally {
        setLoadingExisting(false)
      }
    }
    fetchExistingPlan()
  }, [])

  async function generatePlan() {
  setLoading(true)
  setError('')

  const { data: fullProfile } = await loadProfile()

  const locales = Localization.getLocales()
  const currentLang = locales[0]?.languageCode || i18n.language?.split('-')[0] || 'pt'
  const deviceLanguage = ['pt', 'en', 'ja', 'es'].includes(currentLang) ? currentLang : 'en'

  // ✅ Usa fullProfile para tudo, com fallback para route.params como segurança
  const source = fullProfile ?? profile

const bodyData = {
  goal: source?.goal ?? 'muscle_gain',
  fitness_level: source?.fitness_level ?? 'intermediate',
  weekly_days: source?.weekly_days ?? 4,
  current_weight_kg: source?.current_weight_kg ? Number(source.current_weight_kg) : undefined,
  height_cm: source?.height_cm ? Number(source.height_cm) : undefined,
  age: source?.age ? Number(source.age) : undefined,
  gender: source?.gender,
  language: deviceLanguage,
  training_location: source?.training_location ?? 'gym',  
  location: fullProfile ? {
    country: fullProfile.country,
    countryCode: fullProfile.country_code,
    city: fullProfile.city,
    region: fullProfile.region,
    currency: fullProfile.currency,
    currencySymbol: fullProfile.currency_symbol,
  } : undefined,
}

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`
    }

    try {
      // 1. Gera Dieta
      const dietRes = await fetch(`${GATEWAY_URL}/api/nutrition/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      })
      if (!dietRes.ok) throw new Error(`Erro na dieta: ${dietRes.status}`)
      const nutritionRaw = await dietRes.json()

      // 2. Pausa para evitar Rate Limit
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 3. Gera Treino
      const workoutRes = await fetch(`${GATEWAY_URL}/api/workout/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      })
      if (!workoutRes.ok) throw new Error(`Erro no treino: ${workoutRes.status}`)
      const workoutRaw = await workoutRes.json()

      const nutritionData = nutritionRaw.data ?? nutritionRaw
      const workoutData = workoutRaw.data ?? workoutRaw

      const newPlan = {
        nutrition: nutritionData,
        workout: workoutData,
        ai_model: 'groq',
      }

      setPlan(newPlan)
      setSaving(true)
      await savePlan(newPlan.nutrition, newPlan.workout, newPlan.ai_model)
      setSaving(false)

    } catch (e) {
      console.error("ERRO NA GERAÇÃO:", e)
      setError(t('plan.generateError') || "Erro ao conectar com a IA. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function formatWater(ml: number): string {
    return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('plan.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {plan && (
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === 'nutrition' && s.tabActive]}
            onPress={() => setTab('nutrition')}
          >
            <Text style={[s.tabText, tab === 'nutrition' && s.tabTextActive]}>🥗 {t('plan.diet')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'workout' && s.tabActive]}
            onPress={() => setTab('workout')}
          >
            <Text style={[s.tabText, tab === 'workout' && s.tabTextActive]}>🏋️ {t('plan.training')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {loadingExisting && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00FF87" />
            <Text style={s.loadingText}>{t('plan.loadingExisting')}</Text>
          </View>
        )}

        {!plan && !loading && !loadingExisting && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🤖</Text>
            <Text style={s.emptyTitle}>{t('plan.emptyTitle')}</Text>
            <Text style={s.emptyText}>{t('plan.emptyText')}</Text>
          </View>
        )}

        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00FF87" />
            <Text style={s.loadingText}>{t('plan.generating')}</Text>
          </View>
        )}

        {saving && (
          <View style={s.savingBanner}>
            <ActivityIndicator size="small" color="#00FF87" />
            <Text style={s.savingText}>{t('plan.saving')}</Text>
          </View>
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}

        {plan && tab === 'nutrition' && plan.nutrition && (
          <View style={s.content}>
            <View style={s.macroRow}>
              {[
                { label: t('plan.calories'), value: plan.nutrition.calories || plan.nutrition.daily_calories || 0, unit: 'kcal', color: '#00FF87' },
                { label: t('plan.protein'), value: plan.nutrition.protein || plan.nutrition.protein_g || 0, unit: 'g', color: '#60A5FA' },
                { label: t('plan.carbs'), value: plan.nutrition.carbs || plan.nutrition.carbs_g || 0, unit: 'g', color: '#F59E0B' },
                { label: t('plan.fat'), value: plan.nutrition.fat || plan.nutrition.fat_g || 0, unit: 'g', color: '#F87171' },
              ].map((m, i) => (
                <View key={i} style={s.macroCard}>
                  <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.macroUnit}>{m.unit}</Text>
                  <Text style={s.macroLabel} numberOfLines={1} adjustsFontSizeToFit>{m.label}</Text>
                </View>
              ))}
            </View>

            {plan.nutrition.water_ml && (
              <View style={s.hydrationCard}>
                <Text style={s.hydrationEmoji}>💧</Text>
                <View>
                  <Text style={s.hydrationTitle}>{t('plan.hydrationTitle')}</Text>
                  <Text style={s.hydrationAmount}>
                    {formatWater(plan.nutrition.water_ml)}
                    <Text style={s.hydrationSub}> ({plan.nutrition.water_ml}ml)</Text>
                  </Text>
                </View>
              </View>
            )}

            <Text style={s.sectionTitle}>{t('plan.meals')}</Text>
            {plan.nutrition.meals?.map((meal: any, i: number) => (
              <View key={i} style={s.mealCard}>
                <View style={s.mealHeader}>
                  <Text style={s.mealIcon}>{mealIcon[meal.meal_type] ?? '🍴'}</Text>
                  <View style={s.mealInfo}>
                    <Text style={s.mealName}>{meal.name}</Text>
                    <Text style={s.mealTime}>{meal.time_suggestion} · {meal.total_calories || 0} kcal</Text>
                  </View>
                </View>
                {meal.foods?.map((food: any, j: number) => (
                  <View key={j} style={s.foodRow}>
                    <View style={s.foodNameWrap}>
                      <Text style={s.foodName}>{food.name}</Text>
                      {food.unit_description && (
                        <Text style={s.foodUnit}>{food.unit_description}</Text>
                      )}
                    </View>
                    <Text style={s.foodDetail}>{food.quantity_g || food.quantity}g · {food.calories} kcal</Text>
                  </View>
                ))}
               
{meal.protein_options?.length > 0 && (
  <View style={s.proteinSection}>
    <Text style={s.proteinTitle}>💪 Opções de Proteína</Text>
    {meal.protein_options.map((p: any, j: number) => (
      <View key={j} style={s.proteinRow}>
        <View style={s.foodNameWrap}>
          <Text style={s.proteinName}>{p.name}</Text>
          {p.unit_description && (
            <Text style={s.foodUnit}>{p.unit_description}</Text>
          )}
        </View>
        <Text style={s.proteinDetail}>{p.quantity_g}g · {p.calories} kcal · {p.protein_g}g prot</Text>
      </View>
    ))}
  </View>
)}
{meal.food_alternatives?.length > 0 && (
  <View style={s.altSection}>
    <Text style={s.altTitle}>🔄 Alternativas</Text>
    {meal.food_alternatives.map((alt: any, j: number) => (
      <View key={j} style={s.altRow}>
        <View style={s.foodNameWrap}>
          <Text style={s.altName}>{alt.food_name}</Text>
          <Text style={s.foodUnit}>substitui: {alt.replaces} · {alt.reason}</Text>
        </View>
        <Text style={s.altDetail}>{alt.quantity_g}g · {alt.calories} kcal</Text>
      </View>
    ))}
  </View>
)}


            
                {meal.estimated_cost != null && (
                  <Text style={s.mealCost}>
                    💰 {plan.nutrition.currency_symbol ?? ''}{Math.round(meal.estimated_cost)}
                  </Text>
                )}
              </View>
            ))}

            {plan.nutrition.local_food_tip && (
              <View style={s.tipCard}>
                <Text style={s.tipTitle}>🌍 Dica local</Text>
                <Text style={s.tipText}>{plan.nutrition.local_food_tip}</Text>
              </View>
            )}

            {plan.nutrition.supplements?.length > 0 && (
              <>
                <Text style={s.sectionTitle}>{t('plan.supplements')}</Text>
                {plan.nutrition.supplements.map((sup: any, i: number) => (
                  <View key={i} style={s.supRow}>
                    <Text style={s.supName}>💊 {sup.name}</Text>
                    <Text style={s.supDetail}>{sup.dose} · {sup.timing}</Text>
                  </View>
                ))}
              </>
            )}

            {(plan.nutrition.nutritionist_notes || plan.nutrition.notes) && (
              <View style={s.notesCard}>
                <Text style={s.notesTitle}>📋 {t('plan.nutritionistNotes')}</Text>
                <Text style={s.notesText}>{plan.nutrition.nutritionist_notes || plan.nutrition.notes}</Text>
              </View>
            )}
          </View>
        )}

        {plan && tab === 'workout' && plan.workout && (
          <View style={s.content}>
            <View style={s.workoutHeader}>
              <Text style={s.workoutName}>{plan.workout.name}</Text>
              <Text style={s.workoutMeta}>{plan.workout.duration_weeks} {t('plan.weeks')} · {plan.workout.methodology}</Text>
            </View>

            {plan.workout.sessions?.map((session: any, i: number) => (
              <View key={i} style={s.sessionCard}>
                <View style={s.sessionHeader}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayText}>{dayName[session.day_of_week] || '?'}</Text>
                  </View>
                  <View>
                    <Text style={s.sessionName}>{session.name}</Text>
                    <Text style={s.sessionMeta}>{session.focus} · {session.estimated_minutes || 60} {t('plan.min')}</Text>
                  </View>
                </View>
                {session.exercises?.map((ex: any, j: number) => (
                  <View key={j} style={s.exerciseRow}>
                    <Text style={s.exerciseName}>{ex.name}</Text>
                    <Text style={s.exerciseDetail}>{ex.sets}x{ex.reps} · {ex.rest_seconds || 60}s {t('plan.rest')}</Text>
                    {ex.technique_tip ? <Text style={s.exerciseTip}>💡 {ex.technique_tip}</Text> : null}
                  </View>
                ))}
              </View>
            ))}

            {(plan.workout.trainer_notes || plan.workout.notes) && (
              <View style={s.notesCard}>
                <Text style={s.notesTitle}>📋 {t('plan.trainerNotes')}</Text>
                <Text style={s.notesText}>{plan.workout.trainer_notes || plan.workout.notes}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {!loading && !loadingExisting && (
        <View style={s.footer}>
          <TouchableOpacity style={s.btn} onPress={generatePlan}>
            <Text style={s.btnText}>{plan ? t('plan.regenerate') : t('plan.generate')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  back: { color: '#00FF87', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  tabs: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#00FF87' },
  tabText: { color: '#A0A0B0', fontWeight: '600' },
  tabTextActive: { color: '#0A0A0F' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  emptyText: { fontSize: 16, color: '#A0A0B0', textAlign: 'center', lineHeight: 24 },
 loadingBox: { alignItems: 'center', paddingTop: 80, gap: 24, marginBottom: 40 },
  loadingText: { color: '#A0A0B0', fontSize: 16, textAlign: 'center' },
  savingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: '#0D2E1A' },
  savingText: { color: '#00FF87', fontSize: 13 },
  error: { color: '#FF6B6B', textAlign: 'center', marginTop: 32, fontSize: 14, paddingHorizontal: 24 },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  macroCard: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 8, alignItems: 'center', minHeight: 70 },
  macroValue: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 9, color: '#A0A0B0' },
  macroLabel: { fontSize: 9, color: '#A0A0B0', marginTop: 2, textAlign: 'center' },
  hydrationCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D1A2E', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: '#60A5FA' },
  hydrationEmoji: { fontSize: 32 },
  hydrationTitle: { fontSize: 13, color: '#A0A0B0', marginBottom: 4 },
  hydrationAmount: { fontSize: 20, fontWeight: '800', color: '#60A5FA' },
  hydrationSub: { fontSize: 13, color: '#A0A0B0', fontWeight: '400' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  mealCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 8 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  mealIcon: { fontSize: 28 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  mealTime: { fontSize: 13, color: '#A0A0B0', marginTop: 2 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#2A2A3E' },
  foodNameWrap: { flex: 1, paddingLeft: 4, gap: 2 },
  foodName: { fontSize: 13, color: '#FFFFFF', flexWrap: 'wrap' },
  foodUnit: { fontSize: 11, color: '#555570', fontStyle: 'italic' },
  foodDetail: { fontSize: 13, color: '#A0A0B0' },
  mealCost: { fontSize: 12, color: '#00FF87', marginTop: 4, opacity: 0.7 },
  tipCard: { backgroundColor: '#0D1A2E', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 6 },
  tipText: { fontSize: 13, color: '#A0A0B0', lineHeight: 20 },
  supRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1A1A2E', padding: 14, borderRadius: 12 },
  supName: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  supDetail: { fontSize: 13, color: '#A0A0B0' },
  notesCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: '#00FF87' },
  notesTitle: { fontSize: 14, fontWeight: '700', color: '#00FF87', marginBottom: 8 },
  notesText: { fontSize: 14, color: '#A0A0B0', lineHeight: 22 },
  workoutHeader: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 4 },
  workoutName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  workoutMeta: { fontSize: 13, color: '#A0A0B0', marginTop: 4 },
  sessionCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 10 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  dayBadge: { backgroundColor: '#00FF87', borderRadius: 8, padding: 8, minWidth: 44, alignItems: 'center' },
  dayText: { color: '#0A0A0F', fontWeight: '800', fontSize: 13 },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sessionMeta: { fontSize: 13, color: '#A0A0B0', marginTop: 2 },
  exerciseRow: { borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 10, gap: 4 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  exerciseDetail: { fontSize: 13, color: '#00FF87' },
  exerciseTip: { fontSize: 12, color: '#A0A0B0' },
  footer: { padding: 24 },
  btn: { backgroundColor: '#00FF87', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
  proteinSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 8, gap: 6 },
proteinTitle: { fontSize: 12, fontWeight: '700', color: '#00FF87', marginBottom: 4 },
proteinRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4 },
proteinName: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
proteinDetail: { fontSize: 12, color: '#60A5FA' },
altSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 8, gap: 6 },
altTitle: { fontSize: 12, fontWeight: '700', color: '#F59E0B', marginBottom: 4 },
altRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4 },
altName: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
altDetail: { fontSize: 12, color: '#F59E0B' },
})
