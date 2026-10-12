import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import type { Bucket } from '@/store/buckets'

interface FutureSectionProps {
  buckets: Bucket[]
  confirmedBucketIds: Set<string>
  onConfirm: (bucketId: string) => void
}

export function FutureSection({ buckets, confirmedBucketIds, onConfirm }: FutureSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Future</Text>
        <Text style={styles.subtitle}>Money for later</Text>
      </View>
      <View style={styles.card}>
        {buckets.map((bucket, i) => {
          const confirmed = confirmedBucketIds.has(bucket.id)
          return (
            <View key={bucket.id}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={[styles.row, confirmed && styles.rowConfirmed]}
                onPress={() => !confirmed && onConfirm(bucket.id)}
                activeOpacity={confirmed ? 1 : 0.7}
                disabled={confirmed}
              >
                <View style={[styles.checkbox, confirmed && styles.checkboxConfirmed]}>
                  {confirmed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.name, confirmed && styles.nameConfirmed]}>
                  {bucket.name}
                </Text>
                <Text style={[styles.amount, confirmed && styles.amountConfirmed]}>
                  NPR {formatNPR(bucket.monthlyAmount)}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
        {buckets.length === 0 && (
          <Text style={styles.empty}>No savings buckets</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
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
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
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
})
