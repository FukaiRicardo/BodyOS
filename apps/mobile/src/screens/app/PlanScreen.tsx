import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Localization from 'expo-localization'
import { RootStackParamList } from '../../../App'
import { useDatabase } from '../../context/DatabaseContext'
import { useAuth } from '../../context/AuthContext'

type Nav = any
type Route = RouteProp<RootStackParamList, 'Plan'>

// ─────────────────────────────────────────────────────────────
// SEGURANÇA
// ─────────────────────────────────────────────────────────────

const GATEWAY_URL = (() => {
  const url = process.env.EXPO_PUBLIC_GATEWAY_URL ?? ''
  // Valida que é uma URL segura — previne open redirect / SSRF
  if (!url) return 'http://localhost:3000'
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'http://localhost:3000'
    return url.replace(/\/$/, '') // remove trailing slash
  } catch {
    return 'http://localhost:3000'
  }
})()

// Sanitiza strings vindas da API antes de exibir
function safe(value: unknown, fallback = '', maxLength = 500): string {
  if (typeof value !== 'string') return fallback
  return value.replace(/[<>]/g, '').slice(0, maxLength)
}

function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value)
  return isNaN(n) || !isFinite(n) ? fallback : Math.round(n * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

type HomeEquipment =
  | 'dumbbells'
  | 'pull_up_bar'
  | 'resistance_bands'
  | 'kettlebell'
  | 'bench'
  | 'jump_rope'
  | 'barbell'
  | 'none'

type DivisionType = 'AB' | 'ABC' | 'ABCD' | 'PPL' | 'FULL_BODY' | 'UPPER_LOWER'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const mealIcon: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🍱',
  dinner: '🌙',
  snack: '🍎',
}

const WEEK_DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday',    label: 'Segunda',  short: 'Seg' },
  { key: 'tuesday',  label: 'Terça',    short: 'Ter' },
  { key: 'wednesday',label: 'Quarta',   short: 'Qua' },
  { key: 'thursday', label: 'Quinta',   short: 'Qui' },
  { key: 'friday',   label: 'Sexta',    short: 'Sex' },
  { key: 'saturday', label: 'Sábado',   short: 'Sáb' },
  { key: 'sunday',   label: 'Domingo',  short: 'Dom' },
]

const HOME_EQUIPMENT_OPTIONS: { id: HomeEquipment; label: string; emoji: string }[] = [
  { id: 'none',             label: 'Sem equipamentos', emoji: '🤸' },
  { id: 'dumbbells',        label: 'Halteres',         emoji: '🏋️' },
  { id: 'pull_up_bar',      label: 'Barra fixa',       emoji: '🔱' },
  { id: 'resistance_bands', label: 'Elásticos',        emoji: '🔗' },
  { id: 'kettlebell',       label: 'Kettlebell',       emoji: '⚙️' },
  { id: 'bench',            label: 'Banco',            emoji: '🪑' },
  { id: 'jump_rope',        label: 'Corda',            emoji: '🪢' },
  { id: 'barbell',          label: 'Barra + anilhas',  emoji: '🏗️' },
]

const DIVISION_LABELS: Record<DivisionType, string> = {
  AB:          'Divisão A/B',
  ABC:         'Divisão A/B/C',
  ABCD:        'Divisão A/B/C/D',
  PPL:         'Push / Pull / Legs',
  FULL_BODY:   'Corpo Inteiro',
  UPPER_LOWER: 'Superior / Inferior',
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

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

  // Cardápio semanal
  const [selectedDay, setSelectedDay] = useState<DayKey>('monday')

  // Divisão de treino
  const [showDivisionModal, setShowDivisionModal] = useState(false)
  const [preferredDivision, setPreferredDivision] = useState<DivisionType | undefined>(undefined)

  // Equipamentos em casa (inline, antes de gerar)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [homeEquipment, setHomeEquipment] = useState<HomeEquipment[]>([])
  const [trainingLocation, setTrainingLocation] = useState<string>('gym')

  const dayName: Record<number, string> = {
    0: t('plan.days.sun'), 1: t('plan.days.mon'), 2: t('plan.days.tue'),
    3: t('plan.days.wed'), 4: t('plan.days.thu'), 5: t('plan.days.fri'), 6: t('plan.days.sat'),
  }

  // Carrega plano existente
  useEffect(() => {
    async function fetchExistingPlan() {
      setLoadingExisting(true)
      try {
        const { data } = await loadLatestPlan()
        if (data?.nutrition_plan && data?.workout_plan) {
          setPlan({
            nutrition: data.nutrition_plan,
            workout: data.workout_plan,
            ai_model: data.ai_model ?? undefined,
          })
        }
      } catch (e) {
        console.error('Erro ao carregar plano local:', e)
      } finally {
        setLoadingExisting(false)
      }
    }
    fetchExistingPlan()
  }, [])

  // Carrega localização de treino do perfil
  useEffect(() => {
    async function loadTrainingLocation() {
      try {
        const { data: fullProfile } = await loadProfile()
        if (fullProfile?.training_location) {
          setTrainingLocation(fullProfile.training_location)
        }
        if (fullProfile?.home_equipment) {
          const VALID_EQUIPMENT: HomeEquipment[] = [
            'dumbbells', 'pull_up_bar', 'resistance_bands',
            'kettlebell', 'bench', 'jump_rope', 'barbell', 'none',
          ]
          const safeEquipment = fullProfile.home_equipment
            .filter((e): e is HomeEquipment =>
              VALID_EQUIPMENT.includes(e as HomeEquipment)
            )
          setHomeEquipment(safeEquipment)
        }
      } catch (e) {
        console.error('Erro ao carregar perfil:', e)
      }
    }
    loadTrainingLocation()
  }, [])

  function toggleEquipment(id: HomeEquipment) {
    if (id === 'none') {
      setHomeEquipment(['none'])
      return
    }
    setHomeEquipment(prev => {
      const without = prev.filter(e => e !== 'none')
      return without.includes(id)
        ? without.filter(e => e !== id)
        : [...without, id]
    })
  }

  // Retorna as refeições do dia selecionado
  const getMealsForDay = useCallback((nutrition: any): any[] => {
    if (nutrition?.weekly_menu?.[selectedDay]?.meals) {
      return nutrition.weekly_menu[selectedDay].meals
    }
    // Fallback para estrutura antiga (meals direto)
    return nutrition?.meals ?? []
  }, [selectedDay])

  // Retorna se o dia é de treino
  const isDayTraining = useCallback((nutrition: any): boolean => {
    return nutrition?.weekly_menu?.[selectedDay]?.day_type === 'training'
  }, [selectedDay])

  async function generatePlan() {
    setLoading(true)
    setError('')

    try {
      const { data: fullProfile } = await loadProfile()
      const locales = Localization.getLocales()
      const currentLang = locales[0]?.languageCode || i18n.language?.split('-')[0] || 'pt'
      const deviceLanguage = ['pt', 'en', 'ja', 'es'].includes(currentLang) ? currentLang : 'en'
      const source = fullProfile ?? profile

      const bodyData: Record<string, unknown> = {
        goal: source?.goal ?? 'muscle_gain',
        fitness_level: source?.fitness_level ?? 'intermediate',
        weekly_days: source?.weekly_days ?? 4,
        current_weight_kg: source?.current_weight_kg ? Number(source.current_weight_kg) : undefined,
        height_cm: source?.height_cm ? Number(source.height_cm) : undefined,
        age: source?.age ? Number(source.age) : undefined,
        gender: source?.gender,
        language: deviceLanguage,
        training_location: trainingLocation,
        // Equipamentos em casa
        ...(trainingLocation === 'home' && homeEquipment.length > 0
          ? { home_equipment: homeEquipment }
          : {}),
        // Divisão preferida
        ...(preferredDivision ? { preferred_division: preferredDivision } : {}),
        location: fullProfile?.country ? {
          country: fullProfile.country,
          countryCode: fullProfile.country_code,
          city: fullProfile.city ?? undefined,
          region: fullProfile.region ?? undefined,
          currency: fullProfile.currency,
          currencySymbol: fullProfile.currency_symbol,
        } : undefined,
      }

      // Token de autorização — nunca loga
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      }

      // 1. Gera Dieta
      const dietRes = await fetch(`${GATEWAY_URL}/api/nutrition/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      })
      if (!dietRes.ok) {
        const errBody = await dietRes.json().catch(() => ({}))
        throw new Error(`Dieta: ${dietRes.status} — ${errBody?.error ?? 'Erro desconhecido'}`)
      }
      const nutritionRaw = await dietRes.json()

      // 2. Pausa anti rate-limit
      await new Promise(resolve => setTimeout(resolve, 1200))

      // 3. Gera Treino
      const workoutRes = await fetch(`${GATEWAY_URL}/api/workout/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      })
      if (!workoutRes.ok) {
        const errBody = await workoutRes.json().catch(() => ({}))
        throw new Error(`Treino: ${workoutRes.status} — ${errBody?.error ?? 'Erro desconhecido'}`)
      }
      const workoutRaw = await workoutRes.json()

      const nutritionData = nutritionRaw.data ?? nutritionRaw
      const workoutData = workoutRaw.data ?? workoutRaw

      const newPlan = { nutrition: nutritionData, workout: workoutData, ai_model: 'groq' }
      setPlan(newPlan)
      setSaving(true)
      await savePlan(newPlan.nutrition, newPlan.workout, newPlan.ai_model)
      setSaving(false)

    } catch (e: any) {
      console.error('ERRO NA GERAÇÃO:', e?.message ?? e)
      setError(t('plan.generateError') || 'Não foi possível gerar o protocolo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function formatWater(ml: number): string {
    return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`
  }

  // ─── Modais ───────────────────────────────────────────────

  const DivisionModal = () => (
    <Modal visible={showDivisionModal} transparent animationType="slide" onRequestClose={() => setShowDivisionModal(false)}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.sheetTitle}>🏋️ Escolher Divisão</Text>
          <Text style={m.sheetSubtitle}>A IA vai adaptar os treinos para esta estrutura</Text>
          {(Object.entries(DIVISION_LABELS) as [DivisionType, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[m.option, preferredDivision === key && m.optionActive]}
              onPress={() => { setPreferredDivision(key); setShowDivisionModal(false) }}
            >
              <Text style={[m.optionText, preferredDivision === key && m.optionTextActive]}>{label}</Text>
              {preferredDivision === key && <Text style={m.optionCheck}>✅</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={m.clearBtn}
            onPress={() => { setPreferredDivision(undefined); setShowDivisionModal(false) }}
          >
            <Text style={m.clearBtnText}>Deixar a IA decidir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={m.closeBtn} onPress={() => setShowDivisionModal(false)}>
            <Text style={m.closeBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  const EquipmentModal = () => (
    <Modal visible={showEquipmentModal} transparent animationType="slide" onRequestClose={() => setShowEquipmentModal(false)}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.sheetTitle}>🏠 Equipamentos em Casa</Text>
          <Text style={m.sheetSubtitle}>Selecione o que você tem disponível agora</Text>
          {HOME_EQUIPMENT_OPTIONS.map(eq => {
            const isSelected = homeEquipment.includes(eq.id)
            const isDisabled = eq.id !== 'none' && homeEquipment.includes('none')
            return (
              <TouchableOpacity
                key={eq.id}
                style={[m.option, isSelected && m.optionActive, isDisabled && m.optionDisabled]}
                onPress={() => !isDisabled && toggleEquipment(eq.id)}
                disabled={isDisabled}
              >
                <Text style={m.optionEmoji}>{eq.emoji}</Text>
                <Text style={[m.optionText, isSelected && m.optionTextActive, isDisabled && m.optionTextDisabled]}>
                  {eq.label}
                </Text>
                {isSelected && <Text style={m.optionCheck}>✓</Text>}
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity style={m.closeBtn} onPress={() => setShowEquipmentModal(false)}>
            <Text style={m.closeBtnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  // ─── Render principal ──────────────────────────────────────

  const currentMeals = plan?.nutrition ? getMealsForDay(plan.nutrition) : []
  const currentDayIsTraining = plan?.nutrition ? isDayTraining(plan.nutrition) : false
  const hasWeeklyMenu = !!plan?.nutrition?.weekly_menu

  return (
    <SafeAreaView style={s.container}>
      <DivisionModal />
      <EquipmentModal />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('plan.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs Dieta / Treino */}
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

        {/* Loading existente */}
        {loadingExisting && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00FF87" />
            <Text style={s.loadingText}>{t('plan.loadingExisting')}</Text>
          </View>
        )}

        {/* Empty state */}
        {!plan && !loading && !loadingExisting && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🤖</Text>
            <Text style={s.emptyTitle}>{t('plan.emptyTitle')}</Text>
            <Text style={s.emptyText}>{t('plan.emptyText')}</Text>

            {/* Opções antes de gerar */}
            <View style={s.preGenOptions}>

              {/* Divisão de treino */}
              <TouchableOpacity style={s.preGenBtn} onPress={() => setShowDivisionModal(true)}>
                <Text style={s.preGenBtnEmoji}>📋</Text>
                <View style={s.preGenBtnInfo}>
                  <Text style={s.preGenBtnTitle}>Divisão de Treino</Text>
                  <Text style={s.preGenBtnValue}>
                    {preferredDivision ? DIVISION_LABELS[preferredDivision] : 'IA vai decidir automaticamente'}
                  </Text>
                </View>
                <Text style={s.preGenBtnArrow}>›</Text>
              </TouchableOpacity>

              {/* Equipamentos em casa — só aparece se for home */}
              {trainingLocation === 'home' && (
                <TouchableOpacity style={s.preGenBtn} onPress={() => setShowEquipmentModal(true)}>
                  <Text style={s.preGenBtnEmoji}>🏠</Text>
                  <View style={s.preGenBtnInfo}>
                    <Text style={s.preGenBtnTitle}>Equipamentos em Casa</Text>
                    <Text style={s.preGenBtnValue}>
                      {homeEquipment.length === 0
                        ? 'Selecionar equipamentos'
                        : homeEquipment.includes('none')
                          ? 'Sem equipamentos'
                          : `${homeEquipment.length} item(s) selecionado(s)`}
                    </Text>
                  </View>
                  <Text style={s.preGenBtnArrow}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Loading geração */}
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

        {/* ─── NUTRIÇÃO ─────────────────────────────────── */}
        {plan && tab === 'nutrition' && plan.nutrition && (
          <View style={s.content}>

            {/* Macros */}
            <View style={s.macroRow}>
              {[
                { label: t('plan.calories'), value: safeNum(plan.nutrition.calories_training_day ?? plan.nutrition.calories), unit: 'kcal', color: '#00FF87' },
                { label: t('plan.protein'), value: safeNum(plan.nutrition.protein), unit: 'g', color: '#60A5FA' },
                { label: t('plan.carbs'), value: safeNum(plan.nutrition.carbs), unit: 'g', color: '#F59E0B' },
                { label: t('plan.fat'), value: safeNum(plan.nutrition.fat), unit: 'g', color: '#F87171' },
              ].map((m, i) => (
                <View key={i} style={s.macroCard}>
                  <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.macroUnit}>{m.unit}</Text>
                  <Text style={s.macroLabel} numberOfLines={1} adjustsFontSizeToFit>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Hidratação */}
            {!!plan.nutrition.water_ml && (
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

            {/* Seletor de dia da semana — só aparece se tiver weekly_menu */}
            {hasWeeklyMenu && (
              <View style={s.weekSelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.weekScroll}>
                  {WEEK_DAYS.map(day => {
                    const dayData = plan.nutrition.weekly_menu?.[day.key]
                    const isTraining = dayData?.day_type === 'training'
                    const isSelected = selectedDay === day.key
                    return (
                      <TouchableOpacity
                        key={day.key}
                        style={[s.dayPill, isSelected && s.dayPillActive]}
                        onPress={() => setSelectedDay(day.key)}
                      >
                        <Text style={[s.dayPillText, isSelected && s.dayPillTextActive]}>{day.short}</Text>
                        <Text style={s.dayPillDot}>{isTraining ? '🏋️' : '😴'}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>

                {/* Badge do tipo de dia */}
                <View style={[s.dayTypeBadge, { backgroundColor: currentDayIsTraining ? '#0D2E1A' : '#1A1A2E' }]}>
                  <Text style={[s.dayTypeText, { color: currentDayIsTraining ? '#00FF87' : '#A0A0B0' }]}>
                    {currentDayIsTraining ? '🏋️ Dia de Treino' : '😴 Dia de Descanso'}
                  </Text>
                  {currentDayIsTraining && plan.nutrition.calories_training_day && (
                    <Text style={s.dayTypeCalories}>{plan.nutrition.calories_training_day} kcal</Text>
                  )}
                  {!currentDayIsTraining && plan.nutrition.calories_rest_day && (
                    <Text style={s.dayTypeCalories}>{plan.nutrition.calories_rest_day} kcal</Text>
                  )}
                </View>
              </View>
            )}

            {/* Refeições */}
            <Text style={s.sectionTitle}>
              {hasWeeklyMenu
                ? `🍽️ Refeições — ${WEEK_DAYS.find(d => d.key === selectedDay)?.label}`
                : t('plan.meals')}
            </Text>

            {currentMeals.length === 0 && (
              <View style={s.emptyDay}>
                <Text style={s.emptyDayText}>Nenhuma refeição para este dia</Text>
              </View>
            )}

            {currentMeals.map((meal: any, i: number) => (
              <View key={i} style={s.mealCard}>
                <View style={s.mealHeader}>
                  <Text style={s.mealIcon}>{mealIcon[meal.meal_type] ?? '🍽️'}</Text>
                  <View style={s.mealInfo}>
                    <Text style={s.mealName}>{safe(meal.name)}</Text>
                    <Text style={s.mealTime}>{safe(meal.time_suggestion)} · {safeNum(meal.total_calories)} kcal</Text>
                  </View>
                </View>

                {/* Alimentos */}
                {meal.foods?.map((food: any, j: number) => (
                  <View key={j} style={s.foodRow}>
                    <View style={s.foodNameWrap}>
                      <Text style={s.foodName}>{safe(food.name)}</Text>
                      {food.unit_description && (
                        <Text style={s.foodUnit}>{safe(food.unit_description)}</Text>
                      )}
                    </View>
                    <Text style={s.foodDetail}>{safeNum(food.quantity_g)}g · {safeNum(food.calories)} kcal</Text>
                  </View>
                ))}

                {/* Opções de Proteína */}
                {meal.protein_options?.length > 0 && (
                  <View style={s.proteinSection}>
                    <Text style={s.proteinTitle}>💪 Opções de Proteína</Text>
                    {meal.protein_options.map((p: any, j: number) => (
                      <View key={j} style={s.proteinRow}>
                        <View style={s.foodNameWrap}>
                          <Text style={s.proteinName}>{safe(p.name)}</Text>
                          {p.unit_description && <Text style={s.foodUnit}>{safe(p.unit_description)}</Text>}
                        </View>
                        <Text style={s.proteinDetail}>{safeNum(p.quantity_g)}g · {safeNum(p.calories)} kcal · {safeNum(p.protein_g)}g prot</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Alternativas */}
                {meal.food_alternatives?.length > 0 && (
                  <View style={s.altSection}>
                    <Text style={s.altTitle}>🔄 Alternativas</Text>
                    {meal.food_alternatives.map((alt: any, j: number) => (
                      <View key={j} style={s.altRow}>
                        <View style={s.foodNameWrap}>
                          <Text style={s.altName}>{safe(alt.food_name)}</Text>
                          <Text style={s.foodUnit}>substitui: {safe(alt.replaces)} · {safe(alt.reason)}</Text>
                        </View>
                        <Text style={s.altDetail}>{safeNum(alt.quantity_g)}g · {safeNum(alt.calories)} kcal</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Custo estimado */}
                {meal.estimated_cost != null && (
                  <Text style={s.mealCost}>
                    💰 {safe(plan.nutrition.currency_symbol)}{Math.round(safeNum(meal.estimated_cost))}
                  </Text>
                )}
              </View>
            ))}

            {/* Dica local */}
            {plan.nutrition.local_food_tip && (
              <View style={s.tipCard}>
                <Text style={s.tipTitle}>🌍 Dica local</Text>
                <Text style={s.tipText}>{safe(plan.nutrition.local_food_tip, '', 500)}</Text>
              </View>
            )}

            {/* Notas do nutricionista */}
            {plan.nutrition.nutritionist_notes && (
              <View style={s.notesCard}>
                <Text style={s.notesTitle}>📋 Notas do Nutricionista</Text>
                <Text style={s.notesText}>{safe(plan.nutrition.nutritionist_notes, '', 1000)}</Text>
              </View>
            )}

            {/* Suplementos */}
            {plan.nutrition.supplements?.length > 0 && (
              <>
                <Text style={s.sectionTitle}>{t('plan.supplements')}</Text>
                {plan.nutrition.supplements.map((sup: any, i: number) => (
                  <View key={i} style={s.supCard}>
                    <View style={s.supHeader}>
                      <Text style={s.supName}>💊 {safe(sup.name)}</Text>
                      {sup.priority && (
                        <View style={[s.supBadge, {
                          backgroundColor: sup.priority === 'essential' ? '#0D2E1A' : sup.priority === 'recommended' ? '#0D1A2E' : '#1A1A2E'
                        }]}>
                          <Text style={[s.supBadgeText, {
                            color: sup.priority === 'essential' ? '#00FF87' : sup.priority === 'recommended' ? '#60A5FA' : '#A0A0B0'
                          }]}>
                            {sup.priority === 'essential' ? '⭐ Essencial' : sup.priority === 'recommended' ? '👍 Recomendado' : '💡 Opcional'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.supDetail}>{safe(sup.dose)}</Text>
                    <Text style={s.supTiming}>⏰ {safe(sup.timing)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ─── TREINO ───────────────────────────────────── */}
        {plan && tab === 'workout' && plan.workout && (
          <View style={s.content}>

            {/* Header do plano */}
            <View style={s.workoutHeader}>
              <Text style={s.workoutName}>{safe(plan.workout.name)}</Text>
              <View style={s.workoutMetaRow}>
                {plan.workout.division_type && (
                  <View style={s.divisionBadge}>
                    <Text style={s.divisionBadgeText}>
                      {DIVISION_LABELS[plan.workout.division_type as DivisionType] ?? safe(plan.workout.division_type)}
                    </Text>
                  </View>
                )}
                <Text style={s.workoutMeta}>{plan.workout.duration_weeks} {t('plan.weeks')}</Text>
              </View>
              {plan.workout.methodology && (
                <Text style={s.workoutMethodology}>{safe(plan.workout.methodology, '', 300)}</Text>
              )}
            </View>

            {/* Estrutura semanal */}
            {plan.workout.weekly_structure && (
              <View style={s.weeklyStructureCard}>
                <Text style={s.weeklyStructureTitle}>📅 Estrutura Semanal</Text>
                <Text style={s.weeklyStructureText}>{safe(plan.workout.weekly_structure, '', 400)}</Text>
              </View>
            )}

            {/* Botão para alterar divisão */}
            <TouchableOpacity style={s.changeDivisionBtn} onPress={() => setShowDivisionModal(true)}>
              <Text style={s.changeDivisionText}>🔄 Alterar divisão de treino</Text>
            </TouchableOpacity>

            {/* Sessions */}
            {plan.workout.sessions?.map((session: any, i: number) => (
              <View key={i} style={s.sessionCard}>
                <View style={s.sessionHeader}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayText}>{dayName[session.day_of_week] ?? '?'}</Text>
                  </View>
                  <View style={s.sessionTitleWrap}>
                    {session.label && (
                      <View style={s.sessionLabelBadge}>
                        <Text style={s.sessionLabelText}>{safe(session.label)}</Text>
                      </View>
                    )}
                    <Text style={s.sessionName}>{safe(session.name)}</Text>
                    <Text style={s.sessionMeta}>{safe(session.focus)} · {safeNum(session.estimated_minutes, 60)} {t('plan.min')}</Text>
                  </View>
                </View>

                {session.exercises?.map((ex: any, j: number) => (
                  <View key={j} style={s.exerciseRow}>
                    <Text style={s.exerciseName}>{safe(ex.name)}</Text>
                    <Text style={s.exerciseDetail}>{ex.sets}x{safe(ex.reps)} · {safeNum(ex.rest_seconds, 60)}s {t('plan.rest')}</Text>
                    {ex.technique_tip ? <Text style={s.exerciseTip}>💡 {safe(ex.technique_tip, '', 200)}</Text> : null}
                    {ex.progression_tip ? <Text style={s.progressionTip}>📈 {safe(ex.progression_tip, '', 200)}</Text> : null}
                  </View>
                ))}
              </View>
            ))}

            {/* Modelo de progressão */}
            {plan.workout.progression_model && (
              <View style={s.progressionCard}>
                <Text style={s.progressionTitle}>📈 Modelo de Progressão</Text>
                <Text style={s.progressionText}>{safe(plan.workout.progression_model, '', 400)}</Text>
              </View>
            )}

            {/* Notas do trainer */}
            {(plan.workout.trainer_notes || plan.workout.notes) && (
              <View style={s.notesCard}>
                <Text style={s.notesTitle}>🏆 {t('plan.trainerNotes')}</Text>
                <Text style={s.notesText}>{safe(plan.workout.trainer_notes ?? plan.workout.notes, '', 1000)}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {!loading && !loadingExisting && (
        <View style={s.footer}>
          {plan && (
            <View style={s.footerOptions}>
              <TouchableOpacity style={s.footerOptBtn} onPress={() => setShowDivisionModal(true)}>
                <Text style={s.footerOptText}>📋 Divisão</Text>
              </TouchableOpacity>
              {trainingLocation === 'home' && (
                <TouchableOpacity style={s.footerOptBtn} onPress={() => setShowEquipmentModal(true)}>
                  <Text style={s.footerOptText}>🏠 Equip.</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <TouchableOpacity style={s.btn} onPress={generatePlan}>
            <Text style={s.btnText}>🤖 {plan ? t('plan.regenerate') : t('plan.generate')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  back: { color: '#00FF87', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  tabs: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#00FF87' },
  tabText: { color: '#A0A0B0', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#0A0A0F' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  emptyText: { fontSize: 16, color: '#A0A0B0', textAlign: 'center', lineHeight: 24 },
  emptyDay: { alignItems: 'center', padding: 32 },
  emptyDayText: { color: '#555570', fontSize: 14 },
  loadingBox: { alignItems: 'center', paddingTop: 40, gap: 24, marginBottom: 40 },
  loadingText: { color: '#A0A0B0', fontSize: 16, textAlign: 'center' },
  savingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: '#0D2E1A' },
  savingText: { color: '#00FF87', fontSize: 13 },
  error: { color: '#FF6B6B', textAlign: 'center', marginTop: 32, fontSize: 14, paddingHorizontal: 24 },

  // Pre-gen options
  preGenOptions: { width: '100%', gap: 10, marginTop: 8 },
  preGenBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#2A2A4E' },
  preGenBtnEmoji: { fontSize: 24 },
  preGenBtnInfo: { flex: 1 },
  preGenBtnTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  preGenBtnValue: { color: '#A0A0B0', fontSize: 12, marginTop: 2 },
  preGenBtnArrow: { color: '#A0A0B0', fontSize: 20 },

  // Macros
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  macroCard: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 8, alignItems: 'center', minHeight: 70 },
  macroValue: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 9, color: '#A0A0B0' },
  macroLabel: { fontSize: 9, color: '#A0A0B0', marginTop: 2, textAlign: 'center' },

  // Hidratação
  hydrationCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D1A2E', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: '#60A5FA' },
  hydrationEmoji: { fontSize: 32 },
  hydrationTitle: { fontSize: 13, color: '#A0A0B0', marginBottom: 4 },
  hydrationAmount: { fontSize: 20, fontWeight: '800', color: '#60A5FA' },
  hydrationSub: { fontSize: 13, color: '#A0A0B0', fontWeight: '400' },

  // Seletor de dias
  weekSelector: { gap: 10 },
  weekScroll: { gap: 8, paddingVertical: 4 },
  dayPill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1A1A2E', borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'transparent', minWidth: 52 },
  dayPillActive: { backgroundColor: '#0D2E1A', borderColor: '#00FF87' },
  dayPillText: { color: '#A0A0B0', fontSize: 13, fontWeight: '600' },
  dayPillTextActive: { color: '#00FF87' },
  dayPillDot: { fontSize: 10, marginTop: 2 },
  dayTypeBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 10, paddingHorizontal: 14 },
  dayTypeText: { fontSize: 13, fontWeight: '600' },
  dayTypeCalories: { color: '#A0A0B0', fontSize: 13 },

  // Seções
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },

  // Refeições
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

  // Proteínas e alternativas
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

  // Cards de dica e notas
  tipCard: { backgroundColor: '#0D1A2E', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 6 },
  tipText: { fontSize: 13, color: '#A0A0B0', lineHeight: 20 },
  notesCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: '#00FF87' },
  notesTitle: { fontSize: 14, fontWeight: '700', color: '#00FF87', marginBottom: 8 },
  notesText: { fontSize: 14, color: '#A0A0B0', lineHeight: 22 },

  // Suplementos
  supCard: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, gap: 6 },
  supHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supName: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  supBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  supBadgeText: { fontSize: 11, fontWeight: '600' },
  supDetail: { fontSize: 13, color: '#A0A0B0' },
  supTiming: { fontSize: 12, color: '#555570', fontStyle: 'italic' },

  // Treino
  workoutHeader: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 8 },
  workoutName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  workoutMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workoutMeta: { fontSize: 13, color: '#A0A0B0' },
  workoutMethodology: { fontSize: 13, color: '#A0A0B0', lineHeight: 20 },
  divisionBadge: { backgroundColor: '#0D2E1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  divisionBadgeText: { color: '#00FF87', fontSize: 12, fontWeight: '600' },
  weeklyStructureCard: { backgroundColor: '#0D1A2E', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#60A5FA' },
  weeklyStructureTitle: { fontSize: 13, fontWeight: '700', color: '#60A5FA', marginBottom: 6 },
  weeklyStructureText: { fontSize: 13, color: '#A0A0B0', lineHeight: 20 },
  changeDivisionBtn: { alignSelf: 'flex-end', padding: 8 },
  changeDivisionText: { color: '#555570', fontSize: 13 },
  sessionCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 10 },
  sessionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  dayBadge: { backgroundColor: '#00FF87', borderRadius: 8, padding: 8, minWidth: 44, alignItems: 'center' },
  dayText: { color: '#0A0A0F', fontWeight: '800', fontSize: 13 },
  sessionTitleWrap: { flex: 1, gap: 4 },
  sessionLabelBadge: { backgroundColor: '#0D2E1A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  sessionLabelText: { color: '#00FF87', fontSize: 11, fontWeight: '700' },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sessionMeta: { fontSize: 13, color: '#A0A0B0' },
  exerciseRow: { borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 10, gap: 4 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  exerciseDetail: { fontSize: 13, color: '#00FF87' },
  exerciseTip: { fontSize: 12, color: '#A0A0B0' },
  progressionTip: { fontSize: 12, color: '#60A5FA' },
  progressionCard: { backgroundColor: '#0D1A2E', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#60A5FA' },
  progressionTitle: { fontSize: 13, fontWeight: '700', color: '#60A5FA', marginBottom: 6 },
  progressionText: { fontSize: 13, color: '#A0A0B0', lineHeight: 20 },

  // Footer
  footer: { padding: 24, gap: 10 },
  footerOptions: { flexDirection: 'row', gap: 10 },
  footerOptBtn: { flex: 1, backgroundColor: '#1A1A2E', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  footerOptText: { color: '#A0A0B0', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#00FF87', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
})

// ─── Styles do Modal ──────────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111120', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 10, maxHeight: '80%' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: '#A0A0B0', marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: 'transparent' },
  optionActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  optionDisabled: { opacity: 0.4 },
  optionEmoji: { fontSize: 20 },
  optionText: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  optionTextActive: { color: '#00FF87' },
  optionTextDisabled: { color: '#444460' },
  optionCheck: { fontSize: 16 },
  clearBtn: { alignItems: 'center', padding: 12, marginTop: 4 },
  clearBtnText: { color: '#555570', fontSize: 14 },
  closeBtn: { backgroundColor: '#00FF87', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
})
