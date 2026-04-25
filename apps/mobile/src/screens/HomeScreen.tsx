// Home dashboard — exibe resumo do perfil e CTAs para gerar protocolo e relatório diário
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../App'
import { useAuth } from '../context/AuthContext'

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

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<Route>()
  const { signOut, user } = useAuth()
  const profile = route.params?.profile

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
            <Text style={s.ctaPrimaryTitle}>Gerar Protocolo com IA</Text>
            <Text style={s.ctaPrimarySubtitle}>Dieta + treino personalizados para você</Text>
          </View>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* CTA secundário — relatório diário */}
        <TouchableOpacity
          style={s.ctaSecondary}
          onPress={() => navigation.navigate('Report', { profile })}
        >
          <Text style={s.ctaSecondaryEmoji}>📋</Text>
          <View style={s.ctaTextWrap}>
            <Text style={s.ctaSecondaryTitle}>Relatório Diário</Text>
            <Text style={s.ctaSecondarySubtitle}>Registre seu dia e receba análise da IA</Text>
          </View>
          <Text style={s.ctaArrowDark}>→</Text>
        </TouchableOpacity>

        {/* Stats do dia */}
        <Text style={s.sectionTitle}>Resumo do dia</Text>
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>🔥</Text>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>Calorias</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>🥩</Text>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>Proteína</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>💧</Text>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>Hidratação</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>💪</Text>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>Treino</Text>
          </View>
        </View>

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
  ctaSecondaryEmoji: { fontSize: 32 },
  ctaSecondaryTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  ctaSecondarySubtitle: { fontSize: 13, color: '#555', marginTop: 2 },
  ctaArrowDark: { fontSize: 20, color: '#555', fontWeight: '800' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#13131A', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1E1E2E' },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#555' },
  editProfileBtn: { backgroundColor: '#13131A', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E2E' },
  editProfileText: { color: '#A0A0B0', fontWeight: '600', fontSize: 14 },
})