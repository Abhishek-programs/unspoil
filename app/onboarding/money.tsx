import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'

export default function OnboardingMoneyScreen() {
  const [income, setIncome] = useState('125000')
  const [startDay, setStartDay] = useState('1')
  const { updatePlaybook, setOnboarded } = usePlaybookStore()

  const handleFinish = async () => {
    const incValue = parseFloat(income) || 125000
    const dayValue = parseInt(startDay) || 1
    
    await updatePlaybook({ 
      monthlyIncome: incValue,
      monthStartDay: Math.max(1, Math.min(31, dayValue))
    })
    await setOnboarded()
    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Financial Playbook</Text>
          <Text style={styles.subtitle}>Set up your baseline. You can adjust this later in settings.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.formArea}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MONTHLY TAKE-HOME MONEY</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>NPR</Text>
              <TextInput
                style={styles.input}
                placeholder="125,000"
                placeholderTextColor={colors.textMuted}
                value={income}
                onChangeText={setIncome}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>MONTH START DATE</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecond} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={startDay}
                onChangeText={setStartDay}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.suffix}>of the month</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInRight.duration(600).delay(600)}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleFinish}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="rocket" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    flexGrow: 1,
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
    marginBottom: 48,
    lineHeight: 24,
  },
  formArea: {
    gap: 32,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 12,
  },
  prefix: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginRight: 12,
  },
  suffix: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginLeft: 12,
  },
  input: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
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
    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
