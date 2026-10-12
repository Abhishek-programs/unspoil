import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { OnboardingShell, useOnboardingFieldScroll } from '@/components/onboarding/OnboardingShell'

interface MoneyFieldsProps {
  income: string
  setIncome: (v: string) => void
  cashOnHand: string
  setCashOnHand: (v: string) => void
  startDay: string
  setStartDay: (v: string) => void
  age: string
  setAge: (v: string) => void
}

function MoneyFields({
  income,
  setIncome,
  cashOnHand,
  setCashOnHand,
  startDay,
  setStartDay,
  age,
  setAge,
}: MoneyFieldsProps) {
  const { bindField } = useOnboardingFieldScroll()
  const incomeField = bindField('income')
  const cashField = bindField('cash')
  const startDayField = bindField('startDay')
  const ageField = bindField('age')

  return (
    <>
      <OnboardingBack />
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet" size={32} color={colors.green} />
        </View>
        <Text style={styles.title}>Financial Playbook</Text>
        <Text style={styles.subtitle}>Set up your baseline. You can adjust this later in settings.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.formArea}>
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
              onFocus={incomeField.onFocus}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CASH ON HAND (OPTIONAL)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>NPR</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={cashOnHand}
              onChangeText={setCashOnHand}
              keyboardType="numeric"
              onFocus={cashField.onFocus}
            />
          </View>
          <Text style={styles.hint}>Money in your account now — adds to Your money on Home</Text>
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
              onFocus={startDayField.onFocus}
            />
            <Text style={styles.suffix}>of the month</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>YOUR AGE (OPTIONAL)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="28"
              placeholderTextColor={colors.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              maxLength={3}
              onFocus={ageField.onFocus}
            />
            <Text style={styles.suffix}>years</Text>
          </View>
          <Text style={styles.hint}>Used for SIP target suggestions in Vault</Text>
        </View>
      </Animated.View>
    </>
  )
}

export default function OnboardingMoneyScreen() {
  const { updatePlaybook, carriedForwardBalance } = usePlaybookStore()
  const [income, setIncome] = useState('125000')
  const [startDay, setStartDay] = useState('1')
  const [age, setAge] = useState('')
  const [cashOnHand, setCashOnHand] = useState(
    carriedForwardBalance > 0 ? String(carriedForwardBalance) : '',
  )

  const handleNext = async () => {
    const incValue = parseFloat(income) || 125000
    const dayValue = parseInt(startDay) || 1
    const ageValue = parseInt(age, 10)
    const cashValue = parseFloat(cashOnHand) || 0

    await updatePlaybook({
      monthlyIncome: incValue,
      monthStartDay: Math.max(1, Math.min(31, dayValue)),
      userAge: ageValue > 0 ? ageValue : null,
      carriedForwardBalance: cashValue,
    })
    router.push('/onboarding/foundations')
  }

  return (
    <OnboardingShell
      footer={
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      }
    >
      <MoneyFields
        income={income}
        setIncome={setIncome}
        cashOnHand={cashOnHand}
        setCashOnHand={setCashOnHand}
        startDay={startDay}
        setStartDay={setStartDay}
        age={age}
        setAge={setAge}
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
  suffix: {
    fontSize: 16,
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
})
