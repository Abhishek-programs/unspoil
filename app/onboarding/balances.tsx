import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'
import { useGoalsStore } from '@/store/goals'
import { useBucketsStore } from '@/store/buckets'
import { SIP_BUCKET_ID, SHARES_BUCKET_ID } from '@/constants/defaults'
import { suggestSipTarget } from '@/lib/sip-target'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { OnboardingShell, useOnboardingFieldScroll } from '@/components/onboarding/OnboardingShell'

function BalancesFields({
  sipInvested,
  setSipInvested,
  sharesInvested,
  setSharesInvested,
}: {
  sipInvested: string
  setSipInvested: (v: string) => void
  sharesInvested: string
  setSharesInvested: (v: string) => void
}) {
  const { bindField } = useOnboardingFieldScroll()
  const sipField = bindField('sip')
  const sharesField = bindField('shares')

  return (
    <>
      <OnboardingBack />
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={styles.iconContainer}>
          <Ionicons name="cash" size={32} color={colors.green} />
        </View>
        <Text style={styles.title}>Starting Balances</Text>
        <Text style={styles.subtitle}>
          Existing investments and savings beyond cash on hand (set on the first step). We track capital
          deployed, not live market value.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.formArea}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TOTAL SIP INVESTED TO DATE</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>NPR</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={sipInvested}
              onChangeText={setSipInvested}
              keyboardType="numeric"
              onFocus={sipField.onFocus}
            />
          </View>
          <Text style={styles.hint}>Cumulative amount put into SIPs</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>TOTAL SHARES INVESTED TO DATE</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>NPR</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={sharesInvested}
              onChangeText={setSharesInvested}
              keyboardType="numeric"
              onFocus={sharesField.onFocus}
            />
          </View>
          <Text style={styles.hint}>Cumulative capital deployed in direct shares</Text>
        </View>
      </Animated.View>
    </>
  )
}

export default function OnboardingBalancesScreen() {
  const { setOnboarded, monthlyIncome, userAge } = usePlaybookStore()
  const { addGoal, goals, updateGoal } = useGoalsStore()
  const { buckets } = useBucketsStore()

  const [sipInvested, setSipInvested] = useState('')
  const [sharesInvested, setSharesInvested] = useState('')

  const sipBucket = buckets.find(b => b.id === SIP_BUCKET_ID || b.name === 'SIPs')
  const sharesBucket = buckets.find(b => b.id === SHARES_BUCKET_ID || b.name === 'Direct Shares')

  const handleFinish = async () => {
    const sipAmount = parseFloat(sipInvested) || 0
    const sharesAmount = parseFloat(sharesInvested) || 0

    if (sipAmount > 0 && sipBucket) {
      const existing = goals.find(g => g.linkedBucketIds.includes(sipBucket.id))
      const sipTarget = suggestSipTarget(monthlyIncome, userAge)
      if (!existing) {
        await addGoal({
          name: 'SIP Portfolio',
          targetAmount: sipTarget ?? Math.max(sipAmount, sipBucket.monthlyAmount * 120),
          monthlyContribution: sipBucket.monthlyAmount,
          targetDate: null,
          linkedBucketIds: [sipBucket.id],
          startBalance: sipAmount,
          paymentMode: 'pay_in_full',
          upfrontAmount: null,
          emiTenureMonths: null,
          isEnabled: true,
        })
      } else if (sipTarget) {
        await updateGoal(existing.id, { targetAmount: sipTarget })
      }
    }

    if (sharesAmount > 0 && sharesBucket) {
      const existing = goals.find(g => g.linkedBucketIds.includes(sharesBucket.id))
      if (!existing) {
        await addGoal({
          name: 'Direct Shares',
          targetAmount: Math.max(sharesAmount, sharesBucket.monthlyAmount * 120),
          monthlyContribution: sharesBucket.monthlyAmount,
          targetDate: null,
          linkedBucketIds: [sharesBucket.id],
          startBalance: sharesAmount,
          paymentMode: 'pay_in_full',
          upfrontAmount: null,
          emiTenureMonths: null,
          isEnabled: true,
        })
      }
    }

    await setOnboarded()
    router.replace('/(tabs)')
  }

  return (
    <OnboardingShell
      footer={
        <>
          <TouchableOpacity style={styles.button} onPress={handleFinish}>
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="rocket" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      }
    >
      <BalancesFields
        sipInvested={sipInvested}
        setSipInvested={setSipInvested}
        sharesInvested={sharesInvested}
        setSharesInvested={setSharesInvested}
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
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
})
