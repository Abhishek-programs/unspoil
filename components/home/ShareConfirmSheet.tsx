import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

interface ShareConfirmSheetProps {
  visible: boolean
  bucketName: string
  defaultAmount: number
  onConfirm: (amount: number) => void
  onClose: () => void
}

export function ShareConfirmSheet({
  visible,
  bucketName,
  defaultAmount,
  onConfirm,
  onClose,
}: ShareConfirmSheetProps) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight(visible)
  const [amount, setAmount] = useState(String(defaultAmount))

  useEffect(() => {
    if (visible) setAmount(String(defaultAmount))
  }, [visible, defaultAmount])

  const parsed = parseFloat(amount) || 0
  const valid = parsed > 0

  const handleConfirm = () => {
    if (!valid) return
    onConfirm(parsed)
    onClose()
  }

  const sheetLift = keyboardHeight > 0 ? Math.max(0, keyboardHeight - insets.bottom) : 0

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
        >
          <Pressable
            style={[styles.sheet, { marginBottom: sheetLift }]}
            onPress={e => e.stopPropagation()}
          >
            <SafeAreaView edges={['bottom']}>
              <View style={styles.handle} />
              <Text style={styles.title}>Confirm {bucketName}</Text>
              <Text style={styles.subtitle}>
                Enter the amount you invested this month. SIP uses a fixed amount; shares can vary.
              </Text>

              <View style={styles.inputRow}>
                <Text style={styles.prefix}>NPR</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <Text style={styles.hint}>Suggested: NPR {formatNPR(defaultAmount)}</Text>

              <TouchableOpacity
                style={[styles.confirmBtn, !valid && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={!valid}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmText}>Confirm transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  keyboard: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderCurve: 'continuous',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 12,
    marginBottom: 8,
  },
  prefix: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: 24,
  },
  confirmBtn: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
    borderCurve: 'continuous',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
})
