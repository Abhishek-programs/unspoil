import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { useGoalsStore, type Goal } from '@/store/goals'
import { useTransactionsStore } from '@/store/transactions'
import { useBucketsStore } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalDetailSheet } from '@/components/goals/GoalDetailSheet'
import { AddGoalSheet } from '@/components/goals/AddGoalSheet'
import { formatNPR } from '@/lib/format'
import { EF_BUCKET_ID } from '@/constants/defaults'

const EF_PSEUDO_ID = '__ef_goal__'

export default function GoalsScreen() {
  const { goals } = useGoalsStore()
  const { transactions } = useTransactionsStore()
  const { buckets } = useBucketsStore()
  const { efFloor } = usePlaybookStore()

  const [selectedGoal, setSelectedGoal] = useState<(Goal & { current: number; color: string }) | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [addVisible, setAddVisible] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)

  // Find the Emergency Fund bucket by stable ID
  const efBucket = buckets.find(b => b.id === EF_BUCKET_ID && b.isActive)

  const goalsWithStatus = useMemo(() => {
    const result: (Goal & { current: number; color: string; isEF?: boolean })[] = []

    // EF pseudo-goal: derived from playbook efFloor + savings confirm transactions for EF bucket
    if (efBucket && efFloor > 0) {
      const efContributed = transactions
        .filter(t => t.bucketId === efBucket.id && t.remarks === '__savings_confirm__')
        .reduce((sum, t) => sum + t.amount, 0)

      result.push({
        id: EF_PSEUDO_ID,
        name: 'Emergency Fund',
        targetAmount: efFloor,
        monthlyContribution: efBucket.monthlyAmount,
        targetDate: null,
        linkedBucketIds: [efBucket.id],
        startBalance: 0,
        createdAt: '',
        current: efContributed,
        color: '#3B82F6',
        isEF: true,
      })
    }

    // User-created goals: only count __savings_confirm__ transactions as contributions
    goals.forEach(goal => {
      const contributed = transactions
        .filter(t =>
          goal.linkedBucketIds.includes(t.bucketId) &&
          t.remarks === '__savings_confirm__'
        )
        .reduce((sum, t) => sum + t.amount, 0)

      const bucket = buckets.find(b => goal.linkedBucketIds.includes(b.id))

      result.push({
        ...goal,
        current: goal.startBalance + contributed,
        color: bucket?.color || colors.green,
      })
    })

    return result
  }, [goals, transactions, buckets, efBucket, efFloor])

  // Summary calculations
  const totalSaved = goalsWithStatus.reduce((sum, g) => sum + g.current, 0)
  const totalMonthlyCommitment = goalsWithStatus.reduce((sum, g) => sum + g.monthlyContribution, 0)
  // EF coverage = target / Core Living monthly (how many months of core expenses covered)
  const coreLivingBucket = buckets.find(b => b.name === 'Core Living' && b.isActive)
  const coreLivingMonthly = coreLivingBucket?.monthlyAmount ?? 0
  const efCoverageMonths = coreLivingMonthly > 0 ? Math.floor(efFloor / coreLivingMonthly) : 0

  const handleEdit = (goal: Goal) => {
    // Can't edit the EF pseudo-goal (managed via Settings)
    if (goal.id === EF_PSEUDO_ID) return
    setDetailVisible(false)
    setEditGoal(goal)
    setAddVisible(true)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vault</Text>
        <TouchableOpacity
          style={styles.addButton}
          hitSlop={12}
          onPress={() => {
            setEditGoal(null)
            setAddVisible(true)
          }}
        >
          <Ionicons name="add" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Saved</Text>
          <Text style={styles.summaryValue}>
            NPR {formatNPR(totalSaved)}
          </Text>
          <View style={styles.summaryMeta}>
            <Text style={styles.summaryMetaText}>
              {efCoverageMonths} months EF coverage
            </Text>
            <Text style={styles.summaryDot}>  ·  </Text>
            <Text style={styles.summaryMetaText}>
              NPR {formatNPR(totalMonthlyCommitment)}/mo committed
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Goals</Text>
        {goalsWithStatus.map(goal => (
          <GoalCard
            key={goal.id}
            name={goal.name}
            current={goal.current}
            target={goal.targetAmount}
            monthly={goal.monthlyContribution}
            color={goal.color}
            onPress={() => {
              setSelectedGoal(goal)
              setDetailVisible(true)
            }}
          />
        ))}

        {goalsWithStatus.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={colors.divider} />
            <Text style={styles.emptyText}>No goals yet. Start saving for something big!</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                setEditGoal(null)
                setAddVisible(true)
              }}
            >
              <Text style={styles.emptyButtonText}>Create first goal</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <GoalDetailSheet
        goal={selectedGoal}
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false)
          setSelectedGoal(null)
        }}
        onEdit={handleEdit}
      />

      <AddGoalSheet
        visible={addVisible}
        onClose={() => {
          setAddVisible(false)
          setEditGoal(null)
        }}
        editGoal={editGoal}
      />
    </View>
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
    paddingTop: 64,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryCard: {
    backgroundColor: colors.greenFill,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderCurve: 'continuous',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.green,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  summaryMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.green,
    opacity: 0.8,
  },
  summaryDot: {
    fontSize: 12,
    color: colors.green,
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    maxWidth: 240,
  },
  emptyButton: {
    backgroundColor: colors.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
