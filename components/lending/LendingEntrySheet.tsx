import { useEffect, useState } from 'react'
import { CurrencyPrefix } from '@/components/ui/CurrencyPrefix'
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatDate } from '@/lib/format'
import type { LendBorrowEntry, LendBorrowType } from '@/store/lending'

interface LendingEntrySheetProps {
  visible: boolean
  entry: LendBorrowEntry | null
  personName: string
  onSave: (
    id: string,
    patch: Pick<LendBorrowEntry, 'type' | 'amount' | 'note' | 'date'>,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

const TYPES: { type: LendBorrowType; label: string }[] = [
  { type: 'lend', label: 'Lent' },
  { type: 'borrow', label: 'Borrowed' },
  { type: 'settle', label: 'Settled' },
]

export function LendingEntrySheet({
  visible,
  entry,
  personName,
  onSave,
  onDelete,
  onClose,
}: LendingEntrySheetProps) {
  const [type, setType] = useState<LendBorrowType>('lend')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !entry) return
    setType(entry.type)
    setAmount(String(entry.amount))
    setNote(entry.note ?? '')
    setDate(new Date(entry.date))
    setShowDatePicker(false)
    setSaving(false)
  }, [visible, entry])

  if (!entry) return null
  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0

  const save = async () => {
    if (parsedAmount <= 0 || saving) return
    setSaving(true)
    try {
      await onSave(entry.id, {
        type,
        amount: parsedAmount,
        note: note.trim() || null,
        date: date.toISOString(),
      })
      onClose()
    } catch (error) {
      Alert.alert(
        'Could not update entry',
        error instanceof Error ? error.message : 'Try again',
      )
    } finally {
      setSaving(false)
    }
  }

  const remove = () => {
    Alert.alert('Delete entry?', 'This updates the balance and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await onDelete(entry.id)
          onClose()
        },
      },
    ])
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Entry with {personName}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.amountRow}>
            <CurrencyPrefix style={styles.prefix} />
            <TextInput
              style={styles.amount}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.types}>
            {TYPES.map(item => (
              <TouchableOpacity
                key={item.type}
                style={[styles.type, type === item.type && styles.typeActive]}
                onPress={() => setType(item.type)}
              >
                <Text style={[styles.typeText, type === item.type && styles.typeTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Note</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, selected) => {
                setShowDatePicker(Platform.OS === 'ios')
                if (selected) setDate(selected)
              }}
            />
          )}

          <TouchableOpacity style={styles.deleteButton} onPress={remove}>
            <Ionicons name="trash-outline" size={18} color={colors.red} />
            <Text style={styles.deleteText}>Delete entry</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, parsedAmount <= 0 && styles.disabled]}
            onPress={save}
            disabled={parsedAmount <= 0 || saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
  body: { padding: 20, paddingBottom: 36 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 20,
  },
  prefix: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.textMuted },
  amount: {
    minWidth: 120,
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    color: colors.purple,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginBottom: 8,
    marginTop: 18,
  },
  types: { flexDirection: 'row', gap: 8 },
  type: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeActive: { borderColor: colors.purple, backgroundColor: colors.purple + '12' },
  typeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textMuted },
  typeTextActive: { color: colors.purple },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  dateText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.textPrimary },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.red + '33',
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  deleteText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.red },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  saveButton: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
})
