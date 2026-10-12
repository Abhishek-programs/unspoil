import { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { useLendingStore } from '@/store/lending'
import { computePersonBalance, directionLabel } from '@/lib/lending/balance'
import { SettleUpSheet } from '@/components/lending/SettleUpSheet'
import { LendBorrowForm } from '@/components/lending/LendBorrowForm'

function entryLabel(type: string) {
  if (type === 'lend') return 'Lent'
  if (type === 'borrow') return 'Borrowed'
  return 'Settled'
}

function entryColor(type: string) {
  if (type === 'lend') return colors.purple
  if (type === 'borrow') return colors.amber
  return colors.green
}

export default function PersonDetailScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>()
  const { contacts, allEntries, addEntry } = useLendingStore()
  const [settleVisible, setSettleVisible] = useState(false)
  const [addVisible, setAddVisible] = useState(false)

  const contact = contacts.find(c => c.id === contactId)

  const balance = useMemo(
    () => (contact ? computePersonBalance(contact.id, allEntries) : 0),
    [contact, allEntries],
  )

  const history = useMemo(() => {
    if (!contact) return []
    return allEntries
      .filter(e => e.contactId === contact.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [contact, allEntries])

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.missing}>Person not found</Text>
      </SafeAreaView>
    )
  }

  const accent = balance > 0 ? colors.green : balance < 0 ? colors.red : colors.textMuted

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{contact.name}</Text>
        <TouchableOpacity onPress={() => setAddVisible(true)} hitSlop={12}>
          <Ionicons name="add-circle-outline" size={26} color={colors.purple} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current balance</Text>
        <Text style={[styles.balanceAmount, { color: accent }]}>
          {balance < 0 ? '−' : ''}NPR {formatNPR(Math.abs(balance))}
        </Text>
        <Text style={[styles.balanceDir, { color: accent }]}>{directionLabel(balance)}</Text>
      </View>

      {balance !== 0 && (
        <TouchableOpacity style={styles.settleBtn} onPress={() => setSettleVisible(true)}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.settleBtnText}>Settle up</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>History</Text>

      <ScrollView contentContainerStyle={styles.history}>
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>No transactions yet</Text>
        ) : (
          history.map(entry => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={[styles.entryBadge, { backgroundColor: entryColor(entry.type) + '18' }]}>
                <Text style={[styles.entryType, { color: entryColor(entry.type) }]}>
                  {entryLabel(entry.type)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryAmount}>NPR {formatNPR(entry.amount)}</Text>
                {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
                <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <SettleUpSheet
        visible={settleVisible}
        personName={contact.name}
        balance={balance}
        onConfirm={async amount => {
          await addEntry({
            contactId: contact.id,
            type: 'settle',
            amount,
            date: new Date().toISOString(),
          })
        }}
        onClose={() => setSettleVisible(false)}
      />

      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add with {contact.name}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <LendBorrowForm
              initialContactId={contact.id}
              submitLabel="Add entry"
              onSubmit={async data => {
                await addEntry({
                  contactId: data.contactId,
                  type: data.direction,
                  amount: data.amount,
                  note: data.note,
                  date: data.date,
                })
                setAddVisible(false)
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  missing: {
    textAlign: 'center',
    marginTop: 40,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    borderCurve: 'continuous',
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  balanceDir: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: colors.purple,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderCurve: 'continuous',
  },
  settleBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  history: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyHistory: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  entryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryType: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  entryAmount: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  entryNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  entryDate: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
})
