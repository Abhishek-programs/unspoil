import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { useBucketsStore } from '@/store/buckets'

interface BucketDraft {
  id: string
  name: string
  icon: string
  type: string
  monthlyAmount: string
  isActive: boolean
}

export default function OnboardingBucketsScreen() {
  const { buckets, updateBucket } = useBucketsStore()

  const [drafts, setDrafts] = useState<BucketDraft[]>(() =>
    buckets.map(b => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      type: b.type,
      monthlyAmount: String(b.monthlyAmount),
      isActive: b.isActive,
    }))
  )

  const updateDraft = (id: string, patch: Partial<BucketDraft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  const handleNext = async () => {
    for (const draft of drafts) {
      const original = buckets.find(b => b.id === draft.id)
      if (!original) continue
      const amt = parseInt(draft.monthlyAmount, 10) || original.monthlyAmount
      if (amt !== original.monthlyAmount || draft.isActive !== original.isActive) {
        await updateBucket(draft.id, { monthlyAmount: amt, isActive: draft.isActive })
      }
    }
    router.push('/onboarding/ef-floor')
  }

  const spendingDrafts = drafts.filter(d => d.type === 'spending')
  const futureDrafts = drafts.filter(d => d.type === 'savings' || d.type === 'investment')

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <View style={styles.iconContainer}>
            <Ionicons name="layers" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Review Your Buckets</Text>
          <Text style={styles.subtitle}>
            These are your default spending and savings buckets. Adjust the amounts or turn off ones you don't need.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)}>
          <Text style={styles.groupLabel}>SPENDING</Text>
          {spendingDrafts.map(draft => (
            <View key={draft.id} style={[styles.bucketRow, !draft.isActive && styles.bucketRowDisabled]}>
              <Text style={styles.bucketIcon}>{draft.icon}</Text>
              <View style={styles.bucketInfo}>
                <Text style={[styles.bucketName, !draft.isActive && styles.textDisabled]}>{draft.name}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.prefix}>NPR</Text>
                  <TextInput
                    style={[styles.amountInput, !draft.isActive && styles.textDisabled]}
                    value={draft.monthlyAmount}
                    onChangeText={v => updateDraft(draft.id, { monthlyAmount: v })}
                    keyboardType="numeric"
                    editable={draft.isActive}
                  />
                </View>
              </View>
              <Switch
                value={draft.isActive}
                onValueChange={v => updateDraft(draft.id, { isActive: v })}
                trackColor={{ false: colors.border, true: colors.green + '50' }}
                thumbColor={draft.isActive ? colors.green : colors.textMuted}
              />
            </View>
          ))}

          <Text style={[styles.groupLabel, { marginTop: 24 }]}>SAVINGS & INVESTMENTS</Text>
          {futureDrafts.map(draft => (
            <View key={draft.id} style={[styles.bucketRow, !draft.isActive && styles.bucketRowDisabled]}>
              <Text style={styles.bucketIcon}>{draft.icon}</Text>
              <View style={styles.bucketInfo}>
                <Text style={[styles.bucketName, !draft.isActive && styles.textDisabled]}>{draft.name}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.prefix}>NPR</Text>
                  <TextInput
                    style={[styles.amountInput, !draft.isActive && styles.textDisabled]}
                    value={draft.monthlyAmount}
                    onChangeText={v => updateDraft(draft.id, { monthlyAmount: v })}
                    keyboardType="numeric"
                    editable={draft.isActive}
                  />
                </View>
              </View>
              {/* Emergency Fund can't be toggled off */}
              {draft.name === 'Emergency Fund' ? (
                <View style={styles.protectedBadge}>
                  <Ionicons name="lock-closed" size={12} color={colors.green} />
                </View>
              ) : (
                <Switch
                  value={draft.isActive}
                  onValueChange={v => updateDraft(draft.id, { isActive: v })}
                  trackColor={{ false: colors.border, true: colors.green + '50' }}
                  thumbColor={draft.isActive ? colors.green : colors.textMuted}
                />
              )}
            </View>
          ))}
        </Animated.View>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 32,
    lineHeight: 22,
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  bucketRowDisabled: {
    opacity: 0.5,
  },
  bucketIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    padding: 0,
    minWidth: 60,
    fontVariant: ['tabular-nums'],
  },
  textDisabled: {
    color: colors.textMuted,
  },
  protectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    height: 32,
  },
  button: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderCurve: 'continuous',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
