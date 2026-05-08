import 'react-native-url-polyfill/auto'
import React, { useEffect, useState, useRef } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { DatabaseProvider, useDatabase } from './src/context/DatabaseContext'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import HomeScreen from './src/screens/HomeScreen'
import PlanScreen from './src/screens/PlanScreen'
import ReportScreen from './src/screens/ReportScreen'
import ProgressScreen from './src/screens/ProgressScreen'

export type UserProfile = {
  goal: string
  fitness_level: string
  weekly_days: number
  age: string
  gender: string
  current_weight_kg: string
  target_weight_kg: string
  height_cm: string
}

export type RootStackParamList = {
  Login: undefined
  Register: undefined
  Onboarding: undefined
  Home: { profile: UserProfile }
  Plan: { profile: UserProfile }
  Report: { profile: UserProfile }
  Progress: { profile: UserProfile }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function AppNavigator() {
  const { session, loading } = useAuth()
  const { loadProfile } = useDatabase()
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null)

  useEffect(() => {
    async function checkProfile() {
      if (!session) {
        setCheckingProfile(false)
        setReady(true)
        return
      }
      const { data } = await loadProfile()
      if (data) {
        const profile: UserProfile = {
          goal: data.goal,
          fitness_level: data.fitness_level,
          weekly_days: data.weekly_days,
          age: data.age?.toString() ?? '',
          gender: data.gender ?? '',
          current_weight_kg: data.current_weight_kg?.toString() ?? '',
          target_weight_kg: data.target_weight_kg?.toString() ?? '',
          height_cm: data.height_cm?.toString() ?? '',
        }
        setExistingProfile(profile)
      }
      setCheckingProfile(false)
      setReady(true)
    }
    checkProfile()
  }, [session])

  useEffect(() => {
    if (!ready || !navigationRef.current) return
    if (session && existingProfile) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Home', params: { profile: existingProfile } }],
      })
    } else if (session && !existingProfile) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      })
    } else {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    }
  }, [ready, session, existingProfile])

  if (loading || (session && checkingProfile)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#00FF88" size="large" />
      </View>
    )
  }

  return (
  <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator
        id="main-stack" // <--- Adicione esta linha aqui
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0F' },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Plan" component={PlanScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <AppNavigator />
      </DatabaseProvider>
    </AuthProvider>
  )
} 