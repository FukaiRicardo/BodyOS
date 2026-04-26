// Home dashboard — exibe resumo do perfil e stats reais do dia via Supabase
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../App'
import { useAuth } from '../context/AuthContext'
import { useDatabase } from '../context/DatabaseContext'
import { Report } from '../lib/supabase'

type Route = RouteProp<RootStackParamList, 'Home'>

const GOAL_LABELS: Record<string, string> = {
  muscle_gain: '💪 Ganhar massa',
  fat_loss: '🔥 Perder gordura',
  maintain: '⚖️ Manter forma',
  performance: '⚡ Performance',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

const ALERT_COLORS: Record<string, string> = {
  green: '#00FF88',
  yellow: '#F59E0B',
  red: '#F87171',
}

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<Route>()
  const { signOut, user } = useAuth()
  const { loadTodayReport, loadLatestPlan } = useDatabase()
  const profile = route.params?.profile

  const [todayReport, setTodayReport] = useState<Report | null>(null)
  const [hasPlan, setHasPlan] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      setLoadingStats(true)
      const [reportResult, planResult] = await Promise.all([
        loadTodayReport(),
        loadLatestPlan(),
      ])
      setTodayReport(reportResult.data)
      setHasPlan(!!planResult.data)
      setLoadingStats(false)
    }
    fetchDashboardData()
  }, [])

  // Score do dia com cor dinâmica
  const score = todayReport?.analysis?.overall_score
  const alertLevel = todayReport?.analysis?.alert_level ?? 'green'
  const scoreColor = ALERT_COLORS[alertLevel] ?? '#00FF88'

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Olá! 👋</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
            <Text style={s.signOutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* Score do dia — só aparece se já tem relatório hoje */}
        {todayReport && score !== undefined && (
          <View style={[s.scoreCard, { borderColor: scoreColor }]}>
            <View style={s.scoreLeft}>
              <Text style={s.scoreLabel}>Score de hoje</Text>
              <Text style={[s.scoreValue, { color: scoreColor }]}>{score}/100</Text>
              <Text style={s.scoreMessage} numberOfLines={2}>
                {todayReport.analysis?.motivational_message ?? ''}
              </Text>
            </View>
            <Text style={s.scoreEmoji}>
              {alertLevel === 'green' ? '🏆' : alertLevel === 'yellow' ? '⚡' : '⚠️'}
            </Text>
          </View>
        )}

        {/* Card do perfil */}
        <View style={s.profileCard}>
          <Text style={s.profileTitle}>Seu Perfil</Text>
          <View style={s.profileGrid}>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>Objetivo</Text>
              <Text style={s.profileValue}>{GOAL_LABELS[profile?.goal] ?? profile?.goal ?? '—'}</Text>
            </View>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>Nível</Text>
              <Text style={s.profileValue}>{LEVEL_LABELS[profile?.fitness_level] ?? profile?.fitness_level ?? '—'}</Text>
            </View>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>Peso atual</Text>
              <Text style={s.profileValue}>{profile?.current_weight_kg ? `${profile.current_weight_kg}kg` : '—'}</Text>
            </View>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>Dias/semana</Text>
              <Text style={s.profileValue}>{profile?.weekly_days ?? '—'}x</Text>
            </View>
          </View>
        </View>

        {/* CTA principal — gerar protocolo */}
        <TouchableOpacity
          style={s.ctaPrimary}
          onPress={() => navigation.navigate('Plan', { profile })}
        >
          <Text style={s.ctaPrimaryEmoji}>🤖</Text>
          <View style={s.ctaTextWrap}>
            <Text style={s.ctaPrimaryTitle}>
              {hasPlan ? 'Ver meu Protocolo' : 'Gerar Protocolo com IA'}
            </Text>
            <Text style={s.ctaPrimarySubtitle}>
              {hasPlan ? 'Dieta + treino personalizados' : 'Dieta + treino personalizados para você'}
            </Text>
          </View>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* CTA secundário — relatório diário */}
        <TouchableOpacity
          style={[s.ctaSecondary, todayReport && s.ctaSecondaryDone]}
          onPress={() => navigation.navigate('Report', { profile })}
        >
          <Text style={s.ctaSecondaryEmoji}>{todayReport ? '✅' : '📋'}</Text>
          <View style={s.ctaTextWrap}>
            <Text style={s.ctaSecondaryTitle}>
              {todayReport ? 'Relatório enviado hoje' : 'Relatório Diário'}
            </Text>
            <Text style={s.ctaSecondarySubtitle}>
              {todayReport ? 'Toque para ver sua análise' : 'Registre seu dia e receba análise da IA'}
            </Text>
          </View>
          <Text style={s.ctaArrowDark}>→</Text>
        </TouchableOpacity>

        {/* Stats do dia */}
        <Text style={s.sectionTitle}>Resumo do dia</Text>

        {loadingStats ? (
          <View style={s.statsLoading}>
            <ActivityIndicator color="#00FF88" size="small" />
          </View>
        ) : (
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>⚡</Text>
              <Text style={[s.statValue, todayReport && { color: '#00FF88' }]}>
                {todayReport ? `${todayReport.energy_level}/5` : '—'}
              </Text>
              <Text style={s.statLabel}>Energia</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>💧</Text>
              <Text style={[s.statValue, todayReport?.water_ml && { color: '#60A5FA' }]}>
                {todayReport?.water_ml ? `${(todayReport.water_ml / 1000).toFixed(1)}L` : '—'}
              </Text>
              <Text style={s.statLabel}>Hidratação</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>😴</Text>
              <Text style={[s.statValue, todayReport?.sleep_hours && { color: '#A78BFA' }]}>
                {todayReport?.sleep_hours ? `${todayReport.sleep_hours}h` : '—'}
              </Text>
              <Text style={s.statLabel}>Sono</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>💪</Text>
              <Text style={[s.statValue, { color: todayReport?.workout_completed ? '#00FF88' : '#F87171' }]}>
                {todayReport ? (todayReport.workout_completed ? 'Sim' : 'Não') : '—'}
              </Text>
              <Text style={s.statLabel}>Treino</Text>
            </View>
          </View>
        )}

        {/* Peso do dia */}
        {todayReport?.weight_kg && (
          <View style={s.weightCard}>
            <Text style={s.weightLabel}>⚖️ Peso de hoje</Text>
            <Text style={s.weightValue}>{todayReport.weight_kg} kg</Text>
          </View>
        )}

        {/* Aderência do dia */}
        {todayReport && (
          <View style={s.adherenceCard}>
            <View style={s.adherenceHeader}>
              <Text style={s.adherenceLabel}>Aderência ao plano</Text>
              <Text style={[s.adherencePercent, { color: scoreColor }]}>
                {todayReport.adherence_percent}%
              </Text>
            </View>
            <View style={s.adherenceBar}>
              <View style={[s.adherenceFill, {
                width: `${todayReport.adherence_percent}%` as any,
                backgroundColor: scoreColor,
              }]} />
            </View>
          </View>
        )}

        {/* Atualizar perfil */}
        <TouchableOpacity
          style={s.editProfileBtn}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={s.editProfileText}>✏️ Atualizar perfil</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  scroll: { flex: 1, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  email: { fontSize: 13, color: '#555', marginTop: 2 },
  signOutBtn: { backgroundColor: '#1A1A2E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  signOutText: { color: '#A0A0B0', fontWeight: '600', fontSize: 13 },
  scoreCard: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 2, backgroundColor: '#13131A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLeft: { flex: 1, gap: 4 },
  scoreLabel: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  scoreValue: { fontSize: 36, fontWeight: '800' },
  scoreMessage: { fontSize: 13, color: '#A0A0B0', lineHeight: 18, marginTop: 4 },
  scoreEmoji: { fontSize: 40 },
  profileCard: { backgroundColor: '#13131A', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1E1E2E' },
  profileTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  profileItem: { width: '47%', gap: 4 },
  profileLabel: { fontSize: 12, color: '#555' },
  profileValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  ctaPrimary: { backgroundColor: '#00FF88', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16 },
  ctaPrimaryEmoji: { fontSize: 32 },
  ctaTextWrap: { flex: 1 },
  ctaPrimaryTitle: { fontSize: 17, fontWeight: '800', color: '#000' },
  ctaPrimarySubtitle: { fontSize: 13, color: '#005533', marginTop: 2 },
  ctaArrow: { fontSize: 20, color: '#000', fontWeight: '800' },
  ctaSecondary: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16, borderWidth: 1, borderColor: '#2A2A3E' },
  ctaSecondaryDone: { borderColor: '#00FF88', backgroundColor: '#0D2E1A' },
  ctaSecondaryEmoji: { fontSize: 32 },
  ctaSecondaryTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  ctaSecondarySubtitle: { fontSize: 13, color: '#555', marginTop: 2 },
  ctaArrowDark: { fontSize: 20, color: '#555', fontWeight: '800' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  statsLoading: { height: 90, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#13131A', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1E1E2E' },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#555' },
  weightCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1E1E2E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightLabel: { fontSize: 14, color: '#A0A0B0', fontWeight: '600' },
  weightValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  adherenceCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1E1E2E', gap: 10 },
  adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adherenceLabel: { fontSize: 14, color: '#A0A0B0', fontWeight: '600' },
  adherencePercent: { fontSize: 18, fontWeight: '800' },
  adherenceBar: { height: 6, backgroundColor: '#1E1E2E', borderRadius: 3, overflow: 'hidden' },
  adherenceFill: { height: 6, borderRadius: 3 },
  editProfileBtn: { backgroundColor: '#13131A', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E2E' },
  editProfileText: { color: '#A0A0B0', fontWeight: '600', fontSize: 14 },
})