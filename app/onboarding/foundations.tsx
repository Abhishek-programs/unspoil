import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { formatNPR } from '@/lib/format'
import { EF_MULTIPLIER, CORE_LIVING_BUCKET_ID } from '@/constants/defaults'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { OnboardingShell, useOnboardingFieldScroll } from '@/components/onboarding/OnboardingShell'

function FoundationsFields({
  coreLiving,
  setCoreLiving,
  efFloor,
  setEfFloor,
  efBalance,
  setEfBalance,
  defaultCore,
  suggestedFloor,
}: {
  coreLiving: string
  setCoreLiving: (v: string) => void
  efFloor: string
  setEfFloor: (v: string) => void
  efBalance: string
  setEfBalance: (v: string) => void
  defaultCore: number
  suggestedFloor: number
}) {
  const { bindField } = useOnboardingFieldScroll()
  const coreField = bindField('core')
  const efFloorField = bindField('efFloor')
  const efBalanceField = bindField('efBalance')

  return (
    <>
      <OnboardingBack />
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={styles.iconContainer}>
          <Ionicons name="home" size={32} color={colors.green} />
        </View>
        <Text style={styles.title}>Foundations</Text>
        <Text style={styles.subtitle}>Set your core monthly living cost and emergency fund target.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.formArea}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CORE LIVING (MONTHLY)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>NPR</Text>
            <TextInput
              style={styles.input}
              value={coreLiving}
              onChangeText={v => {
                setCoreLiving(v)
                const amt = parseFloat(v) || 0
                if (amt > 0) setEfFloor(String(EF_MULTIPLIER * amt))
              }}
              keyboardType="numeric"
              placeholder={String(defaultCore)}
              placeholderTextColor={colors.textMuted}
              onFocus={coreField.onFocus}
            />
          </View>
          <Text style={styles.hint}>Rent, groceries, utilities, regular household costs</Text>
        </View>

        <View style={styles.suggestionCard}>
          <Ionicons name="sparkles" size={18} color={colors.green} />
          <Text style={styles.suggestionText}>
            EF target: NPR {formatNPR(suggestedFloor)} ({EF_MULTIPLIER}× core living)
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
              onFocus={efFloorField.onFocus}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CURRENT EF BALANCE</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>NPR</Text>
            <TextInput
              style={styles.input}
              value={efBalance}
              onChangeText={setEfBalance}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              onFocus={efBalanceField.onFocus}
            />
          </View>
          <Text style={styles.hint}>What you already have saved for emergencies</Text>
        </View>
      </Animated.View>
    </>
  )
}

export default function OnboardingFoundationsScreen() {
  const { updatePlaybook } = usePlaybookStore()
  const { buckets, updateBucket } = useBucketsStore()

  const coreLivingBucket = buckets.find(
    b => b.id === CORE_LIVING_BUCKET_ID || b.name === 'Core Living',
  )
  const defaultCore = coreLivingBucket?.monthlyAmount ?? 50000

  const [coreLiving, setCoreLiving] = useState(String(defaultCore))
  const [efFloor, setEfFloor] = useState(String(EF_MULTIPLIER * defaultCore))
  const [efBalance, setEfBalance] = useState('')

  const coreAmount = parseFloat(coreLiving) || defaultCore
  const suggestedFloor = EF_MULTIPLIER * coreAmount

  const handleNext = async () => {
    const floorValue = parseFloat(efFloor) || suggestedFloor
    const balanceValue = parseFloat(efBalance) || 0

    if (coreLivingBucket) {
      await updateBucket(coreLivingBucket.id, { monthlyAmount: coreAmount })
    }
    await updatePlaybook({ efFloor: floorValue, efStartBalance: balanceValue })
    router.push('/onboarding/buckets')
  }

  return (
    <OnboardingShell
      footer={
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      }
    >
      <FoundationsFields
        coreLiving={coreLiving}
        setCoreLiving={setCoreLiving}
        efFloor={efFloor}
        setEfFloor={setEfFloor}
        efBalance={efBalance}
        setEfBalance={setEfBalance}
        defaultCore={defaultCore}
        suggestedFloor={suggestedFloor}
      />
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 28,
    lineHeight: 22,
  },
  formArea: { gap: 28 },
  inputGroup: { gap: 10 },
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
    paddingVertical: 10,
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
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.greenFill,
    borderRadius: 12,
    padding: 14,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.green,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
