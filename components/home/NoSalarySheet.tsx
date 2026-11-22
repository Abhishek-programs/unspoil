import { useEffect, useMemo, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatMoney } from '@/lib/format'
import { toLocalDateKey } from '@/lib/month'
import { formatRunway, runwayMonths, survivalMonthly, type NoSalaryPrefs } from '@/lib/no-salary'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'

interface NoSalarySheetProps {
  visible: boolean
  onClose: () => void
  /** Cash not set aside right now, for the runway preview. */
  cashAvailable: number
  efValue: number
  repayMonthly: number
}

export function NoSalarySheet({
  visible,
  onClose,
  cashAvailable,
  efValue,
  repayMonthly,
}: NoSalarySheetProps) {
  const { noSalary, updatePlaybook } = usePlaybookStore()
  const { buckets } = useBucketsStore()
  const [draft, setDraft] = useState<NoSalaryPrefs>(noSalary)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) setDraft(noSalary)
  }, [visible, noSalary])

  const spending = buckets.filter(b => b.isActive && b.type === 'spending')
  const future = buckets.filter(b => b.isActive && (b.type === 'savings' || b.type === 'investment'))

  const cost = useMemo(
    () => survivalMonthly(buckets, draft.keep, repayMonthly),
    [buckets, draft.keep, repayMonthly],
  )
  const runway = runwayMonths(cashAvailable, cost)
  const runwayEf = runwayMonths(cashAvailable + Math.max(0, efValue), cost)

  const toggleKeep = (id: string) => {
    setDraft(d => ({
      ...d,
      keep: d.keep.includes(id) ? d.keep.filter(k => k !== id) : [...d.keep, id],
    }))
  }

  const save = async (next: NoSalaryPrefs) => {
    if (saving) return
    setSaving(true)
    try {
      await updatePlaybook({ noSalary: next })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const turnOn = () =>
    save({ ...draft, on: true, since: draft.on ? draft.since : toLocalDateKey(new Date()) })
  const turnOff = () => save({ ...draft, on: false, since: null, nudgeSeen: null })

  const chip = (b: (typeof buckets)[0]) => {
    const kept = draft.keep.includes(b.id)
    return (
      <TouchableOpacity
        key={b.id}
        style={[styles.chip, kept && styles.chipOn]}
        onPress={() => toggleKeep(b.id)}
        activeOpacity={0.75}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: kept }}
      >
        <Text style={styles.chipIcon}>{b.icon}</Text>
        <Text style={[styles.chipText, kept && styles.chipTextOn]}>{b.name}</Text>
        <Text style={[styles.chipAmt, kept && styles.chipTextOn]}>{formatMoney(b.monthlyAmount)}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>No-salary month</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.intro}>
            Salary paused, late, or between jobs. Your plan shrinks to what you keep below, paid
            from Your money. It stays on until you turn it off.
          </Text>

          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.groupLabel}>Keep spending on</Text>
            <View style={styles.chips}>{spending.map(chip)}</View>

            {future.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Keep saving into</Text>
                <Text style={styles.groupHint}>Everything else in Future pauses.</Text>
                <View style={styles.chips}>{future.map(chip)}</View>
              </>
            )}

            <View style={styles.runwayBox}>
              <Text style={styles.runwayLabel}>Costs {formatMoney(cost)}/month</Text>
              <Text style={styles.runwayValue}>Your money lasts {formatRunway(runway)}</Text>
              {efValue > 0 && (
                <Text style={styles.runwaySub}>{formatRunway(runwayEf)} with your Emergency Fund</Text>
              )}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchLabel}>Emergency Fund backup</Text>
                <Text style={styles.switchHint}>
                  When Your money can't cover next month, offer to move one month from the
                  Emergency Fund. Nothing moves without your tap.
                </Text>
              </View>
              <Switch
                value={draft.useEf}
                onValueChange={v => setDraft(d => ({ ...d, useEf: v }))}
                trackColor={{ true: colors.green, false: colors.border }}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.primary, (saving || draft.keep.length === 0) && { opacity: 0.5 }]}
            onPress={turnOn}
            disabled={saving || draft.keep.length === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>{noSalary.on ? 'Save' : 'Turn on'}</Text>
          </TouchableOpacity>
          {noSalary.on && (
            <TouchableOpacity style={styles.secondary} onPress={turnOff} disabled={saving}>
              <Text style={styles.secondaryText}>Salary is back · turn off</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
  intro: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 20,
  },
  groupLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  groupHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.greenFill, borderColor: colors.green + '60' },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecond },
  chipAmt: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  chipTextOn: { color: colors.textPrimary },
  runwayBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 16,
  },
  runwayLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textMuted },
  runwayValue: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.textPrimary, marginTop: 2 },
  runwaySub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecond, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  switchLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
  switchHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
    lineHeight: 17,
  },
  primary: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.textSecond },
})
