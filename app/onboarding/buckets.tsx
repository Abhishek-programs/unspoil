import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'
import { useBucketsStore, Bucket } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { formatNPR } from '@/lib/format'
import {
  isNonRemovableBucket,
  SIP_BUCKET_ID,
  SHARES_BUCKET_ID,
  CORE_LIVING_BUCKET_ID,
  EF_BUCKET_ID,
  PERSONAL_BUCKET_ID,
  GOAL_POOL_BUCKET_ID,
} from '@/constants/defaults'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { useScrollFocusedToTop } from '@/hooks/useKeyboardHeight'

interface BucketDraft {
  id: string
  name: string
  icon: string
  type: string
  monthlyAmount: string
  accumulationCap: string
  accumulates: boolean
  isActive: boolean
  linkedGoalId: string | null
  goalBucketRole: Bucket['goalBucketRole']
}

export default function OnboardingBucketsScreen() {
  const { buckets, updateBucket, loadBuckets, ensureGoalPoolBucket } = useBucketsStore()
  const { monthlyIncome } = usePlaybookStore()
  const insets = useSafeAreaInsets()
  const { keyboardHeight, scrollRef, scrollHostRef, onInputFocus, onScroll } =
    useScrollFocusedToTop()

  const [drafts, setDrafts] = useState<BucketDraft[]>(() =>
    buckets.map(b => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      type: b.type,
      monthlyAmount: String(b.monthlyAmount),
      accumulationCap: b.accumulationCap != null ? String(b.accumulationCap) : '20000',
      accumulates: b.accumulates ?? false,
      isActive: b.isActive,
      linkedGoalId: b.linkedGoalId ?? null,
      goalBucketRole: b.goalBucketRole ?? null,
    })),
  )
  const [initialized, setInitialized] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await ensureGoalPoolBucket()
        await loadBuckets()
      })()
    }, [ensureGoalPoolBucket, loadBuckets]),
  )

  const takeHome = monthlyIncome

  const allocated = useMemo(() => {
    return drafts
      .filter(d => d.isActive && !d.linkedGoalId)
      .reduce((sum, d) => sum + (parseInt(d.monthlyAmount, 10) || 0), 0)
  }, [drafts])

  const remaining = takeHome - allocated
  const overAllocated = remaining < 0

  useEffect(() => {
    setDrafts(prev => {
      const ids = new Set(prev.map(d => d.id))
      const extras = buckets.filter(b => !ids.has(b.id) && !b.linkedGoalId)
      if (extras.length === 0) return prev
      return [
        ...prev,
        ...extras.map(b => ({
          id: b.id,
          name: b.name,
          icon: b.icon,
          type: b.type,
          monthlyAmount: String(b.monthlyAmount),
          accumulationCap: b.accumulationCap != null ? String(b.accumulationCap) : '20000',
          accumulates: b.accumulates ?? false,
          isActive: b.isActive,
          linkedGoalId: b.linkedGoalId ?? null,
          goalBucketRole: b.goalBucketRole ?? null,
        })),
      ]
    })
  }, [buckets])

  useEffect(() => {
    if (initialized) return
    if (!drafts.some(d => d.id === GOAL_POOL_BUCKET_ID)) return
    setInitialized(true)

    setDrafts(prev => {
      const coreLiving = prev.find(
        d => d.id === CORE_LIVING_BUCKET_ID || d.name === 'Core Living',
      )
      const ef = prev.find(d => d.id === EF_BUCKET_ID || d.name === 'Emergency Fund')
      const pool = prev.find(d => d.id === GOAL_POOL_BUCKET_ID)
      const coreAmt = parseInt(coreLiving?.monthlyAmount ?? '50000', 10) || 50000
      const efAmt = parseInt(ef?.monthlyAmount ?? '15000', 10) || 15000
      const poolAmt = parseInt(pool?.monthlyAmount ?? '0', 10) || 0

      const optionalSpending = prev
        .filter(
          d =>
            d.type === 'spending' &&
            d.isActive &&
            !isNonRemovableBucket({ id: d.id, name: d.name }),
        )
        .reduce((s, d) => s + (parseInt(d.monthlyAmount, 10) || 0), 0)

      let leftover = takeHome - coreAmt - efAmt - optionalSpending - poolAmt
      if (leftover < 0) leftover = 0

      const sipDefault =
        buckets.find(b => b.id === SIP_BUCKET_ID || b.name === 'SIPs')?.monthlyAmount ?? 6000
      const sharesDefault =
        buckets.find(b => b.id === SHARES_BUCKET_ID || b.name === 'Direct Shares')?.monthlyAmount ??
        15000
      const totalDefault = sipDefault + sharesDefault
      const sipRatio = totalDefault > 0 ? sipDefault / totalDefault : 0.5

      const sipSuggest = Math.round(leftover * sipRatio)
      const sharesSuggest = Math.max(0, leftover - sipSuggest)

      return prev.map(d => {
        if ((d.id === SIP_BUCKET_ID || d.name === 'SIPs') && d.isActive && !d.linkedGoalId) {
          return { ...d, monthlyAmount: String(sipSuggest || sipDefault) }
        }
        if (
          (d.id === SHARES_BUCKET_ID || d.name === 'Direct Shares') &&
          d.isActive &&
          !d.linkedGoalId
        ) {
          return { ...d, monthlyAmount: String(sharesSuggest || sharesDefault) }
        }
        return d
      })
    })
  }, [initialized, drafts, buckets, takeHome])

  const updateDraft = (id: string, patch: Partial<BucketDraft>) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)))
  }

  const handleNext = async () => {
    if (overAllocated) return

    for (const draft of drafts) {
      if (draft.linkedGoalId) continue
      const original = buckets.find(b => b.id === draft.id)
      const amt = parseInt(draft.monthlyAmount, 10) || original?.monthlyAmount || 0
      if (draft.id === GOAL_POOL_BUCKET_ID) {
        await updateBucket(draft.id, {
          monthlyAmount: amt,
          isActive: true,
        })
        continue
      }
      if (!original) continue

      const cap = draft.accumulates
        ? parseInt(draft.accumulationCap, 10) || original.accumulationCap
        : original.accumulationCap
      if (
        amt !== original.monthlyAmount ||
        cap !== original.accumulationCap ||
        draft.isActive !== original.isActive ||
        draft.name !== original.name
      ) {
        await updateBucket(draft.id, {
          monthlyAmount: amt,
          isActive: draft.isActive,
          name: draft.name,
          ...(draft.accumulates ? { accumulationCap: cap ?? undefined } : {}),
        })
      }
    }
    router.push('/onboarding/goals')
  }

  const spendingDrafts = drafts
    .filter(d => d.type === 'spending')
    .sort((a, b) => {
      const order = (id: string) => (id === PERSONAL_BUCKET_ID ? 1 : 0)
      return order(a.id) - order(b.id)
    })
  const regularSpending = spendingDrafts.filter(d => !d.accumulates)
  const fundSpending = spendingDrafts.filter(d => d.accumulates)
  const futureOrder = (id: string) => {
    if (id === EF_BUCKET_ID) return 0
    if (id === GOAL_POOL_BUCKET_ID) return 1
    if (id === SIP_BUCKET_ID) return 2
    if (id === SHARES_BUCKET_ID) return 3
    return 4
  }
  const systemFutureDrafts = drafts
    .filter(d => (d.type === 'savings' || d.type === 'investment') && !d.linkedGoalId)
    .sort((a, b) => futureOrder(a.id) - futureOrder(b.id))

  const renderFundRow = (draft: BucketDraft) => (
    <View
      key={draft.id}
      style={[styles.fundCard, !draft.isActive && styles.bucketRowDisabled]}
    >
      <View style={styles.fundHeader}>
        <Text style={styles.bucketIcon}>{draft.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bucketName, !draft.isActive && styles.textDisabled]}>{draft.name}</Text>
          <Text style={styles.fundTag}>Fund · rolls over</Text>
        </View>
        <Switch
          value={draft.isActive}
          onValueChange={v => updateDraft(draft.id, { isActive: v })}
          trackColor={{ false: colors.border, true: colors.green + '50' }}
          thumbColor={draft.isActive ? colors.green : colors.textMuted}
        />
      </View>
      <Text style={styles.fundHint}>
        For clothes, gadgets, and random one-off buys. Unused money rolls over so it's there when you need it.
      </Text>
      <View style={styles.fundField}>
        <Text style={styles.fundFieldLabel}>Monthly top-up</Text>
        <View style={styles.amountRow}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={[styles.amountInput, !draft.isActive && styles.textDisabled]}
            value={draft.monthlyAmount}
            onChangeText={v => updateDraft(draft.id, { monthlyAmount: v })}
            keyboardType="numeric"
            editable={draft.isActive}
            onFocus={onInputFocus}
          />
        </View>
      </View>
      <View style={styles.fundField}>
        <Text style={styles.fundFieldLabel}>Max balance</Text>
        <View style={styles.amountRow}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={[styles.amountInput, !draft.isActive && styles.textDisabled]}
            value={draft.accumulationCap}
            onChangeText={v => updateDraft(draft.id, { accumulationCap: v })}
            keyboardType="numeric"
            editable={draft.isActive}
            onFocus={onInputFocus}
          />
        </View>
        <Text style={styles.fundFieldSub}>Stop adding when balance reaches this</Text>
      </View>
    </View>
  )

  const renderBucketRow = (draft: BucketDraft, subtitle?: string) => (
    <View
      key={draft.id}
      style={[styles.bucketRow, !draft.isActive && styles.bucketRowDisabled]}
    >
      <Text style={styles.bucketIcon}>{draft.icon}</Text>
      <View style={styles.bucketInfo}>
        <Text style={[styles.bucketName, !draft.isActive && styles.textDisabled]}>
          {subtitle ?? draft.name}
        </Text>
        {subtitle && (
          <Text style={styles.bucketHint}>{draft.name}</Text>
        )}
        <View style={styles.amountRow}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={[styles.amountInput, !draft.isActive && styles.textDisabled]}
            value={draft.monthlyAmount}
            onChangeText={v => updateDraft(draft.id, { monthlyAmount: v })}
            keyboardType="numeric"
            editable={draft.isActive}
            onFocus={onInputFocus}
          />
        </View>
      </View>
      {isNonRemovableBucket({ id: draft.id, name: draft.name }) ? (
        <View style={styles.protectedBadge}>
          <Ionicons name="lock-closed" size={12} color={colors.green} />
        </View>
      ) : (
        <Switch
          value={draft.isActive}
          onValueChange={v => updateDraft(draft.id, { isActive: v })}
          trackColor={{ false: colors.border, true: colors.green + '50' }}
          thumbColor={draft.isActive ? colors.green : colors.textMuted}
        />
      )}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.meter, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.meterTop}>
          <OnboardingBack />
          <Text style={styles.meterTitle}>Bucket Builder</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>Take-home</Text>
          <Text style={styles.meterValue}>NPR {formatNPR(takeHome)}</Text>
        </View>
        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>Allocated</Text>
          <Text style={styles.meterValue}>NPR {formatNPR(allocated)}</Text>
        </View>
        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>Remaining</Text>
          <Text style={[styles.meterValue, overAllocated ? styles.meterOver : styles.meterOk]}>
            NPR {formatNPR(Math.abs(remaining))}
            {overAllocated ? ' over' : ''}
          </Text>
        </View>
      </View>

      <View ref={scrollHostRef} style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.subtitle}>
          Allocate your take-home across spending and savings. Core Living and EF are locked.
        </Text>

        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <Text style={styles.groupLabel}>SPENDING</Text>
          {regularSpending.map(draft => renderBucketRow(draft))}
          {fundSpending.map(draft => renderFundRow(draft))}

          <Text style={[styles.groupLabel, { marginTop: 24 }]}>SAVINGS & INVESTMENTS</Text>

          {systemFutureDrafts.map(draft => renderBucketRow(draft))}
        </Animated.View>
      </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.button, overAllocated && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={overAllocated}
        >
          <Text style={styles.buttonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  meter: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  meterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  meterTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  meterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  meterLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  meterValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  meterOk: { color: colors.green },
  meterOver: { color: colors.red },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 20,
    lineHeight: 20,
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  goalGroup: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  goalGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  goalGroupName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  goalGroupTotal: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  goalSubRow: {
    flexDirection: 'row',
    paddingLeft: 8,
  },
  goalSubIndent: {
    width: 4,
    backgroundColor: colors.green + '40',
    marginVertical: 8,
    marginRight: 4,
    borderRadius: 2,
  },
  goalSubHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginTop: -6,
  },
  goalSubBucket: {
    flex: 1,
    marginBottom: 4,
    marginRight: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  goalPaused: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    padding: 14,
  },
  fundCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  fundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fundTag: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#7C3AED',
    marginTop: 2,
  },
  fundHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 17,
    marginBottom: 12,
  },
  fundField: {
    marginBottom: 10,
  },
  fundFieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginBottom: 4,
  },
  fundFieldSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  bucketRowDisabled: { opacity: 0.5 },
  bucketIcon: { fontSize: 20, marginRight: 12 },
  bucketInfo: { flex: 1 },
  bucketName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bucketHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: 4,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  prefix: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    padding: 0,
    minWidth: 60,
    fontVariant: ['tabular-nums'],
  },
  textDisabled: { color: colors.textMuted },
  protectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.pageBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
