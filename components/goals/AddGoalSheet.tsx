import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { useGoalsStore, type Goal } from '@/store/goals'
import { useBucketsStore } from '@/store/buckets'
import { formatNPR } from '@/lib/format'
import {
  type PaymentMode,
  computeGoalPlan,
  backCalcMonthly,
  monthsBetween,
  parseTargetDate,
} from '@/lib/goals/plan'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

type PaymentChoice = 'pay_in_full' | 'upfront_emi' | 'not_sure'

interface AddGoalSheetProps {
  visible: boolean
  onClose: () => void
  editGoal?: Goal | null
}

function paymentModeFromChoice(choice: PaymentChoice): PaymentMode {
  return choice === 'upfront_emi' ? 'upfront_emi' : 'pay_in_full'
}

export function AddGoalSheet({ visible, onClose, editGoal }: AddGoalSheetProps) {
  const { createGoalWithBuckets, updateGoalPaymentPlan, loadGoals } = useGoalsStore()
  const { loadBuckets } = useBucketsStore()

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [startBalance, setStartBalance] = useState('')
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('not_sure')
  const [upfrontAmount, setUpfrontAmount] = useState(0)
  const [emiTenureMonths, setEmiTenureMonths] = useState('12')

  const target = parseFloat(targetAmount) || 0
  const paymentMode = paymentModeFromChoice(paymentChoice)

  useEffect(() => {
    if (editGoal) {
      setName(editGoal.name)
      setTargetAmount(String(editGoal.targetAmount))
      setMonthlyContribution(String(editGoal.monthlyContribution))
      setTargetDate(editGoal.targetDate ?? '')
      setStartBalance(String(editGoal.startBalance))
      setPaymentChoice(editGoal.paymentMode === 'upfront_emi' ? 'upfront_emi' : 'pay_in_full')
      setUpfrontAmount(editGoal.upfrontAmount ?? Math.round(editGoal.targetAmount * 0.44))
      setEmiTenureMonths(String(editGoal.emiTenureMonths ?? 12))
    } else {
      setName('')
      setTargetAmount('')
      setMonthlyContribution('')
      setTargetDate('')
      setStartBalance('0')
      setPaymentChoice('not_sure')
      setUpfrontAmount(0)
      setEmiTenureMonths('12')
    }
  }, [editGoal, visible])

  useEffect(() => {
    if (target > 0 && upfrontAmount === 0 && !editGoal) {
      setUpfrontAmount(Math.round(target * 0.44))
    }
  }, [target, editGoal, upfrontAmount])

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  const saved = parseFloat(startBalance) || 0
  const targetDateObj = parseTargetDate(targetDate || null, 18)
  const monthsRemaining = monthsBetween(new Date(), targetDateObj)
  const backCalc = target > 0 ? backCalcMonthly(target, saved, monthsRemaining) : 0

  const plan = useMemo(
    () =>
      target > 0
        ? computeGoalPlan({
            targetAmount: target,
            alreadySaved: saved,
            targetDate: targetDateObj,
            paymentMode,
            upfrontAmount,
            emiTenureMonths: parseInt(emiTenureMonths, 10) || 12,
            totalMonthlyOverride: parseFloat(monthlyContribution) || undefined,
          })
        : null,
    [target, saved, targetDateObj, paymentMode, upfrontAmount, emiTenureMonths, monthlyContribution],
  )

  const handleSave = async () => {
    const monthly = parseFloat(monthlyContribution) || plan?.totalMonthly || backCalc
    if (!name.trim() || target <= 0 || monthly <= 0) return

    if (editGoal) {
      await updateGoalPaymentPlan(editGoal.id, {
        name: name.trim(),
        targetAmount: target,
        monthlyContribution: monthly,
        targetDate: targetDate.trim() || null,
        startBalance: saved,
        paymentMode,
        upfrontAmount: paymentMode === 'upfront_emi' ? upfrontAmount : undefined,
        emiTenureMonths: parseInt(emiTenureMonths, 10) || 12,
      })
    } else {
      await createGoalWithBuckets({
        name: name.trim(),
        targetAmount: target,
        monthlyContribution: monthly,
        targetDate: targetDate.trim() || null,
        startBalance: saved,
        paymentMode,
        upfrontAmount: paymentMode === 'upfront_emi' ? upfrontAmount : undefined,
        emiTenureMonths: parseInt(emiTenureMonths, 10) || 12,
        isEnabled: true,
      })
    }
    await loadBuckets()
    await loadGoals()
    onClose()
  }

  const isValid =
    name.trim() &&
    target > 0 &&
    (parseFloat(monthlyContribution) > 0 || (plan?.totalMonthly ?? backCalc) > 0)

  const keyboardHeight = useKeyboardHeight(visible)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editGoal ? 'Edit Goal' : 'New Goal'}</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={12} disabled={!isValid}>
              <Text style={[styles.saveLink, !isValid && { color: colors.textMuted }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(40, keyboardHeight > 0 ? keyboardHeight + 24 : 0) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            <View style={styles.field}>
              <Text style={styles.label}>GOAL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. New MacBook"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus={!editGoal}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>TARGET AMOUNT</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>NPR</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="500,000"
                  placeholderTextColor={colors.textMuted}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>TARGET DATE (YYYY-MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="2027-06"
                placeholderTextColor={colors.textMuted}
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ALREADY SAVED</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>NPR</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={startBalance}
                  onChangeText={setStartBalance}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>HOW ARE YOU PLANNING TO PAY?</Text>
            {(
              [
                { key: 'pay_in_full' as const, label: 'Save up and pay in full' },
                { key: 'upfront_emi' as const, label: 'Pay part upfront, rest in EMI' },
                { key: 'not_sure' as const, label: 'Not sure yet' },
              ] as const
            ).map(opt => (
              <Pressable
                key={opt.key}
                style={[styles.paymentOption, paymentChoice === opt.key && styles.paymentOptionActive]}
                onPress={() => setPaymentChoice(opt.key)}
              >
                <Text style={styles.paymentLabel}>{opt.label}</Text>
              </Pressable>
            ))}

            {paymentChoice === 'upfront_emi' && target > 0 && (
              <View style={styles.emiBlock}>
                <Text style={styles.label}>HOW MUCH UPFRONT?</Text>
                <Text style={styles.upfrontValue}>NPR {formatNPR(upfrontAmount)}</Text>
                <Slider
                  minimumValue={Math.round(target * 0.1)}
                  maximumValue={Math.round(target * 0.9)}
                  step={5000}
                  value={upfrontAmount}
                  onValueChange={setUpfrontAmount}
                  minimumTrackTintColor={colors.green}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.green}
                />
                <Text style={styles.label}>EMI TENURE (MONTHS)</Text>
                <TextInput
                  style={styles.input}
                  value={emiTenureMonths}
                  onChangeText={setEmiTenureMonths}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>MONTHLY CONTRIBUTION</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>NPR</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={String((plan?.totalMonthly ?? backCalc) || 0)}
                  placeholderTextColor={colors.textMuted}
                  value={monthlyContribution}
                  onChangeText={setMonthlyContribution}
                  keyboardType="numeric"
                />
              </View>
              {plan && (
                <Text style={styles.hint}>Suggested: NPR {formatNPR(plan.totalMonthly)}/mo</Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  saveLink: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  input: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginRight: 8,
  },
  paymentOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  paymentOptionActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenFill,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  emiBlock: { gap: 8, marginTop: 8 },
  upfrontValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
})
