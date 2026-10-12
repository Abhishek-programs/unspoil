import { View, Text, TouchableOpacity } from 'react-native'
import { Card } from '@/components/ui/Card'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'

interface NetWorthCardProps {
  totalNetWorth: number
  deltaThisMonth: number
  totalAssets: number
  totalLiabilities: number
  savingsRate: number // 0–1
}

export function NetWorthCard({ totalNetWorth, deltaThisMonth, totalAssets, totalLiabilities, savingsRate }: NetWorthCardProps) {
  const deltaPositive = deltaThisMonth >= 0
  const savingsRatePercent = Math.round(savingsRate * 100)

  return (
    <Card style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'Inter_500Medium', marginBottom: 4 }}>
        Net worth
      </Text>
      <Text
        style={{
          fontSize: 32,
          fontFamily: 'Inter_700Bold',
          color: colors.textPrimary,
          fontVariant: ['tabular-nums'],
          marginBottom: 4,
        }}
      >
        NPR {formatNPR(totalNetWorth)}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'Inter_500Medium',
          color: deltaPositive ? colors.green : colors.red,
          marginBottom: 16,
        }}
      >
        {deltaPositive ? '+' : ''}NPR {formatNPR(Math.abs(deltaThisMonth))} this month
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.greenFill,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.green, fontFamily: 'Inter_500Medium', marginBottom: 2 }}>
            Assets
          </Text>
          <Text style={{ fontSize: 14, color: colors.green, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] }}>
            {formatNPRShort(totalAssets)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: '#FEE2E2',
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.red, fontFamily: 'Inter_500Medium', marginBottom: 2 }}>
            Liabilities
          </Text>
          <Text style={{ fontSize: 14, color: colors.red, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] }}>
            {formatNPRShort(totalLiabilities)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: '#F0F9FF',
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ fontSize: 11, color: '#0369A1', fontFamily: 'Inter_500Medium', marginBottom: 2 }}>
            Savings rate
          </Text>
          <Text style={{ fontSize: 14, color: '#0369A1', fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] }}>
            {savingsRatePercent}%
          </Text>
        </View>
      </View>
    </Card>
  )
}
