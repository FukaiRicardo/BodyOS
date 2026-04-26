import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../App'
import { useDatabase } from '../context/DatabaseContext'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>

const STEPS = [
  { id: 'welcome' },
  { id: 'goal' },
  { id: 'level' },
  { id: 'body' },
  { id: 'schedule' },
]

const GOALS = [
  { id: 'muscle_gain', label: 'Ganhar Massa', emoji: '💪', desc: 'Aumentar músculo e força' },
  { id: 'fat_loss', label: 'Perder Gordura', emoji: '🔥', desc: 'Definição e emagrecimento' },
  { id: 'maintenance', label: 'Manter Forma', emoji: '⚖️', desc: 'Saúde e bem-estar geral' },
  { id: 'performance', label: 'Performance', emoji: '🏆', desc: 'Melhorar rendimento esportivo' },
]

const LEVELS = [
  { id: 'beginner', label: 'Iniciante', emoji: '🌱', desc: 'Menos de 1 ano de treino' },
  { id: 'intermediate', label: 'Intermediário', emoji: '⚡', desc: '1 a 3 anos de treino' },
  { id: 'advanced', label: 'Avançado', emoji: '🔥', desc: 'Mais de 3 anos de treino' },
]

const DAYS = [3, 4, 5, 6]

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>()
  const { saveProfile } = useDatabase()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    goal: '',
    fitness_level: '',
    weekly_days: 4,
    age: '',
    gender: '',
    current_weight_kg: '',
    target_weight_kg: '',
    height_cm: '',
  })

  async function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      setSaving(true)
      await saveProfile({
        goal: form.goal,
        fitness_level: form.fitness_level,
        weekly_days: form.weekly_days,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
      })
      setSaving(false)
      navigation.navigate('Home', { profile: form } as any)
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1)
  }

  const canNext = () => {
    if (step === 1) return !!form.goal
    if (step === 2) return !!form.fitness_level
    if (step === 3) return !!form.age && !!form.current_weight_kg && !!form.height_cm
    return true
  }

  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <SafeAreaView style={s.container}>
      {step > 0 && (
        <View style={s.progressWrap}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressText}>{step}/{STEPS.length - 1}</Text>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <View style={s.centerContent}>
            <Text style={s.logo}>BodyOS</Text>
            <Text style={s.tagline}>Seu protocolo completo{'\n'}gerado por IA</Text>
            <View style={s.features}>
              {[
                { emoji: '🏋️', text: 'Treinos adaptados ao seu corpo' },
                { emoji: '🥗', text: 'Dieta personalizada por IA' },
                { emoji: '📊', text: 'Relatórios e feedback diário' },
                { emoji: '🔄', text: 'Protocolo que evolui com você' },
              ].map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Text style={s.featureEmoji}>{f.emoji}</Text>
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 1 — Goal */}
        {step === 1 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Qual é o seu objetivo?</Text>
            <Text style={s.stepSubtitle}>A IA vai criar seu protocolo baseado nessa escolha</Text>
            <View style={s.optionsGrid}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[s.optionCard, form.goal === g.id && s.optionCardActive]}
                  onPress={() => setForm(f => ({ ...f, goal: g.id }))}
                >
                  <Text style={s.optionEmoji}>{g.emoji}</Text>
                  <Text style={[s.optionLabel, form.goal === g.id && s.optionLabelActive]}>{g.label}</Text>
                  <Text style={s.optionDesc}>{g.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2 — Level */}
        {step === 2 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Seu nível de experiência</Text>
            <Text style={s.stepSubtitle}>Isso define o volume e intensidade do treino</Text>
            <View style={s.optionsList}>
              {LEVELS.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[s.levelCard, form.fitness_level === l.id && s.optionCardActive]}
                  onPress={() => setForm(f => ({ ...f, fitness_level: l.id }))}
                >
                  <Text style={s.optionEmoji}>{l.emoji}</Text>
                  <View style={s.levelInfo}>
                    <Text style={[s.optionLabel, form.fitness_level === l.id && s.optionLabelActive]}>{l.label}</Text>
                    <Text style={s.optionDesc}>{l.desc}</Text>
                  </View>
                  {form.fitness_level === l.id && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3 — Body data */}
        {step === 3 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Seus dados corporais</Text>
            <Text style={s.stepSubtitle}>Usados para calcular suas calorias e macros ideais</Text>
            <View style={s.genderRow}>
              {['Masculino', 'Feminino'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, form.gender === g && s.genderBtnActive]}
                  onPress={() => setForm(f => ({ ...f, gender: g }))}
                >
                  <Text style={[s.genderText, form.gender === g && s.genderTextActive]}>
                    {g === 'Masculino' ? '♂️ ' : '♀️ '}{g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {[
              { label: 'Idade', key: 'age', placeholder: 'ex: 28', unit: 'anos' },
              { label: 'Altura', key: 'height_cm', placeholder: 'ex: 178', unit: 'cm' },
              { label: 'Peso atual', key: 'current_weight_kg', placeholder: 'ex: 80', unit: 'kg' },
              { label: 'Peso alvo', key: 'target_weight_kg', placeholder: 'ex: 75', unit: 'kg' },
            ].map(field => (
              <View key={field.key} style={s.inputWrap}>
                <Text style={s.inputLabel}>{field.label}</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder={field.placeholder}
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={(form as any)[field.key]}
                    onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                  />
                  <Text style={s.inputUnit}>{field.unit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Step 4 — Schedule */}
        {step === 4 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Quantos dias por semana?</Text>
            <Text style={s.stepSubtitle}>A IA vai distribuir os treinos nos dias ideais</Text>
            <View style={s.daysRow}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.dayBtn, form.weekly_days === d && s.dayBtnActive]}
                  onPress={() => setForm(f => ({ ...f, weekly_days: d }))}
                >
                  <Text style={[s.dayBtnNum, form.weekly_days === d && s.dayBtnNumActive]}>{d}</Text>
                  <Text style={s.dayBtnLabel}>dias</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>📋 Resumo do seu perfil</Text>
              {[
                { label: 'Objetivo', value: GOALS.find(g => g.id === form.goal)?.label },
                { label: 'Nível', value: LEVELS.find(l => l.id === form.fitness_level)?.label },
                { label: 'Dias de treino', value: `${form.weekly_days}x por semana` },
                { label: 'Peso atual', value: form.current_weight_kg ? `${form.current_weight_kg}kg` : '-' },
                { label: 'Altura', value: form.height_cm ? `${form.height_cm}cm` : '-' },
              ].map((item, i) => (
                <View key={i} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                  <Text style={s.summaryValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      <View style={s.footer}>
        {step > 0 && (
          <TouchableOpacity style={s.btnBack} onPress={back} disabled={saving}>
            <Text style={s.btnBackText}>← Voltar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.btnNext, (!canNext() || saving) && s.btnNextDisabled, step === 0 && s.btnNextFull]}
          onPress={next}
          disabled={!canNext() || saving}
        >
          {saving
            ? <ActivityIndicator color="#0A0A0F" />
            : <Text style={s.btnNextText}>
                {step === 0 ? 'Começar agora' : step === STEPS.length - 1 ? '🚀 Gerar meu protocolo' : 'Continuar →'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, gap: 12 },
  progressBg: { flex: 1, height: 4, backgroundColor: '#1A1A2E', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#00FF87', borderRadius: 2 },
  progressText: { color: '#A0A0B0', fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { fontSize: 52, fontWeight: '800', color: '#00FF87', letterSpacing: -1, marginBottom: 12 },
  tagline: { fontSize: 24, color: '#FFFFFF', textAlign: 'center', lineHeight: 34, marginBottom: 48, fontWeight: '600' },
  features: { width: '100%', gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', padding: 16, borderRadius: 14, gap: 14 },
  featureEmoji: { fontSize: 24 },
  featureText: { fontSize: 15, color: '#E0E0E0', fontWeight: '500' },
  stepContent: { padding: 24, gap: 20 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', lineHeight: 34 },
  stepSubtitle: { fontSize: 15, color: '#A0A0B0', lineHeight: 22, marginTop: -8 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  optionCard: { width: '47%', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: 'transparent' },
  optionCardActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  optionEmoji: { fontSize: 32 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  optionLabelActive: { color: '#00FF87' },
  optionDesc: { fontSize: 12, color: '#A0A0B0', textAlign: 'center' },
  optionsList: { gap: 12 },
  levelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 14, borderWidth: 2, borderColor: 'transparent' },
  levelInfo: { flex: 1 },
  check: { color: '#00FF87', fontSize: 20, fontWeight: '800' },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  genderBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  genderText: { color: '#A0A0B0', fontWeight: '600' },
  genderTextActive: { color: '#00FF87' },
  inputWrap: { gap: 8 },
  inputLabel: { color: '#A0A0B0', fontSize: 13, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, paddingHorizontal: 16 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16, paddingVertical: 14 },
  inputUnit: { color: '#A0A0B0', fontSize: 14 },
  daysRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  dayBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  dayBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  dayBtnNum: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  dayBtnNumActive: { color: '#00FF87' },
  dayBtnLabel: { fontSize: 12, color: '#A0A0B0', marginTop: 4 },
  summaryCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, gap: 12 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: '#A0A0B0', fontSize: 14 },
  summaryValue: { color: '#00FF87', fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', padding: 24, gap: 12 },
  btnBack: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#1A1A2E', alignItems: 'center' },
  btnBackText: { color: '#A0A0B0', fontSize: 15, fontWeight: '600' },
  btnNext: { flex: 1, backgroundColor: '#00FF87', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnNextFull: { flex: 1 },
  btnNextDisabled: { backgroundColor: '#1A1A2E' },
  btnNextText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
})