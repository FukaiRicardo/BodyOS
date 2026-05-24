// Home dashboard — exibe resumo do perfil e stats reais do dia via Supabase

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context'

import { RootStackParamList } from '../../../App'
import { useAuth } from '../../context/AuthContext'
import { useDatabase } from '../../context/DatabaseContext'
import { Report } from '../../lib/supabase'

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

const profile = route.params?.profile ?? {}


  const [todayReport, setTodayReport] = useState<Report | null>(null)
  const [hasPlan, setHasPlan] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)

  const [adapting, setAdapting] = useState(false)
  const [adaptationResult, setAdaptationResult] = useState<any>(null)
  const [showAdaptModal, setShowAdaptModal] = useState(false)

  // =========================================================
  // DASHBOARD
  // =========================================================

  const fetchDashboardData = useCallback(async () => {

    setLoadingStats(true)

    try {

      const [reportResult, planResult] = await Promise.all([
        loadTodayReport(),
        loadLatestPlan(),
      ])

      setTodayReport(reportResult?.data ?? null)
      setHasPlan(!!planResult?.data)

    } catch (err) {

      console.error('Erro dashboard:', err)

    } finally {

      setLoadingStats(false)
    }

  }, [loadTodayReport, loadLatestPlan])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // =========================================================
  // ANALYSIS
  // =========================================================

  const analysisData =
  todayReport?.analysis?.analise_diaria ??
  todayReport?.analysis ??
  null

  const score =
    analysisData?.overall_score ??
    analysisData?.pontuacao_geral

  const rawAlertLevel =
    analysisData?.alert_level ??
    analysisData?.nivel_alerta

  const alertLevel =
    rawAlertLevel === 'verde'
      ? 'green'
      : rawAlertLevel === 'amarelo'
      ? 'yellow'
      : rawAlertLevel === 'vermelho'
      ? 'red'
      : rawAlertLevel ?? 'green'

  const scoreColor =
    ALERT_COLORS[alertLevel] ?? '#00FF88'

  const motivationalMessage =
    analysisData?.motivational_message ??
    analysisData?.mensagem_motivacional ??
    ''

  // =========================================================
  // ADAPT PROTOCOL
  // =========================================================

async function handleAdaptProtocol() {
  setAdapting(true)

  try {
    const response = await adaptProtocol()

    let rawData =
      response?.data?.adaptation ||
      response?.data ||
      response

    if (typeof rawData === 'string') {
      try {
        rawData = JSON.parse(rawData)
      } catch (parseError) {
        console.error('Erro ao converter JSON:', parseError)
      }
    }

    const hasValidData =
      rawData &&
      typeof rawData === 'object' &&
      (
        rawData.adjustment_reason ||
        rawData.changes_made ||
        rawData.new_calories ||
        rawData.new_workout_focus
      )

    if (hasValidData) {
      setAdaptationResult(rawData)
      setShowAdaptModal(true)

      await fetchDashboardData()

      return
    }

    Alert.alert(
      'Erro',
      'A IA não retornou dados válidos.'
    )

  } catch (err: any) {
    console.error('ERRO HANDLE ADAPT:')
    console.error(err)

    Alert.alert(
      'Erro',
      err?.message || 'Falha ao adaptar protocolo.'
    )
  } finally {
    setAdapting(false)
  }
}

  return (
    <SafeAreaView style={s.container}>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}

        <View style={s.header}>

          <View>

            <Text style={s.greeting}>
              {t('home.greeting')}
            </Text>

            <Text style={s.email}>
              {user?.email}
            </Text>

          </View>

          <TouchableOpacity
            style={s.signOutBtn}
            onPress={signOut}
          >

            <Text style={s.signOutText}>
              {t('home.signOut')}
            </Text>

          </TouchableOpacity>

        </View>

        {/* PROFILE */}

        <View style={s.profileCard}>

          <Text style={s.profileTitle}>
            {t('home.profileTitle')}
          </Text>

          <View style={s.profileGrid}>

   <TouchableOpacity
  style={s.editProfileBtn}
  onPress={() => navigation.navigate('EditProfile')}
>
  <Text style={s.editProfileBtnText}>✏️ Editar Perfil</Text>
</TouchableOpacity>

            <View style={s.profileItem}>

              <Text style={s.profileLabel}>
                {t('home.profileGoal')}
              </Text>

              <Text style={s.profileValue}>
                {profile?.goal
                  ? t(`goals.${profile.goal}`, {
                      defaultValue: profile.goal,
                    })
                  : '—'}
              </Text>

            </View>

            <View style={s.profileItem}>

              <Text style={s.profileLabel}>
                {t('home.profileLevel')}
              </Text>

              <Text style={s.profileValue}>
                {profile?.fitness_level
                  ? t(`levels.${profile.fitness_level}`, {
                      defaultValue: profile.fitness_level,
                    })
                  : '—'}
              </Text>

            </View>

            <View style={s.profileItem}>

              <Text style={s.profileLabel}>
                {t('home.profileWeight')}
              </Text>

              <Text style={s.profileValue}>
                {profile?.current_weight_kg != null
  ? `${profile.current_weight_kg}kg`
  : '—'}
              </Text>

            </View>

            <View style={s.profileItem}>

              <Text style={s.profileLabel}>
                {t('home.profileDays')}
              </Text>

              <Text style={s.profileValue}>
                {profile?.weekly_days
  ? `${profile.weekly_days}x`
  : '—'}
              </Text>

            </View>

          </View>

        </View>

        {/* CTA */}

        <TouchableOpacity
          style={s.ctaPrimary}
          onPress={() =>
            navigation.navigate('Plan', { profile })
          }
        >

          <Text style={s.ctaPrimaryEmoji}>🤖</Text>

          <View style={s.ctaTextWrap}>

            <Text style={s.ctaPrimaryTitle}>
              {hasPlan
                ? t('home.ctaPlanTitle_existing')
                : t('home.ctaPlanTitle_new')}
            </Text>

            <Text style={s.ctaPrimarySubtitle}>
              {hasPlan
                ? t('home.ctaPlanSubtitle_existing')
                : t('home.ctaPlanSubtitle_new')}
            </Text>

          </View>

          <Text style={s.ctaArrow}>→</Text>

        </TouchableOpacity>

        {/* ADAPT BUTTON */}

        {hasPlan && (

          <TouchableOpacity
            style={[
              s.adaptBtn,
              adapting && s.adaptBtnDisabled,
            ]}
            onPress={handleAdaptProtocol}
            disabled={adapting}
          >

            {adapting ? (

              <View style={s.adaptBtnInner}>

                <ActivityIndicator
                  color="#A78BFA"
                  size="small"
                />

                <Text style={s.adaptBtnText}>
                  Adaptando...
                </Text>

              </View>

            ) : (

              <View style={s.adaptBtnInner}>

                <Text style={s.adaptBtnEmoji}>
                  🔄
                </Text>

                <View style={{ flex: 1 }}>

                  <Text style={s.adaptBtnText}>
                    Adaptar protocolo
                  </Text>

                  <Text style={s.adaptBtnSub}>
                    IA ajusta com base no seu histórico
                  </Text>

                </View>

              </View>

            )}

          </TouchableOpacity>

        )}

        {/* RESUMO DO DIA */}

<View style={s.sectionHeader}>
  <Text style={s.sectionTitle}>
    RESUMO DO DIA
  </Text>
</View>

<View style={s.statsGrid}>

  <View style={s.statCard}>
    <Text style={s.statEmoji}>⚡</Text>

    <Text style={s.statValue}>
      —
    </Text>

    <Text style={s.statLabel}>
      Energia
    </Text>
  </View>

  <View style={s.statCard}>
    <Text style={s.statEmoji}>💧</Text>

    <Text style={s.statValue}>
      —
    </Text>

    <Text style={s.statLabel}>
      Água
    </Text>
  </View>

  <View style={s.statCard}>
    <Text style={s.statEmoji}>😴</Text>

    <Text style={s.statValue}>
      —h
    </Text>

    <Text style={s.statLabel}>
      Sono
    </Text>
  </View>

  <View style={s.statCard}>
    <Text style={s.statEmoji}>💪</Text>

    <Text style={s.statValue}>
      Não
    </Text>

    <Text style={s.statLabel}>
      Treino
    </Text>
  </View>

</View>

<TouchableOpacity
  style={s.progressBtn}
  onPress={() => navigation.navigate('Progress')}
>
  <Text style={s.progressBtnText}>
    📈 Ver meu progresso
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={s.updateBtn}
 onPress={() =>
  navigation.navigate('Report', {
    profile,
  })
}
>
  <Text style={s.updateBtnText}>
     📝 Registrar meu dia
  </Text>
</TouchableOpacity>


      </ScrollView>

      {/* MODAL */}

      <Modal
        visible={showAdaptModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowAdaptModal(false)
        }
      >

        <View style={s.modalOverlay}>

          <View style={s.modalCard}>

            <ScrollView>

              <Text style={s.modalTitle}>
                Protocolo Atualizado
              </Text>

              {adaptationResult && (

                <>

                  <View style={s.modalSection}>

                    <Text style={s.modalLabel}>
                      Motivo
                    </Text>

                    <Text style={s.modalText}>
                      {adaptationResult.adjustment_reason}
                    </Text>

                  </View>

                  <View style={s.modalSection}>

                    <Text style={s.modalLabel}>
                      Mudanças
                    </Text>

                    <Text style={s.modalText}>
                      {adaptationResult.changes_made}
                    </Text>

                  </View>

                  {!!adaptationResult.new_calories && (

                    <View style={s.modalSection}>

                      <Text style={s.modalLabel}>
                        Novas calorias
                      </Text>

                      <Text
                        style={[
                          s.modalText,
                          {
                            color: '#00FF88',
                            fontSize: 24,
                            fontWeight: '800',
                          },
                        ]}
                      >
                        {adaptationResult.new_calories} kcal
                      </Text>

                    </View>

                  )}

                  {!!adaptationResult.new_workout_focus && (

                    <View style={s.modalSection}>

                      <Text style={s.modalLabel}>
                        Novo foco
                      </Text>

                      <Text style={s.modalText}>
                        {adaptationResult.new_workout_focus}
                      </Text>

                    </View>

                  )}

                </>

              )}

              <TouchableOpacity
                style={s.modalBtn}
                onPress={() => {

                  setShowAdaptModal(false)

                  navigation.navigate('Plan', {
                    profile,
                  })
                }}
              >

                <Text style={s.modalBtnText}>
                  Ver protocolo
                </Text>

              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalBtnSecondary}
                onPress={() =>
                  setShowAdaptModal(false)
                }
              >

                <Text style={s.modalBtnSecondaryText}>
                  Fechar
                </Text>

              </TouchableOpacity>

            </ScrollView>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },

  scroll: {
    flex: 1,
    padding: 24,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  email: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },

  signOutBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  signOutText: {
    color: '#A0A0B0',
    fontWeight: '600',
    fontSize: 13,
  },

  scoreCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    backgroundColor: '#13131A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scoreLeft: {
    flex: 1,
    gap: 4,
  },

  scoreLabel: {
    fontSize: 12,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
  },

  scoreMessage: {
    fontSize: 13,
    color: '#A0A0B0',
    lineHeight: 18,
    marginTop: 4,
  },

  scoreEmoji: {
    fontSize: 40,
  },

  profileCard: {
    backgroundColor: '#13131A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },

  profileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  profileItem: {
    width: '47%',
    gap: 4,
  },

  profileLabel: {
    fontSize: 12,
    color: '#555',
  },

  profileValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  ctaPrimary: {
    backgroundColor: '#00FF88',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },

  ctaPrimaryEmoji: {
    fontSize: 32,
  },

  ctaTextWrap: {
    flex: 1,
  },

  ctaPrimaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
  },

  ctaPrimarySubtitle: {
    fontSize: 13,
    color: '#005533',
    marginTop: 2,
  },

  ctaArrow: {
    fontSize: 20,
    color: '#000',
    fontWeight: '800',
  },

  adaptBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A78BFA',
  },

  adaptBtnDisabled: {
    opacity: 0.6,
  },

  adaptBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  adaptBtnEmoji: {
    fontSize: 32,
  },

  adaptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A78BFA',
  },

  adaptBtnSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
    flexShrink: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },

  modalSection: {
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 12,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },

  modalText: {
    fontSize: 15,
    color: '#A0A0B0',
    lineHeight: 22,
  },

  modalBtn: {
    backgroundColor: '#00FF88',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },

  modalBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },

  modalBtnSecondary: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },

  modalBtnSecondaryText: {
    color: '#A0A0B0',
    fontWeight: '600',
    fontSize: 15,
  },

    sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#13131A',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E2E',
  },

  statEmoji: {
    fontSize: 26,
    marginBottom: 10,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  progressBtn: {
    backgroundColor: '#13131A',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },

  progressBtnText: {
    color: '#00FF88',
    fontSize: 18,
    fontWeight: '800',
  },

 updateBtn: {
  backgroundColor: '#1A1A2E',
  borderRadius: 16,
  padding: 18,
  alignItems: 'center',
  marginBottom: 30,
  borderWidth: 1,
  borderColor: '#2A2A3E',
},
updateBtnText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
editProfileBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 16,
  backgroundColor: '#1A1A2E',
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  alignSelf: 'flex-start',
  borderWidth: 1,
  borderColor: '#00FF87',
},
editProfileBtnText: {
  color: '#00FF87',
  fontSize: 13,
  fontWeight: '600',
},
})