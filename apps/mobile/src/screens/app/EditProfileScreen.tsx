import { useNavigation } from '@react-navigation/native'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDatabase } from '../../context/DatabaseContext'

const GOALS = [
  { id: 'muscle_gain', label: 'Ganho de Massa', emoji: '💪' },
  { id: 'fat_loss', label: 'Perda de Gordura', emoji: '🔥' },
  { id: 'maintenance', label: 'Manutenção', emoji: '⚖️' },
  { id: 'performance', label: 'Performance', emoji: '⚡' },
]

const LEVELS = [
  { id: 'beginner', label: 'Iniciante', emoji: '🌱' },
  { id: 'intermediate', label: 'Intermediário', emoji: '⚡' },
  { id: 'advanced', label: 'Avançado', emoji: '🔥' },
]

const TRAINING_LOCATIONS = [
  { id: 'gym', label: 'Academia', emoji: '🏋️' },
  { id: 'home', label: 'Casa', emoji: '🏠' },
  { id: 'martial_arts', label: 'Artes Marciais', emoji: '🥊' },
  { id: 'outdoor', label: 'Ao Ar Livre', emoji: '🌳' },
  { id: 'sport', label: 'Esporte', emoji: '⚽' },
]

const DAYS = [3, 4, 5, 6]

export default function EditProfileScreen() {
  const navigation = useNavigation<any>()
  const { loadProfile, saveProfile } = useDatabase()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    goal: '',
    fitness_level: '',
    weekly_days: 4,
    training_location: '',
    age: '',
    gender: '',
    height_cm: '',
    current_weight_kg: '',
    target_weight_kg: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await loadProfile()
      if (data) {
        setForm({
          goal: data.goal ?? '',
          fitness_level: data.fitness_level ?? '',
          weekly_days: data.weekly_days ?? 4,
          training_location: data.training_location ?? '',
          age: data.age?.toString() ?? '',
          gender: data.gender ?? '',
          height_cm: data.height_cm?.toString() ?? '',
          current_weight_kg: data.current_weight_kg?.toString() ?? '',
          target_weight_kg: data.target_weight_kg?.toString() ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!form.goal || !form.fitness_level || !form.training_location) {
      Alert.alert('Atenção', 'Preencha objetivo, nível e local de treino.')
      return
    }
    setSaving(true)
    const { error } = await saveProfile({
      goal: form.goal,
      fitness_level: form.fitness_level,
      weekly_days: form.weekly_days,
      training_location: form.training_location,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
      target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
      country: null,
      country_code: null,
      city: null,
      region: null,
      currency: null,
      currency_symbol: null,
    })
    setSaving(false)
    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar o perfil.')
    } else {
      Alert.alert('Sucesso', 'Perfil atualizado! Gere um novo protocolo para aplicar as mudanças.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#00FF87" size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Editar Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        <Text style={s.sectionTitle}>🎯 Objetivo</Text>
        <View style={s.optionsGrid}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[s.optionCard, form.goal === g.id && s.optionCardActive]}
              onPress={() => setForm(f => ({ ...f, goal: g.id }))}
            >
              <Text style={s.optionEmoji}>{g.emoji}</Text>
              <Text style={[s.optionLabel, form.goal === g.id && s.optionLabelActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionTitle}>📊 Nível de Condicionamento</Text>
        <View style={s.optionsList}>
          {LEVELS.map(l => (
            <TouchableOpacity
              key={l.id}
              style={[s.levelCard, form.fitness_level === l.id && s.optionCardActive]}
              onPress={() => setForm(f => ({ ...f, fitness_level: l.id }))}
            >
              <Text style={s.optionEmoji}>{l.emoji}</Text>
              <Text style={[s.optionLabel, form.fitness_level === l.id && s.optionLabelActive]}>{l.label}</Text>
              {form.fitness_level === l.id && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionTitle}>🏋️ Local de Treino</Text>
        <View style={s.optionsList}>
          {TRAINING_LOCATIONS.map(l => (
            <TouchableOpacity
              key={l.id}
              style={[s.levelCard, form.training_location === l.id && s.optionCardActive]}
              onPress={() => setForm(f => ({ ...f, training_location: l.id }))}
            >
              <Text style={s.optionEmoji}>{l.emoji}</Text>
              <Text style={[s.optionLabel, form.training_location === l.id && s.optionLabelActive]}>{l.label}</Text>
              {form.training_location === l.id && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionTitle}>📅 Dias de Treino por Semana</Text>
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

        <Text style={s.sectionTitle}>👤 Dados Corporais</Text>

        <View style={s.genderRow}>
          {['Masculino', 'Feminino'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[s.genderBtn, form.gender === g && s.genderBtnActive]}
              onPress={() => setForm(f => ({ ...f, gender: g }))}
            >
              <Text style={[s.genderText, form.gender === g && s.genderTextActive]}>
                {g === 'Masculino' ? '♂️' : '♀️'} {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { label: 'Idade', key: 'age', placeholder: 'Ex: 30', unit: 'anos' },
          { label: 'Altura', key: 'height_cm', placeholder: 'Ex: 175', unit: 'cm' },
          { label: 'Peso Atual', key: 'current_weight_kg', placeholder: 'Ex: 80', unit: 'kg' },
          { label: 'Peso Alvo', key: 'target_weight_kg', placeholder: 'Ex: 75', unit: 'kg' },
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

        <View style={{ height: 32 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, saving && s.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#0A0A0F" />
            : <Text style={s.btnText}>💾 Salvar Alterações</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  back: { color: '#00FF87', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555570', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  optionCard: { width: '47%', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: 'transparent' },
  optionCardActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  optionEmoji: { fontSize: 28 },
  optionLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  optionLabelActive: { color: '#00FF87' },
  optionsList: { gap: 10 },
  levelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 14, borderWidth: 2, borderColor: 'transparent' },
  check: { color: '#00FF87', fontSize: 20, fontWeight: '800', marginLeft: 'auto' },
  daysRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  dayBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  dayBtnActive: { borderColor: '#00FF87', backgroundColor: '#0D2E1A' },
  dayBtnNum: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  dayBtnNumActive: { color: '#00FF87' },
  dayBtnLabel: { fontSize: 12, color: '#A0A0B0', marginTop: 4 },
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
  footer: { padding: 24 },
  btn: { backgroundColor: '#00FF87', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#1A1A2E' },
  btnText: { color: '#0A0A0F', fontSize: 16, fontWeight: '700' },
})
