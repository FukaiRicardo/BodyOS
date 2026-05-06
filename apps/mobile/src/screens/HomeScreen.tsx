// Home dashboard — exibe resumo do perfil e stats reais do dia via Supabase
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../App'
import { useAuth } from '../context/AuthContext'
import { useDatabase } from '../context/DatabaseContext'
import { Report } from '../lib/supabase'

type Route = RouteProp<RootStackParamList, 'Home'>

const ALERT_COLORS: Record<string, string> = {
  green: '#00FF88',
  yellow: '#F59E0B',
  red: '#F87171',
}

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<Route>()
  const { signOut, user } = useAuth()
  const { loadTodayReport, loadLatestPlan, adaptProtocol } = useDatabase()
  const { t } = useTranslation()
  const profile = route.params?.profile

  const [todayReport, setTodayReport] = useState<Report | null>(null)
  const [hasPlan, setHasPlan] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [adapting, setAdapting] = useState(false)
  const [adaptationResult, setAdaptationResult] = useState<any>(null)
  const [showAdaptModal, setShowAdaptModal] = useState(false)

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

  const analysisData = todayReport?.analysis?.analise_diaria !== undefined
    ? todayReport?.analysis?.analise_diaria
    : todayReport?.analysis
  const score = analysisData?.overall_score ?? analysisData?.pontuacao_geral
  const rawAlertLevel = analysisData?.alert_level ?? analysisData?.nivel_alerta
  const alertLevel = rawAlertLevel === 'verde' ? 'green'
    : rawAlertLevel === 'amarelo' ? 'yellow'
    : rawAlertLevel === 'vermelho' ? 'red'
    : rawAlertLevel ?? 'green'
  const scoreColor = ALERT_COLORS[alertLevel] ?? '#00FF88'
  const motivationalMessage = analysisData?.motivational_message ?? analysisData?.mensagem_motivacional ?? ''

  async function handleAdaptProtocol() {
    setAdapting(true)
    const { data, error } = await adaptProtocol()
    setAdapting(false)

    if (error) {
      Alert.alert(t('home.adaptError'), typeof error === 'string' ? error : t('common.retry'))
      return
    }

    setAdaptationResult(data?.adaptation)
    setShowAdaptModal(true)
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{t('home.greeting')}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
            <Text style={s.signOutText}>{t('home.signOut')}</Text>
          </TouchableOpacity>
        </View>

        {/* Score do dia */}
        {todayReport && score !== undefined && score !== null && (
          <View style={[s.scoreCard, { borderColor: scoreColor }]}>
            <View style={s.scoreLeft}>
              <Text style={s.scoreLabel}>{t('home.scoreLabel')}</Text>
              <Text style={[s.scoreValue, { color: scoreColor }]}>{score}/100</Text>
              <Text style={s.scoreMessage} numberOfLines={2}>{motivationalMessage}</Text>
            </View>
            <Text style={s.scoreEmoji}>
              {alertLevel === 'green' ? '🏆' : alertLevel === 'yellow' ? '⚡' : '⚠️'}
            </Text>
          </View>
        )}

        {/* Card do perfil */}
        <View style={s.profileCard}>
          <Text style={s.profileTitle}>{t('home.profileTitle')}</Text>
          <View style={s.profileGrid}>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>{t('home.profileGoal')}</Text>
              <Text style={s.profileValue}>
                {profile?.goal ? t(`goals.${profile.goal}`, { defaultValue: profile.goal }) : '—'}
              </Text>
            </View>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>{t('home.profileLevel')}</Text>
              <Text style={s.profileValue}>
                {profile?.fitness_level ? t(`levels.${profile.fitness_level}`, { defaultValue: profile.fitness_level }) : '—'}
              </Text>
            </View>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>{t('home.profileWeight')}</Text>
              <Text style={s.profileValue}>{profile?.current_weight_kg ? `${profile.current_weight_kg}kg` : '—'}</Text>
            </View>
            <View style={s.profileItem}>
              <Text style={s.profileLabel}>{t('home.profileDays')}</Text>
              <Text style={s.profileValue}>{profile?.weekly_days ?? '—'}x</Text>
            </View>
          </View>
        </View>

        {/* CTA principal */}
        <TouchableOpacity
          style={s.ctaPrimary}
          onPress={() => navigation.navigate('Plan', { profile })}
        >
          <Text style={s.ctaPrimaryEmoji}>🤖</Text>
          <View style={s.ctaTextWrap}>
            <Text style={s.ctaPrimaryTitle}>
              {hasPlan ? t('home.ctaPlanTitle_existing') : t('home.ctaPlanTitle_new')}
            </Text>
            <Text style={s.ctaPrimarySubtitle}>
              {hasPlan ? t('home.ctaPlanSubtitle_existing') : t('home.ctaPlanSubtitle_new')}
            </Text>
          </View>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* CTA secundário */}
        <TouchableOpacity
          style={[s.ctaSecondary, todayReport && s.ctaSecondaryDone]}
          onPress={() => navigation.navigate('Report', { profile })}
        >
          <Text style={s.ctaSecondaryEmoji}>{todayReport ? '✅' : '📋'}</Text>
          <View style={s.ctaTextWrap}>
            <Text style={s.ctaSecondaryTitle}>
              {todayReport ? t('home.ctaReportTitle_done') : t('home.ctaReportTitle_pending')}
            </Text>
            <Text style={s.ctaSecondarySubtitle}>
              {todayReport ? t('home.ctaReportSubtitle_done') : t('home.ctaReportSubtitle_pending')}
            </Text>
          </View>
          <Text style={s.ctaArrowDark}>→</Text>
        </TouchableOpacity>

        {/* Botão adaptar protocolo */}
        {hasPlan && (
          <TouchableOpacity
            style={[s.adaptBtn, adapting && s.adaptBtnDisabled]}
            onPress={handleAdaptProtocol}
            disabled={adapting}
          >
            {adapting ? (
              <View style={s.adaptBtnInner}>
                <ActivityIndicator color="#A78BFA" size="small" />
                <Text style={s.adaptBtnText}>{t('home.adaptingBtn')}</Text>
              </View>
            ) : (
              <View style={s.adaptBtnInner}>
                <Text style={s.adaptBtnEmoji}>🔄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.adaptBtnText}>{t('home.adaptBtn')}</Text>
                  <Text style={s.adaptBtnSub}>{t('home.adaptBtnSub')}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Stats do dia */}
        <Text style={s.sectionTitle}>{t('home.sectionSummary')}</Text>

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
              <Text style={s.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.stats.energy')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>💧</Text>
              <Text style={[s.statValue, todayReport?.water_ml != null && { color: '#60A5FA' }]}>
                {todayReport?.water_ml ? `${(todayReport.water_ml / 1000).toFixed(1)}L` : '—'}
              </Text>
              <Text style={s.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.stats.water')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>😴</Text>
              <Text style={[s.statValue, todayReport?.sleep_hours != null && { color: '#A78BFA' }]}>
                {todayReport?.sleep_hours ? `${todayReport.sleep_hours}h` : '—'}
              </Text>
              <Text style={s.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.stats.sleep')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statEmoji}>💪</Text>
              <Text style={[s.statValue, { color: todayReport?.workout_completed ? '#00FF88' : '#F87171' }]}>
                {todayReport ? (todayReport.workout_completed ? t('home.stats.workoutYes') : t('home.stats.workoutNo')) : '—'}
              </Text>
              <Text style={s.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.stats.workout')}</Text>
            </View>
          </View>
        )}

        {/* Peso do dia */}
        {todayReport?.weight_kg && (
          <View style={s.weightCard}>
            <Text style={s.weightLabel}>{t('home.stats.weightToday')}</Text>
            <Text style={s.weightValue}>{todayReport.weight_kg} kg</Text>
          </View>
        )}

        {/* Aderência do dia */}
        {todayReport && (
          <View style={s.adherenceCard}>
            <View style={s.adherenceHeader}>
              <Text style={s.adherenceLabel}>{t('home.stats.adherence')}</Text>
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

        {/* Botão de progresso */}
        <TouchableOpacity
          style={s.progressBtn}
          onPress={() => navigation.navigate('Progress', { profile })}
        >
          <Text style={s.progressBtnText}>{t('home.progressBtn')}</Text>
        </TouchableOpacity>

        {/* Atualizar perfil */}
        <TouchableOpacity
          style={s.editProfileBtn}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={s.editProfileText}>{t('home.editProfileBtn')}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal de resultado da adaptação */}
      <Modal
        visible={showAdaptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdaptModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{t('home.modal.title')}</Text>

              {adaptationResult && (
                <>
                  <View style={s.modalSection}>
                    <Text style={s.modalLabel}>{t('home.modal.reasonLabel')}</Text>
                    <Text style={s.modalText}>
                      {adaptationResult.adaptation_reason ?? adaptationResult.motivo_adaptacao ?? '—'}
                    </Text>
                  </View>

                  {(adaptationResult.changes ?? adaptationResult.mudancas)?.length > 0 && (
                    <View style={s.modalSection}>
                      <Text style={s.modalLabel}>{t('home.modal.changesLabel')}</Text>
                      {(adaptationResult.changes ?? adaptationResult.mudancas).map((c: string, i: number) => (
                        <Text key={i} style={s.modalItem}>• {c}</Text>
                      ))}
                    </View>
                  )}

                  {(adaptationResult.new_calorie_target ?? adaptationResult.novo_alvo_calorico) && (
                    <View style={s.modalSection}>
                      <Text style={s.modalLabel}>{t('home.modal.calorieLabel')}</Text>
                      <Text style={[s.modalText, { color: '#00FF88', fontSize: 20, fontWeight: '800' }]}>
                        {adaptationResult.new_calorie_target ?? adaptationResult.novo_alvo_calorico} kcal
                      </Text>
                    </View>
                  )}

                  {(adaptationResult.recovery_recommendation ?? adaptationResult.recomendacao_recuperacao) && (
                    <View style={s.modalSection}>
                      <Text style={s.modalLabel}>{t('home.modal.recoveryLabel')}</Text>
                      <Text style={s.modalText}>
                        {adaptationResult.recovery_recommendation ?? adaptationResult.recomendacao_recuperacao}
                      </Text>
                    </View>
                  )}

                  <View style={[s.modalSection, s.modalClosingCard]}>
                    <Text style={s.modalClosing}>
                      {adaptationResult.coach_message ?? adaptationResult.mensagem_coach ?? ''}
                    </Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={s.modalBtn}
                onPress={() => {
                  setShowAdaptModal(false)
                  navigation.navigate('Plan', { profile })
                }}
              >
                <Text style={s.modalBtnText}>{t('home.modal.viewPlan')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalBtnSecondary}
                onPress={() => setShowAdaptModal(false)}
              >
                <Text style={s.modalBtnSecondaryText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  ctaSecondary: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16, borderWidth: 1, borderColor: '#2A2A3E' },
  ctaSecondaryDone: { borderColor: '#00FF88', backgroundColor: '#0D2E1A' },
  ctaSecondaryEmoji: { fontSize: 32 },
  ctaSecondaryTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  ctaSecondarySubtitle: { fontSize: 13, color: '#555', marginTop: 2 },
  ctaArrowDark: { fontSize: 20, color: '#555', fontWeight: '800' },
  adaptBtn: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#A78BFA' },
  adaptBtnDisabled: { opacity: 0.6 },
  adaptBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  adaptBtnEmoji: { fontSize: 32 },
  adaptBtnText: { fontSize: 16, fontWeight: '700', color: '#A78BFA' },
  adaptBtnSub: { fontSize: 12, color: '#555', marginTop: 2, flexShrink: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  statsLoading: { height: 90, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#13131A', borderRadius: 16, padding: 8, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#1E1E2E' },
  statEmoji: { fontSize: 16 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 9, color: '#555', textAlign: 'center' },
  weightCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1E1E2E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightLabel: { fontSize: 14, color: '#A0A0B0', fontWeight: '600' },
  weightValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  adherenceCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1E1E2E', gap: 10 },
  adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adherenceLabel: { fontSize: 14, color: '#A0A0B0', fontWeight: '600' },
  adherencePercent: { fontSize: 18, fontWeight: '800' },
  adherenceBar: { height: 6, backgroundColor: '#1E1E2E', borderRadius: 3, overflow: 'hidden' },
  adherenceFill: { height: 6, borderRadius: 3 },
  progressBtn: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3E', marginBottom: 12 },
  progressBtnText: { color: '#00FF88', fontWeight: '700', fontSize: 15 },
  editProfileBtn: { backgroundColor: '#13131A', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E2E' },
  editProfileText: { color: '#A0A0B0', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 24, textAlign: 'center' },
  modalSection: { marginBottom: 16 },
  modalLabel: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  modalText: { fontSize: 15, color: '#A0A0B0', lineHeight: 22 },
  modalItem: { fontSize: 14, color: '#A0A0B0', lineHeight: 24 },
  modalClosingCard: { backgroundColor: '#0D2E1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#00FF88' },
  modalClosing: { fontSize: 15, color: '#00FF88', textAlign: 'center', fontWeight: '600', lineHeight: 24 },
  modalBtn: { backgroundColor: '#00FF88', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  modalBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  modalBtnSecondary: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 },
  modalBtnSecondaryText: { color: '#A0A0B0', fontWeight: '600', fontSize: 15 },
})
