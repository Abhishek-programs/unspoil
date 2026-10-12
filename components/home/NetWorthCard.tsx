import { useState } from 'react'

import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native'

import { Ionicons } from '@expo/vector-icons'

import { colors } from '@/constants/colors'

import { formatNPR, formatNPRShort } from '@/lib/format'



interface YourMoneyCardProps {
  availableBalance: number
  stillInBank?: number
  intentionalSavings: number
  monthRemainingBalance: number
  carriedForwardBalance: number
  breakdown?: { label: string; value: number }[]
  lentOutAsset?: number
  youOweLiability?: number
  emptyHint?: string
  accountBalances?: { id: string; name: string; balance: number }[]
}

export function NetWorthCard({
  availableBalance,
  stillInBank = 0,
  intentionalSavings,
  monthRemainingBalance,
  carriedForwardBalance,
  breakdown = [],
  lentOutAsset = 0,
  youOweLiability = 0,
  emptyHint,
  accountBalances = [],
}: YourMoneyCardProps) {

  const [expanded, setExpanded] = useState(false)



  const toggleExpand = () => {

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

    setExpanded(!expanded)

  }



  return (

    <TouchableOpacity style={styles.container} activeOpacity={0.9} onPress={toggleExpand}>

      <View style={styles.header}>

        <View style={styles.mainInfo}>

          <Text style={styles.label}>Your money</Text>

          <Text style={styles.value}>{formatNPR(availableBalance)}</Text>

          <Text style={styles.sub}>

            {stillInBank > 0

              ? `Includes NPR ${formatNPRShort(stillInBank)} not yet confirmed`

              : carriedForwardBalance > 0

                ? `Includes NPR ${formatNPRShort(carriedForwardBalance)} carried forward`

                : 'Cash on you right now'}

          </Text>

        </View>

        <Ionicons

          name={expanded ? 'chevron-up' : 'chevron-down'}

          size={20}

          color={colors.textMuted}

        />

      </View>



      {expanded && (

        <View style={styles.breakdown}>

          <View style={styles.divider} />



          <View style={styles.breakdownRow}>

            <View>

              <Text style={styles.breakdownLabel}>Remaining this month</Text>

              <Text style={styles.rolloverNote}>Rolls forward at month end</Text>

            </View>

            <Text style={styles.breakdownValue}>{formatNPRShort(monthRemainingBalance)}</Text>

          </View>



          {carriedForwardBalance > 0 && (

            <View style={styles.breakdownRow}>

              <Text style={styles.breakdownLabel}>Carried forward</Text>

              <Text style={[styles.breakdownValue, { color: colors.green }]}>

                {formatNPRShort(carriedForwardBalance)}

              </Text>

            </View>

          )}



          {stillInBank > 0 && (

            <View style={styles.breakdownRow}>

              <View>

                <Text style={styles.breakdownLabel}>Not yet confirmed</Text>

                <Text style={styles.rolloverNote}>Still in bank — confirm in Future</Text>

              </View>

              <Text style={styles.breakdownValue}>{formatNPRShort(stillInBank)}</Text>

            </View>

          )}



          {accountBalances.length > 0 && (

            <>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Where it sits</Text>

              {accountBalances.map(a => (

                <View key={a.id} style={styles.breakdownRow}>

                  <Text style={styles.breakdownLabel}>{a.name}</Text>

                  <Text style={styles.breakdownValue}>{formatNPR(a.balance)}</Text>

                </View>

              ))}

            </>

          )}



          <View style={styles.divider} />



          <Text style={styles.sectionTitle}>Net worth</Text>

          <Text style={styles.netWorthValue}>{formatNPRShort(intentionalSavings)}</Text>

          <Text style={styles.netWorthSub}>Intentional savings — EF, goals, SIP, shares</Text>



          {breakdown.length > 0 ? (

            breakdown.map(item => (

              <View key={item.label} style={styles.breakdownRow}>

                <Text style={styles.breakdownLabel}>{item.label}</Text>

                <Text style={styles.breakdownValue}>{formatNPRShort(item.value)}</Text>

              </View>

            ))

          ) : emptyHint ? (

            <Text style={styles.emptyBreakdown}>{emptyHint}</Text>

          ) : (

            <Text style={styles.emptyBreakdown}>

              Confirm savings and add goals in Vault to build your net worth here.

            </Text>

          )}



          {(lentOutAsset > 0 || youOweLiability > 0) && (

            <>

              <View style={styles.divider} />

              {lentOutAsset > 0 && (

                <View style={styles.breakdownRow}>

                  <Text style={styles.breakdownLabel}>Lent out</Text>

                  <Text style={[styles.breakdownValue, { color: colors.savingsSetAside }]}>

                    {formatNPRShort(lentOutAsset)}

                  </Text>

                </View>

              )}

              {youOweLiability > 0 && (

                <View style={styles.breakdownRow}>

                  <Text style={styles.breakdownLabel}>You owe</Text>

                  <Text style={[styles.breakdownValue, { color: colors.red }]}>

                    {formatNPRShort(youOweLiability)}

                  </Text>

                </View>

              )}

            </>

          )}

        </View>

      )}

    </TouchableOpacity>

  )

}



const styles = StyleSheet.create({

  container: {

    backgroundColor: colors.surface,

    borderRadius: 24,

    padding: 20,

    marginBottom: 24,

    borderWidth: 1,

    borderColor: colors.border,

    borderCurve: 'continuous',

  },

  header: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'flex-start',

  },

  mainInfo: {

    flex: 1,

  },

  label: {

    fontSize: 13,

    fontFamily: 'Inter_500Medium',

    color: colors.textMuted,

    marginBottom: 4,

  },

  value: {

    fontSize: 32,

    fontFamily: 'Inter_700Bold',

    color: colors.textPrimary,

    marginBottom: 4,

  },

  sub: {

    fontSize: 12,

    fontFamily: 'Inter_400Regular',

    color: colors.textSecond,

  },

  sectionTitle: {

    fontSize: 11,

    fontFamily: 'Inter_600SemiBold',

    color: colors.textMuted,

    textTransform: 'uppercase',

    letterSpacing: 0.8,

    marginBottom: 4,

  },

  netWorthValue: {

    fontSize: 22,

    fontFamily: 'Inter_700Bold',

    color: colors.textPrimary,

    marginBottom: 4,

  },

  netWorthSub: {

    fontSize: 12,

    fontFamily: 'Inter_400Regular',

    color: colors.textMuted,

    marginBottom: 12,

  },

  breakdown: {

    marginTop: 16,

  },

  divider: {

    height: 1,

    backgroundColor: colors.divider,

    marginVertical: 12,

  },

  breakdownRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    paddingVertical: 6,

    alignItems: 'center',

  },

  breakdownLabel: {

    fontSize: 13,

    fontFamily: 'Inter_400Regular',

    color: colors.textSecond,

  },

  rolloverNote: {

    fontSize: 11,

    fontFamily: 'Inter_400Regular',

    color: colors.textMuted,

    marginTop: 2,

  },

  breakdownValue: {

    fontSize: 13,

    fontFamily: 'Inter_600SemiBold',

    color: colors.textPrimary,

  },

  emptyBreakdown: {

    fontSize: 13,

    fontFamily: 'Inter_400Regular',

    color: colors.textMuted,

    paddingVertical: 4,

  },

})

