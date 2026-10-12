import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { formatNPR } from '@/lib/format'
import { EF_MULTIPLIER } from '@/constants/defaults'

export default function OnboardingEFFloorScreen() {
  const { updatePlaybook } = usePlaybookStore()
  const { buckets } = useBucketsStore()

  const coreLiving = buckets.find(b => b.name === 'Core Living' && b.isActive)
  const coreLivingAmount = coreLiving?.monthlyAmount ?? 50000
  const suggestedFloor = EF_MULTIPLIER * coreLivingAmount

  const [efFloor, setEfFloor] = useState(String(suggestedFloor))

  const handleNext = async () => {
    const value = parseFloat(efFloor) || suggestedFloor
    await updatePlaybook({ efFloor: value })
    router.push('/onboarding/balances')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Emergency Fund</Text>
          <Text style={styles.subtitle}>
            Your safety net. Financial experts recommend 3-6 months of core expenses. We suggest {EF_MULTIPLIER} months based on your Core Living spend.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)}>
          <View style={styles.suggestionCard}>
            <Ionicons name="sparkles" size={18} color={colors.green} />
            <Text style={styles.suggestionText}>
              Based on your Core Living spend of NPR {formatNPR(coreLivingAmount)}/mo, we suggest{' '}
              <Text style={styles.suggestionHighlight}>NPR {formatNPR(suggestedFloor)}</Text>{' '}
              ({EF_MULTIPLIER} months of core expenses) as your EF target.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EF TARGET (FLOOR)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>NPR</Text>
              <TextInput
                style={styles.input}
                value={efFloor}
                onChangeText={setEfFloor}
                keyboardType="numeric"
                placeholder={String(suggestedFloor)}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Text style={styles.hint}>
              We'll alert you when your EF approaches this level.
            </Text>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInRight.duration(600).delay(600)}>
          <TouchableOpacity style={styles.button} onPress={handleNext}>
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
    paddingTop: 80,
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
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 22,
    marginBottom: 28,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.greenFill,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 32,
    borderCurve: 'continuous',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  suggestionHighlight: {
    fontFamily: 'Inter_700Bold',
    color: colors.green,
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
  input: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  spacer: {
    flex: 1,
    minHeight: 32,
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
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
