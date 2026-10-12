import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import type { Bucket } from '@/store/buckets'

interface SavingsRowProps {
  bucket: Bucket
  confirmed: boolean
  onConfirm: () => void
}

export function SavingsRow({ bucket, confirmed, onConfirm }: SavingsRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <TouchableOpacity onPress={onConfirm} activeOpacity={0.7} style={{ marginRight: 12 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: confirmed ? 0 : 2,
            borderColor: colors.border,
            backgroundColor: confirmed ? colors.green : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {confirmed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
          {bucket.name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: 'Inter_400Regular' }}>
          {bucket.type === 'investment' ? 'Investment' : 'Savings'} · {confirmed ? 'Confirmed' : 'Pending'}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontFamily: 'Inter_600SemiBold',
          color: confirmed ? colors.green : colors.textPrimary,
          fontVariant: ['tabular-nums'],
        }}
      >
        NPR {formatNPR(bucket.monthlyAmount)}
      </Text>
    </View>
  )
}
