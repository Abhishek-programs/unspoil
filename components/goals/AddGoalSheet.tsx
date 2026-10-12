import { useState, useEffect } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { useBucketsStore, type Bucket } from '@/store/buckets'
import { useGoalsStore, type Goal } from '@/store/goals'

interface AddGoalSheetProps {
  visible: boolean
  onClose: () => void
  editGoal?: Goal | null
}

export function AddGoalSheet({ visible, onClose, editGoal }: AddGoalSheetProps) {
  const { addGoal, updateGoal } = useGoalsStore()
  const { buckets } = useBucketsStore()

  const savingsInvestmentBuckets = buckets.filter(
    b => (b.type === 'savings' || b.type === 'investment') && b.isActive
  )

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [linkedBucketId, setLinkedBucketId] = useState('')
  const [startBalance, setStartBalance] = useState('')

  useEffect(() => {
    if (editGoal) {
      setName(editGoal.name)
      setTargetAmount(String(editGoal.targetAmount))
      setMonthlyContribution(String(editGoal.monthlyContribution))
      setTargetDate(editGoal.targetDate ?? '')
      setLinkedBucketId(editGoal.linkedBucketIds[0] ?? '')
      setStartBalance(String(editGoal.startBalance))
    } else {
      setName('')
      setTargetAmount('')
      setMonthlyContribution('')
      setTargetDate('')
      setLinkedBucketId('')
      setStartBalance('')
    }
  }, [editGoal, visible])

  // Auto-fill monthly contribution from linked bucket
  const handleBucketSelect = (bucketId: string) => {
    setLinkedBucketId(bucketId)
    const bucket = savingsInvestmentBuckets.find(b => b.id === bucketId)
    if (bucket && !monthlyContribution) {
      setMonthlyContribution(String(bucket.monthlyAmount))
    }
  }

  const handleSave = async () => {
    const target = parseFloat(targetAmount)
    const monthly = parseFloat(monthlyContribution)
    if (!name.trim() || isNaN(target) || target <= 0 || isNaN(monthly) || monthly <= 0) return

    const data = {
      name: name.trim(),
      targetAmount: target,
      monthlyContribution: monthly,
      targetDate: targetDate.trim() || null,
      linkedBucketIds: linkedBucketId ? [linkedBucketId] : [],
      startBalance: parseFloat(startBalance) || 0,
    }

    if (editGoal) {
      await updateGoal(editGoal.id, data)
    } else {
      await addGoal(data)
    }
    onClose()
  }

  const isValid = name.trim() && parseFloat(targetAmount) > 0 && parseFloat(monthlyContribution) > 0

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editGoal ? 'Edit Goal' : 'New Goal'}
            </Text>
            <TouchableOpacity onPress={handleSave} hitSlop={12} disabled={!isValid}>
              <Text style={[styles.saveLink, !isValid && { color: colors.textMuted }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Name */}
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

            {/* Target Amount */}
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

            {/* Monthly Contribution */}
            <View style={styles.field}>
              <Text style={styles.label}>MONTHLY CONTRIBUTION</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>NPR</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="10,000"
                  placeholderTextColor={colors.textMuted}
                  value={monthlyContribution}
                  onChangeText={setMonthlyContribution}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Target Date (optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>TARGET DATE (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM (e.g. 2027-06)"
                placeholderTextColor={colors.textMuted}
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>

            {/* Starting Balance */}
            <View style={styles.field}>
              <Text style={styles.label}>STARTING BALANCE</Text>
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

            {/* Linked Bucket */}
            <View style={styles.field}>
              <Text style={styles.label}>LINKED BUCKET</Text>
              <Text style={styles.hint}>
                Links this goal to a savings or investment bucket
              </Text>
              <View style={styles.bucketGrid}>
                {savingsInvestmentBuckets.map(b => (
                  <Pressable
                    key={b.id}
                    onPress={() => handleBucketSelect(b.id)}
                    style={[
                      styles.bucketChip,
                      linkedBucketId === b.id && styles.bucketChipActive,
                    ]}
                  >
                    <Text style={styles.bucketIcon}>{b.icon}</Text>
                    <Text
                      style={[
                        styles.bucketChipText,
                        linkedBucketId === b.id && styles.bucketChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
    gap: 28,
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
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  bucketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  bucketChipActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenFill,
  },
  bucketIcon: {
    fontSize: 14,
  },
  bucketChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  bucketChipTextActive: {
    color: colors.green,
    fontFamily: 'Inter_600SemiBold',
  },
})
