import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../../App'
import { useDatabase } from '../../context/DatabaseContext'
import { useLocation } from '../../hooks/useLocation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>

const STEPS = [
  { id: 'welcome' },
  { id: 'location' },
  { id: 'goal' },
  { id: 'level' },
  { id: 'training_location' }, // ✅ step 4
  { id: 'body' },              // step 5
  { id: 'schedule' },          // step 6
]

const DAYS = [3, 4, 5, 6]

const POPULAR_COUNTRIES = [
  { name: 'Brasil', code: 'BR', flag: '🇧🇷' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
]

const TRAINING_LOCATIONS = [
  { id: 'gym', label: 'Academia', emoji: '🏋️', desc: 'Acesso a equipamentos completos' },
  { id: 'home', label: 'Casa', emoji: '🏠', desc: 'Treino sem equipamentos ou com poucos' },
  { id: 'martial_arts', label: 'Artes Marciais', emoji: '🥊', desc: 'Luta, jiu-jitsu, boxe, etc.' },
  { id: 'outdoor', label: 'Ao Ar Livre', emoji: '🌳', desc: 'Parque, rua, calistenia' },
  { id: 'sport', label: 'Esporte', emoji: '⚽', desc: 'Futebol, basquete, natação, etc.' },
]

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>()
  const { saveProfile } = useDatabase()
  const { t } = useTranslation()
  const { location, status: locationStatus, error: locationError, detect, setManual } = useLocation()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [manualCity, setManualCity] = useState('')
  const [form, setForm] = useState({
    goal: '',
    fitness_level: '',
    weekly_days: 4,
    age: '',
    gender: '',
    current_weight_kg: '',
    target_weight_kg: '',
    height_cm: '',
    training_location: '',
  })

  const GOALS = [
    { id: 'muscle_gain', label: t('goals.muscle_gain'), emoji: '💪', desc: t('onboarding.goalDesc.muscle_gain') },
    { id: 'fat_loss', label: t('goals.fat_loss'), emoji: '🔥', desc: t('onboarding.goalDesc.fat_loss') },
    { id: 'maintenance', label: t('goals.maintain'), emoji: '⚖️', desc: t('onboarding.goalDesc.maintain') },
    { id: 'performance', label: t('goals.performance'), emoji: '⚡', desc: t('onboarding.goalDesc.performance') },
  ]

  const LEVELS = [
    { id: 'beginner', label: t('levels.beginner'), emoji: '🌱', desc: t('onboarding.levelDesc.beginner') },
    { id: 'intermediate', label: t('levels.intermediate'), emoji: '⚡', desc: t('onboarding.levelDesc.intermediate') },
    { id: 'advanced', label: t('levels.advanced'), emoji: '🔥', desc: t('onboarding.levelDesc.advanced') },
  ]

  async function next() {
    if (step < STEPS.length - 1) {
      if (step === 0) {
        detect()
      }
      setStep(s => s + 1)
    } else {
      setSaving(true)
      await saveProfile({
        goal: form.goal,
        fitness_level: form.fitness_level,
        weekly_days: form.weekly_days,
        training_location: form.training_location || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
        country: location?.country || null,
        country_code: location?.countryCode || null,
        city: location?.city || null,
        region: location?.region || null,
        currency: location?.currency || 'USD',
        currency_symbol: location?.currencySymbol || '$',
      })
      setSaving(false)
      navigation.navigate('Home', { profile: { ...form, location } } as any)
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1)
  }

  const canNext = () => {
    if (step === 1) return true
    if (step === 2) return !!form.goal
    if (step === 3) return !!form.fitness_level
    if (step === 4) return !!form.training_location
    if (step === 5) return !!form.age && !!form.current_weight_kg && !!form.height_cm
    return true
  }

  const progress = step > 0 ? ((step) / (STEPS.length - 1)) * 100 : 0

  const bodyFields = [
    { label: t('onboarding.age'), key: 'age', placeholder: t('onboarding.agePlaceholder'), unit: t('onboarding.ageUnit') },
    { label: t('onboarding.height'), key: 'height_cm', placeholder: t('onboarding.heightPlaceholder'), unit: 'cm' },
    { label: t('onboarding.weight'), key: 'current_weight_kg', placeholder: t('onboarding.weightPlaceholder'), unit: 'kg' },
    { label: t('onboarding.targetWeight'), key: 'target_weight_kg', placeholder: t('onboarding.targetWeightPlaceholder'), unit: 'kg' },
  ]

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
            <Text style={s.tagline}>{t('onboarding.tagline')}</Text>
            <View style={s.features}>
              {[
                { emoji: '🏋️', text: t('onboarding.feature1') },
                { emoji: '🥗', text: t('onboarding.feature2') },
                { emoji: '📊', text: t('onboarding.feature3') },
                { emoji: '🔄', text: t('onboarding.feature4') },
              ].map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Text style={s.featureEmoji}>{f.emoji}</Text>
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 1 — Localização */}
        {step === 1 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>📍 Onde você está?</Text>
            <Text style={s.stepSubtitle}>
              Usamos sua localização para adaptar a dieta com alimentos locais e estimar custos reais.
            </Text>

            {locationStatus === 'detecting' && (
              <View style={s.locationCard}>
                <ActivityIndicator color="#00FF87" size="large" />
                <Text style={s.locationStatusText}>Detectando sua localização…</Text>
                <Text style={s.locationSubText}>Isso leva apenas um segundo</Text>
              </View>
            )}

            {locationStatus === 'success' && location && (
              <View style={s.locationSuccessCard}>
                <View style={s.locationSuccessHeader}>
                  <Text style={s.locationCheckmark}>✓</Text>
                  <Text style={s.locationDetectedLabel}>Localização detectada</Text>
                </View>
                <Text style={s.locationCity}>
                  {location.city ? `${location.city}, ` : ''}{location.country}
                </Text>
                <View style={s.locationMeta}>
                  <View style={s.locationMetaBadge}>
                    <Text style={s.locationMetaText}>💱 {location.currency} ({location.currencySymbol})</Text>
                  </View>
                  <View style={s.locationMetaBadge}>
                    <Text style={s.locationMetaText}>
                      {location.detectedBy === 'gps' ? '📡 GPS' : location.detectedBy === 'ip' ? '🌐 IP' : '✏️ Manual'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => detect()} style={s.retryBtn}>
                  <Text style={s.retryBtnText}>🔄 Detectar novamente</Text>
                </TouchableOpacity>
              </View>
            )}

            {locationStatus === 'idle' && (
              <TouchableOpacity style={s.detectBtn} onPress={detect}>
                <Text style={s.detectBtnEmoji}>📡</Text>
                <Text style={s.detectBtnText}>Detectar localização automaticamente</Text>
                <Text style={s.detectBtnSub}>Usamos GPS ou IP — sem armazenar coordenadas</Text>
              </TouchableOpacity>
            )}

            {locationStatus === 'manual_required' && (
              <View style={s.manualSection}>
                <View style={s.errorBanner}>
                  <Text style={s.errorText}>⚠️ {locationError}</Text>
                </View>
                <Text style={s.manualLabel}>Selecione seu país:</Text>
                <View style={s.countriesGrid}>
                  {POPULAR_COUNTRIES.map(c => (
                    <TouchableOpacity
                      key={c.code}
                      style={[s.countryBtn, location?.countryCode === c.code && s.countryBtnActive]}
                      onPress={() => setManual({ country: c.name, countryCode: c.code, city: manualCity })}
                    >
                      <Text style={s.countryFlag}>{c.flag}</Text>
                      <Text style={[s.countryName, location?.countryCode === c.code && s.countryNameActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {location && (
                  <View style={s.inputWrap}>
                    <Text style={s.inputLabel}>Cidade (opcional)</Text>
                    <View style={s.inputRow}>
                      <TextInput
                        style={s.input}
                        placeholder="Ex: São Paulo"
                        placeholderTextColor="#555"
                        value={manualCity}
                        onChangeText={v => {
                          setManualCity(v)
                          if (location) {
                            setManual({ country: location.country, countryCode: location.countryCode, city: v })
                          }
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={s.privacyNote}>
              <Text style={s.privacyText}>
                🔒 Apenas país e cidade são armazenados. Coordenadas GPS nunca são salvas.
              </Text>
            </View>

            {locationStatus !== 'success' && (
              <TouchableOpacity onPress={() => setStep(s => s + 1)} style={s.skipBtn}>
                <Text style={s.skipText}>Pular esta etapa →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 2 — Goal */}
        {step === 2 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>{t('onboarding.goal')}</Text>
            <Text style={s.stepSubtitle}>{t('onboarding.goalSubtitle')}</Text>
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

        {/* Step 3 — Level */}
        {step === 3 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>{t('onboarding.level')}</Text>
            <Text style={s.stepSubtitle}>{t('onboarding.levelSubtitle')}</Text>
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

        {/* Step 4 — Training Location ✅ NOVO */}
        {step === 4 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>🏋️ Onde você treina?</Text>
            <Text style={s.stepSubtitle}>Isso personaliza seus exercícios e recomendações</Text>
            <View style={s.optionsList}>
              {TRAINING_LOCATIONS.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[s.levelCard, form.training_location === l.id && s.optionCardActive]}
                  onPress={() => setForm(f => ({ ...f, training_location: l.id }))}
                >
                  <Text style={s.optionEmoji}>{l.emoji}</Text>
                  <View style={s.levelInfo}>
                    <Text style={[s.optionLabel, form.training_location === l.id && s.optionLabelActive]}>{l.label}</Text>
                    <Text style={s.optionDesc}>{l.desc}</Text>
                  </View>
                  {form.training_location === l.id && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 5 — Body data */}
        {step === 5 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>{t('onboarding.bodyTitle')}</Text>
            <Text style={s.stepSubtitle}>{t('onboarding.bodySubtitle')}</Text>
            <View style={s.genderRow}>
              {[t('onboarding.male'), t('onboarding.female')].map((g, idx) => {
                const genderVal = idx === 0 ? 'Masculino' : 'Feminino'
                return (
                  <TouchableOpacity
                    key={g}
                    style={[s.genderBtn, form.gender === genderVal && s.genderBtnActive]}
                    onPress={() => setForm(f => ({ ...f, gender: genderVal }))}
                  >
                    <Text style={[s.genderText, form.gender === genderVal && s.genderTextActive]}>
                      {idx === 0 ? '♂️' : '♀️'} {g}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {bodyFields.map(field => (
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

        {/* Step 6 — Schedule */}
        {step === 6 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>{t('onboarding.weeklyDays')}</Text>
            <Text style={s.stepSubtitle}>{t('onboarding.weeklyDaysSubtitle')}</Text>
            <View style={s.daysRow}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.dayBtn, form.weekly_days === d && s.dayBtnActive]}
                  onPress={() => setForm(f => ({ ...f, weekly_days: d }))}
                >
                  <Text style={[s.dayBtnNum, form.weekly_days === d && s.dayBtnNumActive]}>{d}</Text>
                  <Text style={s.dayBtnLabel}>{t('onboarding.days')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>📋 {t('onboarding.summary')}</Text>
              {[
                { label: '📍 Localização', value: location ? `${location.city ? location.city + ', ' : ''}${location.country}` : 'Não detectada' },
                { label: t('home.profileGoal'), value: GOALS.find(g => g.id === form.goal)?.label },
                { label: t('home.profileLevel'), value: LEVELS.find(l => l.id === form.fitness_level)?.label },
                { label: '🏋️ Local de Treino', value: TRAINING_LOCATIONS.find(l => l.id === form.training_location)?.label },
                { label: t('onboarding.trainingDays'), value: `${form.weekly_days}x ${t('onboarding.perWeek')}` },
                { label: t('home.profileWeight'), value: form.current_weight_kg ? `${form.current_weight_kg}kg` : '-' },
                { label: t('onboarding.height'), value: form.height_cm ? `${form.height_cm}cm` : '-' },
              ].map((item, i) => (
                <View key={i} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                  <Text style={s.summaryValue}>{item.value || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      <View style={s.footer}>
        {step > 0 && (
          <TouchableOpacity style={s.btnBack} onPress={back} disabled={saving}>
            <Text style={s.btnBackText}>← {t('common.back')}</Text>
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
                {step === 0
                  ? t('onboarding.start')
                  : step === STEPS.length - 1
                    ? t('onboarding.generate')
                    : t('onboarding.continue')}
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
  locationCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 32, alignItems: 'center', gap: 16 },
  locationStatusText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  locationSubText: { color: '#A0A0B0', fontSize: 13 },
  locationSuccessCard: { backgroundColor: '#0D2E1A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#00FF87', gap: 12 },
  locationSuccessHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationCheckmark: { color: '#00FF87', fontSize: 20, fontWeight: '800' },
  locationDetectedLabel: { color: '#00FF87', fontSize: 14, fontWeight: '600' },
  locationCity: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  locationMeta: { flexDirection: 'row', gap: 8 },
  locationMetaBadge: { backgroundColor: '#1A1A2E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  locationMetaText: { color: '#A0A0B0', fontSize: 12 },
  retryBtn: { alignSelf: 'flex-start', marginTop: 4 },
  retryBtnText: { color: '#A0A0B0', fontSize: 13 },
  detectBtn: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#2A2A4E' },
  detectBtnEmoji: { fontSize: 36 },
  detectBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  detectBtnSub: { color: '#A0A0B0', fontSize: 12, textAlign: 'center' },
  manualSection: { gap: 16 },
  errorBanner: { backgroundColor: '#2E1A0D', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FF6B35' },
  errorText: { color: '#FF9F6B', fontSize: 13 },
  manualLabel: { color: '#A0A0B0', fontSize: 14, fontWeight: '600' },
  countriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countryBtn: { backgroundColor: '#1A1A2E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent' },
  countryBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  countryFlag: { fontSize: 18 },
  countryName: { color: '#A0A0B0', fontSize: 12, fontWeight: '500' },
  countryNameActive: { color: '#00FF87' },
  privacyNote: { backgroundColor: '#111120', borderRadius: 10, padding: 12 },
  privacyText: { color: '#555570', fontSize: 12, lineHeight: 18 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: '#555570', fontSize: 13 },
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
