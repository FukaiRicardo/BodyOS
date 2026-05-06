import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { RootStackParamList } from '../../App'
import { useDatabase } from '../context/DatabaseContext'
import { Report } from '../lib/supabase'

type Route = RouteProp<RootStackParamList, 'Progress'>

const SCREEN_WIDTH = Dimensions.get('window').width - 48

const CHART_CONFIG = {
  backgroundColor: '#13131A',
  backgroundGradientFrom: '#13131A',
  backgroundGradientTo: '#13131A',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 255, 136, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(160, 160, 176, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#00FF88' },
  propsForBackgroundLines: { stroke: '#1E1E2E' },
}

export default function ProgressScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<Route>()
  const profile = route.params?.profile
  const { loadReports } = useDatabase()
  const { t } = useTranslation()

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'score' | 'weight' | 'adherence'>('score')

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data } = await loadReports(14)
      setReports([...data].reverse())
      setLoading(false)
    }
    fetch()
  }, [])

  function formatDate(dateStr: string): string {
    const [, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }

  const scoreData = reports.filter(r => r.analysis?.overall_score != null)
  const scoreChartData = {
    labels: scoreData.slice(-7).map(r => formatDate(r.date)),
    datasets: [{ data: scoreData.slice(-7).map(r => r.analysis.overall_score) }],
  }

  const weightData = reports.filter(r => r.weight_kg != null)
  const weightChartData = {
    labels: weightData.slice(-7).map(r => formatDate(r.date)),
    datasets: [{
      data: weightData.slice(-7).map(r => r.weight_kg!),
      color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
    }],
  }

  const adherenceData = reports.slice(-7)
  const adherenceChartData = {
    labels: adherenceData.map(r => formatDate(r.date)),
    datasets: [{ data: adherenceData.map(r => r.adherence_percent) }],
  }

  const totalDays = reports.length
  const trainedDays = reports.filter(r => r.workout_completed).length
  const avgScore = reports.length > 0
    ? Math.round(reports.filter(r => r.analysis?.overall_score).reduce((sum, r) => sum + r.analysis.overall_score, 0) / reports.filter(r => r.analysis?.overall_score).length)
    : 0
  const avgAdherence = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.adherence_percent, 0) / reports.length)
    : 0
  const avgSleep = reports.filter(r => r.sleep_hours).length > 0
    ? (reports.filter(r => r.sleep_hours).reduce((sum, r) => sum + (r.sleep_hours ?? 0), 0) / reports.filter(r => r.sleep_hours).length).toFixed(1)
    : '—'

  const hasData = reports.length > 0

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('progress.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00FF88" />
            <Text style={s.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : !hasData ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📈</Text>
            <Text style={s.emptyTitle}>{t('progress.noData')}</Text>
            <Text style={s.emptyText}>{t('progress.noDataDesc')}</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionTitle}>{t('progress.generalSummary')}</Text>
            <View style={s.statsGrid}>
              <View style={s.statCard}>
                <Text style={s.statEmoji}>📅</Text>
                <Text style={s.statValue}>{totalDays}</Text>
                <Text style={s.statLabel}>{t('progress.days')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statEmoji}>💪</Text>
                <Text style={[s.statValue, { color: '#00FF88' }]}>{trainedDays}</Text>
                <Text style={s.statLabel}>{t('progress.workoutsCompleted')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statEmoji}>⭐</Text>
                <Text style={[s.statValue, { color: '#F59E0B' }]}>{avgScore || '—'}</Text>
                <Text style={s.statLabel}>{t('progress.avgScore')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statEmoji}>😴</Text>
                <Text style={[s.statValue, { color: '#A78BFA' }]}>{avgSleep}{t('progress.hours')}</Text>
                <Text style={s.statLabel}>{t('progress.avgSleep')}</Text>
              </View>
            </View>

            <View style={s.adherenceCard}>
              <View style={s.adherenceHeader}>
                <Text style={s.adherenceLabel}>{t('progress.avgAdherence')}</Text>
                <Text style={s.adherencePercent}>{avgAdherence}%</Text>
              </View>
              <View style={s.adherenceBar}>
                <View style={[s.adherenceFill, { width: `${avgAdherence}%` as any }]} />
              </View>
            </View>

            <Text style={s.sectionTitle}>{t('progress.last7days')}</Text>
            <View style={s.tabs}>
              {[
                { id: 'score', label: `⭐ ${t('progress.score')}` },
                { id: 'weight', label: `⚖️ ${t('progress.weight')}` },
                { id: 'adherence', label: `📊 ${t('progress.adherenceEvolution')}` },
              ].map(tabItem => (
                <TouchableOpacity
                  key={tabItem.id}
                  style={[s.tab, tab === tabItem.id && s.tabActive]}
                  onPress={() => setTab(tabItem.id as any)}
                >
                  <Text style={[s.tabText, tab === tabItem.id && s.tabTextActive]}>{tabItem.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'score' && scoreData.length > 1 && (
              <View style={s.chartCard}>
                <LineChart
                  data={scoreChartData}
                  width={SCREEN_WIDTH}
                  height={200}
                  chartConfig={CHART_CONFIG}
                  bezier
                  style={s.chart}
                  withInnerLines={true}
                  withOuterLines={false}
                />
                <Text style={s.chartNote}>{t('progress.scoreNote')}</Text>
              </View>
            )}

            {tab === 'score' && scoreData.length <= 1 && (
              <View style={s.noChartData}>
                <Text style={s.noChartText}>{t('progress.needMoreReports')}</Text>
              </View>
            )}

            {tab === 'weight' && weightData.length > 1 && (
              <View style={s.chartCard}>
                <LineChart
                  data={weightChartData}
                  width={SCREEN_WIDTH}
                  height={200}
                  chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#60A5FA' },
                  }}
                  bezier
                  style={s.chart}
                  withInnerLines={true}
                  withOuterLines={false}
                  yAxisSuffix=" kg"
                />
                <Text style={s.chartNote}>{t('progress.weightNote')}</Text>
              </View>
            )}

            {tab === 'weight' && weightData.length <= 1 && (
              <View style={s.noChartData}>
                <Text style={s.noChartText}>{t('progress.needMoreWeight')}</Text>
              </View>
            )}

            {tab === 'adherence' && adherenceData.length > 0 && (
              <View style={s.chartCard}>
                <BarChart
                  data={adherenceChartData}
                  width={SCREEN_WIDTH}
                  height={200}
                  chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                  }}
                  style={s.chart}
                  withInnerLines={true}
                  showValuesOnTopOfBars={true}
                  yAxisLabel=""
                  yAxisSuffix="%"
                />
                <Text style={s.chartNote}>{t('progress.adherenceNote')}</Text>
              </View>
            )}

            <Text style={s.sectionTitle}>{t('progress.history')}</Text>
            {[...reports].reverse().slice(0, 10).map((report, i) => (
              <View key={i} style={s.reportRow}>
                <View style={s.reportLeft}>
                  <Text style={s.reportDate}>{formatDate(report.date)}</Text>
                  <Text style={s.reportMood}>{report.mood ?? '—'}</Text>
                </View>
                <View style={s.reportMid}>
                  <Text style={s.reportStat}>⚡ {report.energy_level}/5</Text>
                  <Text style={s.reportStat}>💪 {report.workout_completed ? t('report.yes') : t('report.no')}</Text>
                </View>
                <View style={s.reportRight}>
                  {report.analysis?.overall_score != null && (
                    <View style={[s.scoreBadge, {
                      backgroundColor: report.analysis.alert_level === 'green'
                        ? '#0D2E1A' : report.analysis.alert_level === 'yellow'
                        ? '#2E1A0D' : '#2E0D0D'
                    }]}>
                      <Text style={[s.scoreBadgeText, {
                        color: report.analysis.alert_level === 'green'
                          ? '#00FF88' : report.analysis.alert_level === 'yellow'
                          ? '#F59E0B' : '#F87171'
                      }]}>
                        {report.analysis.overall_score}
                      </Text>
                    </View>
                  )}
                  <Text style={s.reportAdherence}>{report.adherence_percent}%</Text>
                </View>
              </View>
            ))}

            <View style={{ height: 32 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  back: { color: '#00FF88', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  loadingBox: { alignItems: 'center', paddingTop: 80, gap: 24 },
  loadingText: { color: '#A0A0B0', fontSize: 16 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  emptyText: { fontSize: 16, color: '#A0A0B0', textAlign: 'center', lineHeight: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#13131A', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1E1E2E' },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: '#555', textAlign: 'center' },
  adherenceCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1E1E2E', gap: 10 },
  adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adherenceLabel: { fontSize: 14, color: '#A0A0B0', fontWeight: '600' },
  adherencePercent: { fontSize: 18, fontWeight: '800', color: '#00FF88' },
  adherenceBar: { height: 6, backgroundColor: '#1E1E2E', borderRadius: 3, overflow: 'hidden' },
  adherenceFill: { height: 6, borderRadius: 3, backgroundColor: '#00FF88' },
  tabs: { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#00FF88' },
  tabText: { color: '#A0A0B0', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#0A0A0F' },
  chartCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1E1E2E', alignItems: 'center' },
  chart: { borderRadius: 12, marginLeft: -16 },
  chartNote: { fontSize: 12, color: '#555', marginTop: 8, textAlign: 'center' },
  noChartData: { backgroundColor: '#13131A', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E2E' },
  noChartText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  reportRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E1E2E' },
  reportLeft: { width: 52, gap: 4 },
  reportDate: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  reportMood: { fontSize: 11, color: '#555' },
  reportMid: { flex: 1, gap: 4, paddingHorizontal: 12 },
  reportStat: { fontSize: 12, color: '#A0A0B0' },
  reportRight: { alignItems: 'flex-end', gap: 4 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreBadgeText: { fontSize: 14, fontWeight: '800' },
  reportAdherence: { fontSize: 12, color: '#555' },
})
