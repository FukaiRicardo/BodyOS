import 'react-native-url-polyfill/auto'
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import HomeScreen from './src/screens/HomeScreen'
import PlanScreen from './src/screens/PlanScreen'
import ReportScreen from './src/screens/ReportScreen'

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
}

const Stack = createNativeStackNavigator<RootStackParamList>()

// Navegação separada por estado de auth — evita flash de tela errada
function AppNavigator() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#00FF88" size="large" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      {session ? (
        // Usuário autenticado
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Plan" component={PlanScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
        </>
      ) : (
        // Usuário não autenticado
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}