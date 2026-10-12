import { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatMoney, formatMoneyShort } from '@/lib/format'
import { raisePersonalCap } from '@/lib/personal-cap'
import { useBucketsStore } from '@/store/buckets'

interface PersonalCapPromptProps {
  visible: boolean
  balance: number
  defaultCap: number
  onClose: () => void
}

export function PersonalCapPrompt({
  visible,
  balance,
  defaultCap,
  onClose,
}: PersonalCapPromptProps) {
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const { loadBuckets } = useBucketsStore()

  const handleRaiseGeneral = async () => {
    await raisePersonalCap(defaultCap + 5000, 'general')
    await loadBuckets()
    onClose()
  }

  const handleRaisePurchase = async () => {
    const amt = parseFloat(purchaseAmount)
    if (!amt || amt <= 0) {
      Alert.alert('Enter amount', 'How much is the purchase?')
      return
    }
    await raisePersonalCap(balance + amt, 'purchase', amt)
    await loadBuckets()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons
              name="alert-circle"
              size={22}
              color={colors.amber}
            />
            <Text style={styles.title}>Personal fund at cap</Text>
          </View>

          <Text style={styles.body}>
            Cap reached at {formatMoneyShort(balance)}. Raise the cap temporarily
            or for a specific purchase?
          </Text>

          <TouchableOpacity style={styles.option} onPress={handleRaiseGeneral}>
            <Text style={styles.optionText}>Raise cap one-time (+{formatMoney(5000)})</Text>
          </TouchableOpacity>
          <View style={styles.purchaseRow}>
            <TextInput
              style={styles.input}
              placeholder="Purchase amount"
              keyboardType="numeric"
              value={purchaseAmount}
              onChangeText={setPurchaseAmount}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.raiseBtn} onPress={handleRaisePurchase}>
              <Text style={styles.raiseBtnText}>Raise for purchase</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dismiss} onPress={onClose}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    flex: 1,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 20,
    marginBottom: 20,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  purchaseRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  raiseBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  raiseBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  dismiss: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
})
