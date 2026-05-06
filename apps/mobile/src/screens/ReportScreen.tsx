// ReportScreen com i18n
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../App'
import { useDatabase } from '../context/DatabaseContext'

type Route = RouteProp<RootStackParamList, 'Report'>

const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL ?? 'http://localhost:3001'
const ENERGY_LEVELS = [1, 2, 3, 4, 5]

const alertColor: Record<string, string> = {
  green: '#00FF87',
  yellow: '#F59E0B',
  red: '#F87171',
}

export default function ReportScreen() {
  const navigation = useNavigation()
  const { saveReport } = useDatabase()
  const route = useRoute<Route>()
  const profile = route.params?.profile
  const { t, i18n } = useTranslation()

  const MOODS = [
    { id: 'otimo', label: t('report.mood.great'), emoji: '😁' },
    { id: 'bom', label: t('report.mood.good'), emoji: '😊' },
    { id: 'neutro', label: t('report.mood.neutral'), emoji: '😐' },
    { id: 'cansado', label: t('report.mood.tired'), emoji: '😴' },
    { id: 'ruim', label: t('report.mood.bad'), emoji: '😞' },
  ]

  const [form, setForm] = useState({
    workout_completed: false,
    workout_notes: '',
    energy_level: 3 as 1 | 2 | 3 | 4 | 5,
    sleep_hours: '',
    mood: '',
    weight_kg: '',
    adherence_percent: 100,
    meals_logged: [] as { name: string; calories: number; protein: number }[],
  })

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [error, setError] = useState('')

  async function submitReport() {
    if (!form.mood) {
      setError(t('report.selectMood'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const today = new Date().toISOString().split('T')[0]

      const report = {
        user_profile: {
          goal: profile?.goal ?? 'muscle_gain',
          fitness_level: profile?.fitness_level ?? 'intermediate',
          weekly_days: profile?.weekly_days ?? 4,
        },
        date: today,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        meals_logged: form.meals_logged,
        workout_completed: form.workout_completed,
        workout_notes: form.workout_notes || undefined,
        energy_level: form.energy_level,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : undefined,
        mood: form.mood,
        adherence_percent: form.adherence_percent,
        language: i18n.language,
      }

      const [analysis, clientFeedback] = await Promise.all([
        fetch(`${AI_SERVICE_URL}/report/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.EXPO_PUBLIC_AI_API_KEY ?? '' },
          body: JSON.stringify(report),
        }).then(r => r.json()),
        fetch(`${AI_SERVICE_URL}/feedback/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.EXPO_PUBLIC_AI_API_KEY ?? '' },
          body: JSON.stringify(report),
        }).then(r => r.json()),
      ])

      const result = { analysis: analysis.data, clientFeedback: clientFeedback.data }
      setFeedback(result)

      await saveReport({
        date: today,
        workout_completed: form.workout_completed,
        workout_notes: form.workout_notes || null,
        energy_level: form.energy_level,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
        mood: form.mood,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        water_ml: null,
        adherence_percent: form.adherence_percent,
        analysis: result.analysis,
        feedback: result.clientFeedback,
      })

    } catch (e) {
      setError(t('report.submitError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('report.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {!feedback && (
          <View style={s.form}>

            {/* Treino */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('report.workoutDone')}</Text>
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggleBtn, form.workout_completed && s.toggleBtnActive]}
                  onPress={() => setForm(f => ({ ...f, workout_completed: true }))}
                >
                  <Text style={[s.toggleText, form.workout_completed && s.toggleTextActive]}>✅ {t('report.yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, !form.workout_completed && s.toggleBtnActiveRed]}
                  onPress={() => setForm(f => ({ ...f, workout_completed: false }))}
                >
                  <Text style={[s.toggleText, !form.workout_completed && s.toggleTextRed]}>❌ {t('report.no')}</Text>
                </TouchableOpacity>
              </View>
              {form.workout_completed && (
                <TextInput
                  style={s.textArea}
                  placeholder={t('report.workoutNotesPlaceholder')}
                  placeholderTextColor="#555"
                  multiline
                  numberOfLines={3}
                  value={form.workout_notes}
                  onChangeText={v => setForm(f => ({ ...f, workout_notes: v }))}
                />
              )}
            </View>

            {/* Energia */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('report.energyLevel')}</Text>
              <View style={s.energyRow}>
                {ENERGY_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[s.energyBtn, form.energy_level === level && s.energyBtnActive]}
                    onPress={() => setForm(f => ({ ...f, energy_level: level as 1 | 2 | 3 | 4 | 5 }))}
                  >
                    <Text style={[s.energyNum, form.energy_level === level && s.energyNumActive]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.energyLabels}>
                <Text style={s.energyLabelText}>{t('report.energyLow')}</Text>
                <Text style={s.energyLabelText}>{t('report.energyHigh')}</Text>
              </View>
            </View>

            {/* Humor */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('report.mood.title')}</Text>
              <View style={s.moodRow}>
                {MOODS.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.moodBtn, form.mood === m.id && s.moodBtnActive]}
                    onPress={() => setForm(f => ({ ...f, mood: m.id }))}
                  >
                    <Text style={s.moodEmoji}>{m.emoji}</Text>
                    <Text style={[s.moodLabel, form.mood === m.id && s.moodLabelActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dados do dia */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('report.dayData')}</Text>
              <View style={s.inputsRow}>
                <View style={s.inputWrap}>
                  <Text style={s.inputLabel}>{t('report.weight')}</Text>
                  <TextInput
                    style={s.input}
                    placeholder="ex: 79.5"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={form.weight_kg}
                    onChangeText={v => setForm(f => ({ ...f, weight_kg: v }))}
                  />
                </View>
                <View style={s.inputWrap}>
                  <Text style={s.inputLabel}>{t('report.sleep')}</Text>
                  <TextInput
                    style={s.input}
                    placeholder="ex: 7.5"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={form.sleep_hours}
                    onChangeText={v => setForm(f => ({ ...f, sleep_hours: v }))}
                  />
                </View>
              </View>
            </View>

            {/* Aderência */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {t('report.adherence')}: <Text style={s.adherenceValue}>{form.adherence_percent}%</Text>
              </Text>
              <View style={s.adherenceRow}>
                {[25, 50, 75, 100].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[s.adherenceBtn, form.adherence_percent === v && s.adherenceBtnActive]}
                    onPress={() => setForm(f => ({ ...f, adherence_percent: v }))}
                  >
                    <Text style={[s.adherenceBtnText, form.adherence_percent === v && s.adherenceBtnTextActive]}>{v}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}
          </View>
        )}

        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00FF87" />
            <Text style={s.loadingText}>{t('report.analyzing')}</Text>
          </View>
        )}

        {feedback && (
          <View style={s.feedbackContainer}>
            <View style={[s.scoreCard, { borderColor: alertColor[feedback.analysis?.alert_level] ?? '#00FF87' }]}>
              <Text style={s.scoreEmoji}>{feedback.clientFeedback?.emoji_summary}</Text>
              <Text style={[s.scoreValue, { color: alertColor[feedback.analysis?.alert_level] ?? '#00FF87' }]}>
                {feedback.analysis?.overall_score}/100
              </Text>
              <Text style={s.scoreLabel}>{t('report.scoreLabel')}</Text>
            </View>

            <View style={s.messageCard}>
              <Text style={s.messageSubject}>{feedback.clientFeedback?.subject}</Text>
              <Text style={s.messageGreeting}>{feedback.clientFeedback?.greeting}</Text>
              <Text style={s.messageBody}>{feedback.clientFeedback?.body}</Text>
            </View>

            {feedback.analysis?.highlights?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>✨ {t('report.highlights')}</Text>
                {feedback.analysis.highlights.map((h: string, i: number) => (
                  <Text key={i} style={s.cardItem}>• {h}</Text>
                ))}
              </View>
            )}

            {feedback.analysis?.attention_points?.length > 0 && (
              <View style={[s.card, s.cardWarning]}>
                <Text style={s.cardTitle}>⚠️ {t('report.attentionPoints')}</Text>
                {feedback.analysis.attention_points.map((a: string, i: number) => (
                  <Text key={i} style={s.cardItem}>• {a}</Text>
                ))}
              </View>
            )}

            {feedback.analysis?.tomorrow_tips?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>🎯 {t('report.tomorrowTips')}</Text>
                {feedback.analysis.tomorrow_tips.map((tip: string, i: number) => (
                  <Text key={i} style={s.cardItem}>• {tip}</Text>
                ))}
              </View>
            )}

            {[
              { title: `🥗 ${t('plan.diet')}`, text: feedback.analysis?.nutrition_feedback },
              { title: `🏋️ ${t('plan.training')}`, text: feedback.analysis?.workout_feedback },
              { title: `😴 ${t('report.recovery')}`, text: feedback.analysis?.recovery_feedback },
            ].map((item, i) => item.text ? (
              <View key={i} style={s.card}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardText}>{item.text}</Text>
              </View>
            ) : null)}

            <View style={s.closingCard}>
              <Text style={s.closingText}>{feedback.clientFeedback?.closing}</Text>
            </View>

            <TouchableOpacity style={s.newReportBtn} onPress={() => setFeedback(null)}>
              <Text style={s.newReportBtnText}>🔄 {t('report.newReport')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {!loading && !feedback && (
        <View style={s.footer}>
          <TouchableOpacity style={s.submitBtn} onPress={submitReport}>
            <Text style={s.submitBtnText}>🤖 {t('report.submit')}</Text>
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
  scroll: { flex: 1 },
  form: { padding: 24, gap: 8 },
  section: { marginBottom: 24, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  toggleBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  toggleBtnActiveRed: { borderColor: '#F87171', backgroundColor: '#2E0D0D' },
  toggleText: { color: '#A0A0B0', fontWeight: '600' },
  toggleTextActive: { color: '#00FF87' },
  toggleTextRed: { color: '#F87171' },
  textArea: { backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  energyRow: { flexDirection: 'row', gap: 8 },
  energyBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  energyBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  energyNum: { fontSize: 18, fontWeight: '800', color: '#A0A0B0' },
  energyNumActive: { color: '#00FF87' },
  energyLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  energyLabelText: { fontSize: 11, color: '#555' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: 'transparent' },
  moodBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 10, color: '#A0A0B0' },
  moodLabelActive: { color: '#00FF87' },
  inputsRow: { flexDirection: 'row', gap: 12 },
  inputWrap: { flex: 1, gap: 8 },
  inputLabel: { fontSize: 13, color: '#A0A0B0', fontWeight: '600' },
  input: { backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15 },
  adherenceValue: { color: '#00FF87' },
  adherenceRow: { flexDirection: 'row', gap: 8 },
  adherenceBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  adherenceBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  adherenceBtnText: { color: '#A0A0B0', fontWeight: '700' },
  adherenceBtnTextActive: { color: '#00FF87' },
  error: { color: '#F87171', textAlign: 'center', fontSize: 14 },
  loadingBox: { alignItems: 'center', paddingTop: 80, gap: 24 },
  loadingText: { color: '#A0A0B0', fontSize: 16 },
  feedbackContainer: { padding: 24, gap: 16 },
  scoreCard: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2, gap: 8 },
  scoreEmoji: { fontSize: 40 },
  scoreValue: { fontSize: 48, fontWeight: '800' },
  scoreLabel: { fontSize: 14, color: '#A0A0B0' },
  messageCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, gap: 8 },
  messageSubject: { fontSize: 16, fontWeight: '700', color: '#00FF87' },
  messageGreeting: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  messageBody: { fontSize: 14, color: '#A0A0B0', lineHeight: 22 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 8 },
  cardWarning: { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardItem: { fontSize: 14, color: '#A0A0B0', lineHeight: 22 },
  cardText: { fontSize: 14, color: '#A0A0B0', lineHeight: 22 },
  closingCard: { backgroundColor: '#0D2E1A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#00FF87' },
  closingText: { fontSize: 15, color: '#00FF87', textAlign: 'center', fontWeight: '600', lineHeight: 24 },
  newReportBtn: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center' },
  newReportBtnText: { color: '#A0A0B0', fontWeight: '600', fontSize: 15 },
  footer: { padding: 24 },
  submitBtn: { backgroundColor: '#00FF87', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#0A0A0F', fontSize: 17, fontWeight: '700' },
})
