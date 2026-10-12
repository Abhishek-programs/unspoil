import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'
import { useGoalsStore, type Goal } from '@/store/goals'
import { useBucketsStore } from '@/store/buckets'
import { projectGoal } from '@/lib/projection'
import { GOAL_BUCKET_LABELS } from '@/lib/goals/plan'
import { PieChart } from 'react-native-gifted-charts'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

interface GoalDetailSheetProps {
  goal: (Goal & { current: number; color: string }) | null
  visible: boolean
  onClose: () => void
  onEdit?: (goal: Goal) => void
}

export function GoalDetailSheet({ goal, visible, onClose, onEdit }: GoalDetailSheetProps) {
  const { deleteGoal, updateGoalPaymentPlan } = useGoalsStore()
  const { buckets, loadBuckets } = useBucketsStore()
  const [editingMonthly, setEditingMonthly] = useState(false)
  const [monthlyDraft, setMonthlyDraft] = useState('')
  const keyboardHeight = useKeyboardHeight(visible && editingMonthly)

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  if (!goal) return null

  const linkedBuckets = buckets.filter(b => goal.linkedBucketIds.includes(b.id))
  const isArchived = !!goal.completedAt

  const handleSaveMonthly = async () => {
    const val = parseFloat(monthlyDraft)
    if (!val || val <= 0) return
    await updateGoalPaymentPlan(goal.id, { monthlyContribution: val })
    await loadBuckets()
    setEditingMonthly(false)
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(goal.id)
            onClose()
          },
        },
      ],
    )
  }

  const percent = Math.min((goal.current / goal.targetAmount) * 100, 100)
  const { projectedDate, monthsRemaining, nudge } = projectGoal({ 
    current: goal.current, 
    target: goal.targetAmount, 
    monthly: goal.monthlyContribution 
  })

  const pieData = [
    { value: percent, color: goal.color },
    { value: 100 - percent, color: colors.divider },
  ]

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goal Details</Text>
          <TouchableOpacity hitSlop={12} onPress={() => onEdit?.(goal)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(40, keyboardHeight > 0 ? keyboardHeight + 24 : 0) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* Main Chart */}
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={100}
              innerRadius={80}
              innerCircleColor={colors.pageBg}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.chartPercent}>{Math.round(percent)}%</Text>
                  <Text style={styles.chartLabel}>Complete</Text>
                </View>
              )}
            />
          </View>

          {/* Key Stats */}
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{goal.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Contributed</Text>
                <Text style={styles.statValue}>{formatNPRShort(goal.current)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Monthly</Text>
                {editingMonthly && !isArchived ? (
                  <View style={styles.monthlyEditRow}>
                    <TextInput
                      style={styles.monthlyInput}
                      value={monthlyDraft}
                      onChangeText={setMonthlyDraft}
                      keyboardType="numeric"
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleSaveMonthly}>
                      <Text style={styles.saveLink}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    disabled={isArchived}
                    onPress={() => {
                      setMonthlyDraft(String(goal.monthlyContribution))
                      setEditingMonthly(true)
                    }}
                  >
                    <Text style={styles.statValue}>{formatNPRShort(goal.monthlyContribution)}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Target</Text>
                <Text style={styles.statValue}>{formatNPRShort(goal.targetAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Projection Card */}
          <View style={styles.projectionCard}>
            <View style={styles.projectionHeader}>
              <Ionicons name="sparkles-outline" size={20} color={colors.green} />
              <Text style={styles.projectionTitle}>Projection</Text>
            </View>
            <Text style={styles.projectionHero}>
              Estimated completion: <Text style={{ color: colors.green }}>{projectedDate}</Text>
            </Text>
            <Text style={styles.projectionSub}>
              {monthsRemaining} month{monthsRemaining !== 1 ? 's' : ''} of contributions remaining.
            </Text>
            
            {nudge && (
              <View style={styles.nudgeBox}>
                <Text style={styles.nudgeText}>
                  Increase monthly by <Text style={styles.nudgeHighlight}>{formatNPR(nudge.amount)}</Text> to reach your goal <Text style={styles.nudgeHighlight}>{nudge.monthsSaved} month{nudge.monthsSaved > 1 ? 's' : ''} earlier</Text>.
                </Text>
              </View>
            )}
          </View>

          {goal.paymentMode === 'upfront_emi' && linkedBuckets.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly split</Text>
              {linkedBuckets.map(b => {
                const role = b.goalBucketRole
                const title = role ? GOAL_BUCKET_LABELS[role].title : b.name
                const hint = role ? GOAL_BUCKET_LABELS[role].hint : undefined
                return (
                  <View key={b.id} style={styles.splitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.splitTitle}>{title}</Text>
                      {hint && <Text style={styles.splitHint}>{hint}</Text>}
                    </View>
                    <Text style={styles.splitAmount}>NPR {formatNPRShort(b.monthlyAmount)}/mo</Text>
                  </View>
                )
              })}
            </View>
          )}

          {!goal.isEnabled && (
            <View style={styles.pausedBanner}>
              <Text style={styles.pausedText}>This goal is paused — re-enable in Settings or Bucket Builder</Text>
            </View>
          )}

          {/* Delete */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
              <Text style={styles.deleteText}>Delete Goal</Text>
            </TouchableOpacity>
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
  editLink: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartPercent: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  goalInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  goalName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  monthlyEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthlyInput: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.green,
    minWidth: 80,
    paddingVertical: 2,
  },
  saveLink: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  projectionCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
    marginBottom: 32,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  projectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  projectionHero: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  projectionSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  nudgeBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: colors.greenFill,
    borderRadius: 12,
  },
  nudgeText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  nudgeHighlight: {
    fontFamily: 'Inter_700Bold',
    color: colors.green,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  splitTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  splitHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  splitAmount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  pausedBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 12,
    backgroundColor: colors.border + '40',
    borderRadius: 10,
  },
  pausedText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red + '30',
    backgroundColor: colors.red + '08',
  },
  deleteText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.red,
  },
})
