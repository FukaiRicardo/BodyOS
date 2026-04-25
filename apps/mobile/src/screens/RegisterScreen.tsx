import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { useAuth } from '../context/AuthContext'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>
}

// Validação de senha forte: mínimo 8 chars, 1 maiúscula, 1 número, 1 especial
function isStrongPassword(password: string): boolean {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos.')
      return
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Digite um email válido.')
      return
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        'Senha fraca',
        'A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um caractere especial.'
      )
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)

    if (error) {
      Alert.alert('Erro ao criar conta', 'Tente novamente com outro email.')
      return
    }

    Alert.alert(
      'Conta criada!',
      'Verifique seu email para confirmar a conta antes de entrar.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Comece seu protocolo personalizado</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#555"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.hint}>Mín. 8 chars, 1 maiúscula, 1 número, 1 caractere especial</Text>

        <TextInput
          style={styles.input}
          placeholder="Confirmar senha"
          placeholderTextColor="#555"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.buttonText}>Criar conta</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  back: { marginBottom: 32 },
  backText: { color: '#00FF88', fontSize: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 40 },
  input: {
    backgroundColor: '#13131A',
    borderWidth: 1,
    borderColor: '#1E1E2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 12,
  },
  hint: { color: '#444', fontSize: 12, marginBottom: 12, marginTop: -4 },
  button: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontWeight: '700', fontSize: 16 },
})