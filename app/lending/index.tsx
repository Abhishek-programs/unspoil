import { useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'
import { useLendingStore } from '@/store/lending'
import { computePersonBalance, directionLabel } from '@/lib/lending/balance'

export default function LendingListScreen() {
  const { contacts, allEntries, addContact } = useLendingStore()
  const [newName, setNewName] = useState('')

  const rows = useMemo(() => {
    return contacts
      .map(c => ({
        ...c,
        balance: computePersonBalance(c.id, allEntries),
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name))
  }, [contacts, allEntries])

  const handleAddPerson = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    try {
      const contact = await addContact(trimmed)
      setNewName('')
      router.push(`/lending/${contact.id}`)
    } catch (e) {
      Alert.alert('Could not add person', e instanceof Error ? e.message : 'Try again')
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lent & Borrowed</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newName}
          onChangeText={setNewName}
          placeholder="Add a person"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAddPerson}
        />
        <TouchableOpacity
          style={[styles.addBtn, !newName.trim() && { opacity: 0.4 }]}
          onPress={handleAddPerson}
          disabled={!newName.trim()}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No people yet</Text>
            <Text style={styles.emptySub}>Add someone you lend to or borrow from</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const accent =
            item.balance > 0 ? colors.green : item.balance < 0 ? colors.red : colors.textMuted
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(300)}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/lending/${item.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={[styles.direction, { color: accent }]}>{directionLabel(item.balance)}</Text>
              </View>
              <Text style={[styles.balance, { color: accent }]}>
                {item.balance < 0 ? '−' : ''}{formatNPRShort(Math.abs(item.balance))}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            </Animated.View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
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
  addRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  addInput: {
    flex: 1,
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
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.purple,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  direction: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  balance: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
    marginRight: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
})
