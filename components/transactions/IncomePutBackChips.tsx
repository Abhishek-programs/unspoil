import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import type { Bucket } from '@/store/buckets'

type Props = {
  spendingBuckets: Bucket[]
  selectedBucketId: string | null
  onChange: (bucketId: string | null) => void
}

export function IncomePutBackChips({ spendingBuckets, selectedBucketId, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      keyboardShouldPersistTaps="handled"
    >
      {spendingBuckets.map(bucket => {
        const selected = selectedBucketId === bucket.id
        return (
          <TouchableOpacity
            key={bucket.id}
            style={[
              styles.bucketChip,
              selected && {
                backgroundColor: bucket.color + '22',
                borderColor: bucket.color,
              },
            ]}
            onPress={() => {
              Keyboard.dismiss()
              if (!selected) onChange(bucket.id)
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, marginRight: 4 }}>{bucket.icon}</Text>
            <Text
              style={[styles.bucketChipText, selected && { color: bucket.color }]}
              numberOfLines={1}
            >
              {bucket.name}
            </Text>
            {selected && (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss()
                  onChange(null)
                }}
                hitSlop={8}
                style={styles.clearHit}
                accessibilityRole="button"
                accessibilityLabel={`Clear ${bucket.name}`}
              >
                <Ionicons name="close-circle" size={16} color={bucket.color} />
              </Pressable>
            )}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  bucketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 220,
  },
  bucketChipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    flexShrink: 1,
  },
  clearHit: {
    marginLeft: 6,
  },
})
