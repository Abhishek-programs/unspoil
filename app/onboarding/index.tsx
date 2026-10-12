import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'

export default function OnboardingInfoScreen() {
  const [name, setName] = useState('')
  const { updatePlaybook } = usePlaybookStore()

  const handleNext = async () => {
    if (!name.trim()) return
    await updatePlaybook({ userName: name.trim() })
    router.push('/onboarding/money')
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>What should I call you?</Text>
          <Text style={styles.subtitle}>Let's personalize your SpendSense experience.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
          />
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInRight.duration(600).delay(600)}>
          <TouchableOpacity 
            style={[styles.button, !name.trim() && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={!name.trim()}
          >
            <Text style={styles.buttonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 32,
  },
  input: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 12,
  },
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderCurve: 'continuous',
  },
  buttonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
