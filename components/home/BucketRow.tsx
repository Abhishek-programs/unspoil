import { View, Text, TouchableOpacity } from 'react-native'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import type { Bucket } from '@/store/buckets'

interface BucketRowProps {
  bucket: Bucket
  spent: number
  onPress?: () => void
}

export function BucketRow({ bucket, spent, onPress }: BucketRowProps) {
  const ratio = bucket.monthlyAmount > 0 ? spent / bucket.monthlyAmount : 0

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: bucket.color + '22',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 18 }}>{bucket.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
            {bucket.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: 'Inter_400Regular' }}>
            NPR {formatNPR(spent)} spent
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            color: colors.textPrimary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatNPR(spent)} / {formatNPR(bucket.monthlyAmount)}
        </Text>
      </View>
      <ProgressBar value={ratio} height={5} />
    </TouchableOpacity>
  )
}
