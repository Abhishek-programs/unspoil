import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Bucket } from '@/store/buckets'
import type { FutureGoalGroup } from '@/lib/goals/future-groups'
import { GOAL_BUCKET_LABELS } from '@/lib/goals/plan'
import { futureRowLabel } from '@/lib/goals/future-groups'

interface BucketProgress {
  current: number
  target: number
}

export interface FutureSectionProps {
  goalGroups: FutureGoalGroup[]
  standaloneBuckets: Bucket[]
  confirmedBucketIds: Set<string>
  progressByBucket?: Record<string, BucketProgress>
  efBucketId?: string
  showPlaceholder?: boolean
  onConfirm: (bucketId: string) => void
  onAddGoal?: () => void
}

const EF_ACCENT = '#3B82F6'

function ConfirmRow({
  label,
  hint,
  amount,
  confirmed,
  onPress,
  indented,
  progress,
  icon,
  accent,
}: {
  label: string
  hint?: string
  amount: number
  confirmed: boolean
  onPress: () => void
  indented?: boolean
  progress?: BucketProgress
  icon?: string
  accent?: string
}) {
  const pct =
    progress && progress.target > 0
      ? Math.min(progress.current / progress.target, 1)
      : 0
  const pctLabel = Math.round(pct * 100)

  return (
    <TouchableOpacity
      style={[styles.row, confirmed && styles.rowConfirmed, indented && styles.rowIndented]}
      onPress={() => !confirmed && onPress()}
      activeOpacity={confirmed ? 1 : 0.7}
      disabled={confirmed}
    >
      <View style={[styles.checkbox, confirmed && styles.checkboxConfirmed]}>
        {confirmed && (
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </Animated.View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.labelRow}>
          {icon && <Text style={styles.rowIcon}>{icon}</Text>}
          <Text style={[styles.name, confirmed && styles.nameConfirmed]}>{label}</Text>
        </View>
        {hint && <Text style={styles.hint}>{hint}</Text>}
        {progress && progress.target > 0 && (
          <View style={styles.progressWrap}>
            <ProgressBar
              value={pct}
              height={5}
              mode="fill"
              color={accent ?? colors.savingsSetAside}
            />
            <Text style={styles.progressText}>
              NPR {formatNPRShort(progress.current)} / {formatNPRShort(progress.target)} · {pctLabel}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.amount, confirmed && styles.amountConfirmed]}>
        NPR {formatNPR(amount)}
      </Text>
    </TouchableOpacity>
  )
}

export function FutureSection({
  goalGroups,
  standaloneBuckets,
  confirmedBucketIds,
  progressByBucket = {},
  efBucketId,
  showPlaceholder,
  onConfirm,
  onAddGoal,
}: FutureSectionProps) {
  const hasContent =
    goalGroups.length > 0 || standaloneBuckets.length > 0 || showPlaceholder

  return (
    <Animated.View style={styles.section} entering={FadeIn.duration(300)}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Future</Text>
        <Text style={styles.subtitle}>Money for later</Text>
      </View>
      <View style={styles.card}>
        {goalGroups.map((group, gi) => (
          <View key={group.goalId}>
            {gi > 0 && <View style={styles.divider} />}
            {group.paymentMode === 'pay_in_full' && group.buckets.length === 1 ? (
              <ConfirmRow
                label={futureRowLabel(group.buckets[0], {
                  name: group.goalName,
                  paymentMode: group.paymentMode,
                })}
                amount={group.buckets[0].monthlyAmount}
                confirmed={confirmedBucketIds.has(group.buckets[0].id)}
                progress={progressByBucket[group.buckets[0].id]}
                onPress={() => onConfirm(group.buckets[0].id)}
              />
            ) : (
              <>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.goalName}</Text>
                  <Text style={styles.groupTotal}>
                    NPR{' '}
                    {formatNPR(
                      group.buckets.reduce((s, b) => s + b.monthlyAmount, 0),
                    )}
                    /mo
                  </Text>
                </View>
                {group.buckets.map((bucket, bi) => {
                  const role = bucket.goalBucketRole
                  const label = role
                    ? GOAL_BUCKET_LABELS[role].title
                    : bucket.name
                  const hint = role ? GOAL_BUCKET_LABELS[role].hint : undefined
                  return (
                    <View key={bucket.id}>
                      {bi > 0 && <View style={styles.subDivider} />}
                      <ConfirmRow
                        label={label}
                        hint={hint}
                        amount={bucket.monthlyAmount}
                        confirmed={confirmedBucketIds.has(bucket.id)}
                        progress={progressByBucket[bucket.id]}
                        onPress={() => onConfirm(bucket.id)}
                        indented
                      />
                    </View>
                  )
                })}
              </>
            )}
          </View>
        ))}

        {goalGroups.length > 0 && standaloneBuckets.length > 0 && (
          <View style={styles.divider} />
        )}

        {standaloneBuckets.map((bucket, i) => {
          const isEF = bucket.id === efBucketId
          return (
            <View key={bucket.id}>
              {i > 0 && <View style={styles.divider} />}
              <ConfirmRow
                label={bucket.name}
                amount={bucket.monthlyAmount}
                confirmed={confirmedBucketIds.has(bucket.id)}
                progress={progressByBucket[bucket.id]}
                accent={isEF ? EF_ACCENT : undefined}
                onPress={() => onConfirm(bucket.id)}
              />
            </View>
          )
        })}

        {showPlaceholder && onAddGoal && (
          <>
            {(goalGroups.length > 0 || standaloneBuckets.length > 0) && (
              <View style={styles.divider} />
            )}
            <TouchableOpacity style={styles.placeholderRow} onPress={onAddGoal}>
              <Ionicons name="add-circle-outline" size={22} color={colors.green} />
              <Text style={styles.placeholderText}>Plan a future big spend</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {!hasContent && (
          <Text style={styles.empty}>No savings buckets</Text>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  subDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 38,
  },
  groupHeader: {
    paddingVertical: 12,
    paddingTop: 14,
  },
  groupName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  groupTotal: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowIndented: {
    paddingLeft: 8,
  },
  rowConfirmed: {
    opacity: 0.55,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxConfirmed: {
    borderWidth: 0,
    backgroundColor: colors.green,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowIcon: {
    fontSize: 15,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  progressWrap: {
    marginTop: 8,
    gap: 4,
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  nameConfirmed: {
    textDecorationLine: 'line-through',
    color: colors.textSecond,
  },
  amount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  amountConfirmed: {
    color: colors.textSecond,
  },
  empty: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  placeholderText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
})
