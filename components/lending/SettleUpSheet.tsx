import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

interface SettleUpSheetProps {
  visible: boolean
  personName: string
  balance: number
  onConfirm: (amount: number) => Promise<void>
  onClose: () => void
}

export function SettleUpSheet({
  visible,
  personName,
  balance,
  onConfirm,
  onClose,
}: SettleUpSheetProps) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight(visible)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const maxAmount = Math.abs(balance)
  const parsed = parseFloat(amount.replace(/,/g, '')) || 0

  useEffect(() => {
    if (visible) {
      setAmount(String(maxAmount))
      setSaving(false)
    }
  }, [visible, maxAmount])

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  const handleConfirm = async () => {
    if (parsed <= 0 || parsed > maxAmount || saving) return
    setSaving(true)
    try {
      await onConfirm(parsed)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const receiving = balance > 0
  const sheetLift = keyboardHeight > 0 ? Math.max(0, keyboardHeight - insets.bottom) : 0

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable
            style={[styles.sheet, { marginBottom: sheetLift }]}
            onPress={e => e.stopPropagation()}
          >
            <SafeAreaView edges={['bottom']}>
              <View style={styles.header}>
                <Text style={styles.title}>Settle up</Text>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sub}>
                {receiving
                  ? `${personName} owes you NPR ${formatNPRShort(balance)}`
                  : `You owe ${personName} NPR ${formatNPRShort(Math.abs(balance))}`}
              </Text>

              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.hint}>
                {receiving ? 'They paid you back' : 'You paid them'} · max NPR {formatNPR(maxAmount)}
              </Text>

              <TouchableOpacity
                style={[styles.btn, (parsed <= 0 || parsed > maxAmount) && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={parsed <= 0 || parsed > maxAmount || saving}
              >
                <Text style={styles.btnText}>{saving ? 'Saving...' : 'Confirm settlement'}</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  keyboard: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.pageBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
