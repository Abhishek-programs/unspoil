import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatDate } from '@/lib/format'
import { PersonPicker } from '@/components/lending/PersonPicker'

export type LendDirection = 'lend' | 'borrow'

interface LendBorrowFormProps {
  initialContactId?: string | null
  onSubmit: (data: {
    contactId: string
    direction: LendDirection
    amount: number
    note: string | null
    date: string
  }) => Promise<void>
  submitLabel?: string
}

export function LendBorrowForm({
  initialContactId = null,
  onSubmit,
  submitLabel = 'Save',
}: LendBorrowFormProps) {
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<LendDirection>('lend')
  const [contactId, setContactId] = useState<string | null>(initialContactId)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialContactId) setContactId(initialContactId)
  }, [initialContactId])

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const canSave = parsedAmount > 0 && contactId !== null

  const handleSave = async () => {
    if (!canSave || saving || !contactId) return
    setSaving(true)
    try {
      await onSubmit({
        contactId,
        direction,
        amount: parsedAmount,
        note: note.trim() || null,
        date: date.toISOString(),
      })
      setAmount('')
      setNote('')
      setDate(new Date())
      if (!initialContactId) setContactId(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View>
      <View style={styles.amountContainer}>
        <Text style={styles.currencyLabel}>NPR</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.directionToggle}>
        <TouchableOpacity
          style={[styles.dirBtn, direction === 'lend' && styles.dirBtnLend]}
          onPress={() => setDirection('lend')}
        >
          <Text style={[styles.dirText, direction === 'lend' && styles.dirTextLend]}>I lent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dirBtn, direction === 'borrow' && styles.dirBtnBorrow]}
          onPress={() => setDirection('borrow')}
        >
          <Text style={[styles.dirText, direction === 'borrow' && styles.dirTextBorrow]}>I borrowed</Text>
        </TouchableOpacity>
      </View>

      {!initialContactId && (
        <View style={styles.section}>
          <Text style={styles.label}>Person</Text>
          <PersonPicker selectedContactId={contactId} onSelect={setContactId} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder="What was it for?"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecond} />
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
      </View>

      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : submitLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  currencyLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginBottom: 4,
  },
  amountInput: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    color: colors.purple,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    minWidth: 120,
    padding: 0,
  },
  directionToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 20,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  dirBtnLend: {
    backgroundColor: colors.purple + '18',
  },
  dirBtnBorrow: {
    backgroundColor: colors.amberFill,
  },
  dirText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  dirTextLend: {
    color: colors.purple,
  },
  dirTextBorrow: {
    color: colors.amber,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
