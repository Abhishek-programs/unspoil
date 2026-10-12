import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { addMonths, format } from 'date-fns'
import { colors } from '@/constants/colors'
import { useGoalsStore } from '@/store/goals'
import { useBucketsStore } from '@/store/buckets'
import { formatNPR } from '@/lib/format'
import { DEFAULT_MACBOOK_GOAL, GOAL_POOL_BUCKET_ID } from '@/constants/defaults'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { OnboardingShell, useOnboardingFieldScroll } from '@/components/onboarding/OnboardingShell'
import { clearAllGoalsForOnboarding } from '@/lib/goals/actions'
import {
  type PaymentMode,
  computeGoalPlan,
  parseTargetDate,
  projectDateFromMonthly,
  GOAL_BUCKET_LABELS,
} from '@/lib/goals/plan'

type PaymentChoice = 'pay_in_full' | 'upfront_emi' | 'not_sure'

interface GoalDraft {
  id: string
  enabled: boolean
  name: string
  targetAmount: string
  targetDate: string
  alreadySaved: string
  paymentChoice: PaymentChoice
  upfrontAmount: number
  emiTenureMonths: string
  shareMonthly: string
}

function newGoalDraft(overrides?: Partial<GoalDraft>): GoalDraft {
  const defaultDate = format(addMonths(new Date(), DEFAULT_MACBOOK_GOAL.monthsFromNow), 'yyyy-MM')
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    enabled: true,
    name: DEFAULT_MACBOOK_GOAL.name,
    targetAmount: String(DEFAULT_MACBOOK_GOAL.targetAmount),
    targetDate: defaultDate,
    alreadySaved: '0',
    paymentChoice: 'not_sure',
    upfrontAmount: Math.round(DEFAULT_MACBOOK_GOAL.targetAmount * 0.44),
    emiTenureMonths: '12',
    shareMonthly: '0',
    ...overrides,
  }
}

function paymentModeFromChoice(choice: PaymentChoice): PaymentMode {
  return choice === 'upfront_emi' ? 'upfront_emi' : 'pay_in_full'
}

function GoalDraftCard({
  draft,
  onChange,
  onRemove,
  canRemove,
}: {
  draft: GoalDraft
  onChange: (patch: Partial<GoalDraft>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const { bindField } = useOnboardingFieldScroll()
  const nameField = bindField(`${draft.id}-name`)
  const targetField = bindField(`${draft.id}-target`)
  const savedField = bindField(`${draft.id}-saved`)

  const target = parseFloat(draft.targetAmount) || 0
  const saved = parseFloat(draft.alreadySaved) || 0
  const share = parseInt(draft.shareMonthly, 10) || 0
  const paymentMode = paymentModeFromChoice(draft.paymentChoice)
  const emiTenure = parseInt(draft.emiTenureMonths, 10) || 12
  const projectedDate = projectDateFromMonthly(target, saved, share)
  const projectedDateLabel = format(parseTargetDate(projectedDate), 'MMM yyyy')

  const plan = useMemo(
    () =>
      computeGoalPlan({
        targetAmount: target,
        alreadySaved: saved,
        targetDate: parseTargetDate(projectedDate),
        paymentMode,
        upfrontAmount: draft.upfrontAmount,
        emiTenureMonths: emiTenure,
        totalMonthlyOverride: share,
      }),
    [target, saved, projectedDate, paymentMode, draft.upfrontAmount, emiTenure, share]
  )

  if (!draft.enabled) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{draft.name || 'Big purchase'}</Text>
          <Switch
            value={draft.enabled}
            onValueChange={v => onChange({ enabled: v })}
            trackColor={{ false: colors.border, true: colors.green + '50' }}
            thumbColor={colors.textMuted}
          />
        </View>
        <Text style={styles.pausedHint}>Paused — enable when you're ready to save for this</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Big purchase</Text>
        <Switch
          value={draft.enabled}
          onValueChange={v => onChange({ enabled: v })}
          trackColor={{ false: colors.border, true: colors.green + '50' }}
          thumbColor={colors.green}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>GOAL NAME</Text>
        <TextInput
          style={styles.textInput}
          value={draft.name}
          onChangeText={v => onChange({ name: v })}
          placeholder="MacBook"
          placeholderTextColor={colors.textMuted}
          onFocus={nameField.onFocus}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TARGET AMOUNT</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={styles.input}
            value={draft.targetAmount}
            onChangeText={v => onChange({ targetAmount: v })}
            keyboardType="numeric"
            onFocus={targetField.onFocus}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>MONTHLY FROM POOL</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={styles.input}
            value={draft.shareMonthly}
            onChangeText={v => onChange({ shareMonthly: v })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>ALREADY SAVED</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={styles.input}
            value={draft.alreadySaved}
            onChangeText={v => onChange({ alreadySaved: v })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            onFocus={savedField.onFocus}
          />
        </View>
      </View>

      <Text style={[styles.label, { marginTop: 8 }]}>HOW ARE YOU PLANNING TO PAY?</Text>
      {(
        [
          { key: 'pay_in_full' as const, label: 'Save up and pay in full', sub: 'One savings bucket — simplest' },
          { key: 'upfront_emi' as const, label: 'Pay part upfront, rest in EMI', sub: 'Pay upfront + EMI reserve from day 1' },
          { key: 'not_sure' as const, label: 'Not sure yet', sub: 'Starts simple — change later in Goals' },
        ] as const
      ).map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.paymentOption, draft.paymentChoice === opt.key && styles.paymentOptionActive]}
          onPress={() => onChange({ paymentChoice: opt.key })}
        >
          <View style={[styles.radio, draft.paymentChoice === opt.key && styles.radioActive]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.paymentLabel}>{opt.label}</Text>
            <Text style={styles.paymentSub}>{opt.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {draft.paymentChoice === 'upfront_emi' && target > 0 && (
        <View style={styles.emiBlock}>
          <Text style={styles.label}>HOW MUCH UPFRONT?</Text>
          <Text style={styles.upfrontValue}>NPR {formatNPR(draft.upfrontAmount)}</Text>
          <Slider
            minimumValue={Math.round(target * 0.1)}
            maximumValue={Math.round(target * 0.9)}
            step={5000}
            value={draft.upfrontAmount}
            onValueChange={v => onChange({ upfrontAmount: v })}
            minimumTrackTintColor={colors.green}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.green}
          />
          <Text style={styles.emiRemainder}>
            Remainder for EMI: NPR {formatNPR(Math.max(0, target - draft.upfrontAmount))}
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMI TENURE (MONTHS)</Text>
            <TextInput
              style={styles.textInput}
              value={draft.emiTenureMonths}
              onChangeText={v => onChange({ emiTenureMonths: v })}
              keyboardType="numeric"
              placeholder="12"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      )}

      <View style={styles.calcCard}>
        <Text style={styles.calcLabel}>This goal's share</Text>
        <Text style={styles.calcValue}>NPR {formatNPR(share)}/mo</Text>
        <Text style={styles.calcHint}>
          {share > 0 && target > saved
            ? `At this pace, reach around ${projectedDateLabel}`
            : share <= 0
              ? 'Set a monthly share from the pool'
              : 'Already at target'}
        </Text>
        {paymentMode === 'upfront_emi' && plan.buckets.length > 1 && (
          <View style={styles.splitPreview}>
            {plan.buckets.map(b => (
              <Text key={b.role} style={styles.splitLine}>
                {GOAL_BUCKET_LABELS[b.role].title}: NPR {formatNPR(b.monthlyAmount)}/mo
              </Text>
            ))}
          </View>
        )}
      </View>

      {canRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>Remove this goal</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function OnboardingGoalsScreen() {
  const { createGoalWithBuckets, loadGoals } = useGoalsStore()
  const { buckets, loadBuckets, updateBucket } = useBucketsStore()
  const pool =
    buckets.find(b => b.id === GOAL_POOL_BUCKET_ID)?.monthlyAmount ?? 0
  const poolAmt = Math.max(0, Math.round(pool) || 0)
  const seeded = useRef(false)
  const [drafts, setDrafts] = useState<GoalDraft[]>(() => [newGoalDraft()])

  useEffect(() => {
    if (seeded.current) return
    if (poolAmt <= 0) return
    seeded.current = true
    setDrafts(prev =>
      prev.length === 1 ? [{ ...prev[0], shareMonthly: String(poolAmt) }] : prev,
    )
  }, [poolAmt])

  const counting = drafts.filter(d => d.enabled)
  const countingValid = counting.every(d => d.name.trim() && (parseFloat(d.targetAmount) || 0) > 0)
  const allocated = counting.reduce((s, d) => s + (parseInt(d.shareMonthly, 10) || 0), 0)
  const remaining = poolAmt - allocated
  const splitOk = remaining === 0 && (counting.length === 0 ? poolAmt === 0 : countingValid)
  const canContinue = splitOk

  const updateDraft = useCallback((id: string, patch: Partial<GoalDraft>) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)))
  }, [])

  const addDraft = () => {
    setDrafts(prev => [
      ...prev,
      newGoalDraft({
        enabled: true,
        name: '',
        targetAmount: '100000',
        shareMonthly: '0',
        paymentChoice: 'not_sure',
      }),
    ])
  }

  const removeDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id))
  }

  const handleNext = async () => {
    if (!canContinue) return
    await clearAllGoalsForOnboarding()
    await loadGoals()

    for (const draft of drafts) {
      if (!draft.enabled) continue
      const target = parseFloat(draft.targetAmount) || 0
      if (target <= 0 || !draft.name.trim()) continue

      const saved = parseFloat(draft.alreadySaved) || 0
      const share = parseInt(draft.shareMonthly, 10) || 0
      if (share <= 0) continue
      const paymentMode = paymentModeFromChoice(draft.paymentChoice)
      const projected = projectDateFromMonthly(target, saved, share)

      await createGoalWithBuckets({
        name: draft.name.trim(),
        targetAmount: target,
        monthlyContribution: share,
        targetDate: share > 0 ? projected : null,
        startBalance: saved,
        paymentMode,
        upfrontAmount: paymentMode === 'upfront_emi' ? draft.upfrontAmount : undefined,
        emiTenureMonths: parseInt(draft.emiTenureMonths, 10) || 12,
        isEnabled: true,
      })
    }

    const poolBucket = buckets.find(b => b.id === GOAL_POOL_BUCKET_ID)
    if (poolBucket) {
      await updateBucket(GOAL_POOL_BUCKET_ID, { monthlyAmount: 0, isActive: false })
    }

    await loadBuckets()
    await useGoalsStore.getState().loadGoals()
    router.push('/onboarding/balances')
  }

  return (
    <OnboardingShell
      footer={
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      }
    >
      <OnboardingBack />
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={styles.iconContainer}>
          <Ionicons name="flag" size={32} color={colors.green} />
        </View>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>
          {poolAmt > 0
            ? `Split NPR ${formatNPR(poolAmt)}/mo across your big purchases.`
            : 'No monthly set aside — you can skip or add goals with NPR 0/mo.'}
        </Text>
        {poolAmt > 0 && (
          <Text
            style={[
              styles.splitMeter,
              remaining === 0 ? styles.splitOk : styles.splitOff,
            ]}
          >
            {remaining === 0
              ? 'Pool fully assigned'
              : remaining > 0
                ? `NPR ${formatNPR(remaining)} left to assign`
                : `NPR ${formatNPR(Math.abs(remaining))} over the pool`}
          </Text>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.draftsArea}>
        {drafts.map(draft => (
          <GoalDraftCard
            key={draft.id}
            draft={draft}
            onChange={patch => updateDraft(draft.id, patch)}
            onRemove={() => removeDraft(draft.id)}
            canRemove={drafts.length > 1}
          />
        ))}

        {drafts.length < 5 && (
          <TouchableOpacity style={styles.addGoalBtn} onPress={addDraft}>
            <Ionicons name="add-circle-outline" size={22} color={colors.green} />
            <Text style={styles.addGoalText}>Add another big purchase</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
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
    marginBottom: 12,
  },
  splitMeter: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  splitOk: { color: colors.green },
  splitOff: { color: colors.amber },
  draftsArea: { gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    borderCurve: 'continuous',
  },
  cardDisabled: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  pausedHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  textInput: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 10,
  },
  prefix: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginRight: 10,
  },
  input: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  paymentOptionActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenFill,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 2,
  },
  radioActive: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  paymentSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  emiBlock: { gap: 8 },
  upfrontValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  emiRemainder: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  calcCard: {
    backgroundColor: colors.greenFill,
    borderRadius: 14,
    padding: 16,
    borderCurve: 'continuous',
  },
  calcLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  calcValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  calcHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 4,
  },
  splitPreview: { marginTop: 10, gap: 4 },
  splitLine: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  paceBlock: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  paceTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  paceHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    lineHeight: 18,
  },
  paceAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  pacePreview: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  applyBtn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.green,
    borderStyle: 'dashed',
  },
  addGoalText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  removeBtn: { alignSelf: 'flex-start' },
  removeText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.red,
  },
  spacer: { flex: 1, minHeight: 24 },
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
