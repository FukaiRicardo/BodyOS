// Tela de plano gerado pela IA — exibe dieta, treino e hidratação mínima
// Tabs separadas para nutrição e treino evitam scroll excessivo em tela única
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../App'

type Nav = any
type Route = RouteProp<RootStackParamList, 'Plan'>

const AI_SERVICE_URL = 'http://192.168.0.205:3001'

// Ícones por tipo de refeição — mapeamento visual para facilitar identificação rápida
const mealIcon: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

// Nome dos dias da semana em PT-BR indexado por número (0 = domingo)
const dayName: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

export default function PlanScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const profile = route.params?.profile

  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<{ nutrition?: any; workout?: any } | null>(null)
  const [tab, setTab] = useState<'nutrition' | 'workout'>('nutrition')
  const [error, setError] = useState('')

  // Gera plano usando os dados reais do perfil preenchido no onboarding
  // Chamadas paralelas para nutrição e treino reduzem tempo de espera
  async function generatePlan() {
    setLoading(true)
    setError('')
    try {
      const [nutrition, workout] = await Promise.all([
        fetch(`${AI_SERVICE_URL}/nutrition/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: profile?.goal ?? 'muscle_gain',
            fitness_level: profile?.fitness_level ?? 'intermediate',
            weekly_days: profile?.weekly_days ?? 4,
            current_weight_kg: profile?.current_weight_kg ? Number(profile.current_weight_kg) : undefined,
            height_cm: profile?.height_cm ? Number(profile.height_cm) : undefined,
            age: profile?.age ? Number(profile.age) : undefined,
            gender: profile?.gender,
          }),
        }).then(r => r.json()),
        fetch(`${AI_SERVICE_URL}/workout/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: profile?.goal ?? 'muscle_gain',
            fitness_level: profile?.fitness_level ?? 'intermediate',
            weekly_days: profile?.weekly_days ?? 4,
            current_weight_kg: profile?.current_weight_kg ? Number(profile.current_weight_kg) : undefined,
            age: profile?.age ? Number(profile.age) : undefined,
          }),
        }).then(r => r.json()),
      ])
      setPlan({ nutrition: nutrition.data, workout: workout.data })
    } catch (e) {
      setError('Erro ao conectar com o serviço de IA.')
    } finally {
      setLoading(false)
    }
  }

  // Converte ml para exibição amigável — acima de 1000ml mostra em litros
  function formatWater(ml: number): string {
    return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`
  }

  return (
    <SafeAreaView style={s.container}>

      {/* Header com botão voltar */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Plano com IA</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs — só aparecem após o plano ser gerado */}
      {plan && (
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === 'nutrition' && s.tabActive]}
            onPress={() => setTab('nutrition')}
          >
            <Text style={[s.tabText, tab === 'nutrition' && s.tabTextActive]}>🥗 Dieta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'workout' && s.tabActive]}
            onPress={() => setTab('workout')}
          >
            <Text style={[s.tabText, tab === 'workout' && s.tabTextActive]}>🏋️ Treino</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Estado vazio — antes de gerar */}
        {!plan && !loading && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🤖</Text>
            <Text style={s.emptyTitle}>Gerar seu plano</Text>
            <Text style={s.emptyText}>A IA vai criar um plano de treino e dieta personalizado para você</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00FF87" />
            <Text style={s.loadingText}>Gerando seu plano personalizado...</Text>
          </View>
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* ── ABA NUTRIÇÃO ─────────────────────────────────── */}
        {plan && tab === 'nutrition' && (
          <View style={s.content}>

            {/* Cards de macros — grid de 4 colunas */}
            <View style={s.macroRow}>
              {[
                { label: 'Calorias', value: plan.nutrition.daily_calories, unit: 'kcal', color: '#00FF87' },
                { label: 'Proteína', value: plan.nutrition.protein_g, unit: 'g', color: '#60A5FA' },
                { label: 'Carbs', value: plan.nutrition.carbs_g, unit: 'g', color: '#F59E0B' },
                { label: 'Gordura', value: plan.nutrition.fat_g, unit: 'g', color: '#F87171' },
              ].map((m, i) => (
                <View key={i} style={s.macroCard}>
                  <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.macroUnit}>{m.unit}</Text>
                  <Text style={s.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Hidratação mínima diária — destacada separadamente para dar visibilidade */}
            {plan.nutrition.water_ml && (
              <View style={s.hydrationCard}>
                <Text style={s.hydrationEmoji}>💧</Text>
                <View>
                  <Text style={s.hydrationTitle}>Hidratação mínima diária</Text>
                  <Text style={s.hydrationAmount}>
                    {formatWater(plan.nutrition.water_ml)}
                    <Text style={s.hydrationSub}> ({plan.nutrition.water_ml}ml)</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Lista de refeições */}
            <Text style={s.sectionTitle}>Refeições</Text>
            {plan.nutrition.meals?.map((meal: any, i: number) => (
              <View key={i} style={s.mealCard}>
                <View style={s.mealHeader}>
                  <Text style={s.mealIcon}>{mealIcon[meal.meal_type] ?? '🍽️'}</Text>
                  <View style={s.mealInfo}>
                    <Text style={s.mealName}>{meal.name}</Text>
                    <Text style={s.mealTime}>{meal.time_suggestion} · {meal.total_calories} kcal</Text>
                  </View>
                </View>
                {meal.foods?.map((food: any, j: number) => (
                  <View key={j} style={s.foodRow}>
                    <Text style={s.foodName}>{food.name}</Text>
                    <Text style={s.foodDetail}>{food.quantity_g}g · {food.calories} kcal</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Suplementos — só renderiza se houver dados */}
            {plan.nutrition.supplements?.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Suplementos</Text>
                {plan.nutrition.supplements.map((sup: any, i: number) => (
                  <View key={i} style={s.supRow}>
                    <Text style={s.supName}>💊 {sup.name}</Text>
                    <Text style={s.supDetail}>{sup.dose} · {sup.timing}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Notas do nutricionista */}
            {plan.nutrition.nutritionist_notes && (
              <View style={s.notesCard}>
                <Text style={s.notesTitle}>📝 Notas do Nutricionista</Text>
                <Text style={s.notesText}>{plan.nutrition.nutritionist_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── ABA TREINO ───────────────────────────────────── */}
        {plan && tab === 'workout' && (
          <View style={s.content}>

            {/* Cabeçalho do plano de treino com metodologia */}
            <View style={s.workoutHeader}>
              <Text style={s.workoutName}>{plan.workout.name}</Text>
              <Text style={s.workoutMeta}>{plan.workout.duration_weeks} semanas · {plan.workout.methodology}</Text>
            </View>

            {/* Sessões de treino por dia da semana */}
            {plan.workout.sessions?.map((session: any, i: number) => (
              <View key={i} style={s.sessionCard}>
                <View style={s.sessionHeader}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayText}>{dayName[session.day_of_week]}</Text>
                  </View>
                  <View>
                    <Text style={s.sessionName}>{session.name}</Text>
                    <Text style={s.sessionMeta}>{session.focus} · {session.estimated_minutes} min</Text>
                  </View>
                </View>

                {/* Exercícios com dica de técnica */}
                {session.exercises?.map((ex: any, j: number) => (
                  <View key={j} style={s.exerciseRow}>
                    <Text style={s.exerciseName}>{ex.name}</Text>
                    <Text style={s.exerciseDetail}>{ex.sets}x{ex.reps} · {ex.rest_seconds}s descanso</Text>
                    <Text style={s.exerciseTip}>💡 {ex.technique_tip}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Notas do personal trainer */}
            {plan.workout.trainer_notes && (
              <View style={s.notesCard}>
                <Text style={s.notesTitle}>📝 Notas do Personal</Text>
                <Text style={s.notesText}>{plan.workout.trainer_notes}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Botão fixo no rodapé — gera ou regenera o plano */}
      {!loading && (
        <View style={s.footer}>
          <TouchableOpacity style={s.btn} onPress={generatePlan}>
            <Text style={s.btnText}>{plan ? '🔄 Gerar novo plano' : '✨ Gerar meu plano'}</Text>
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
  loadingBox: { alignItems: 'center', paddingTop: 80, gap: 24 },
  loadingText: { color: '#A0A0B0', fontSize: 16 },
  error: { color: '#FF6B6B', textAlign: 'center', marginTop: 32, fontSize: 14, paddingHorizontal: 24 },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  macroCard: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 12, alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroUnit: { fontSize: 10, color: '#A0A0B0' },
  macroLabel: { fontSize: 11, color: '#A0A0B0', marginTop: 2 },
  // Card de hidratação com borda azul para diferenciar dos macros
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
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#2A2A3E' },
  foodName: { fontSize: 14, color: '#E0E0E0' },
  foodDetail: { fontSize: 13, color: '#A0A0B0' },
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
})