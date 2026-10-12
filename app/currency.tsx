import { useMemo, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'
import { CURRENCIES } from '@/constants/currencies'
import { usePlaybookStore } from '@/store/playbook'

export default function CurrencyScreen() {
  const currency = usePlaybookStore(s => s.currency)
  const updatePlaybook = usePlaybookStore(s => s.updatePlaybook)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matched = query
      ? CURRENCIES.filter(
          item =>
            item.code.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query),
        )
      : CURRENCIES
    return [...matched].sort((a, b) => {
      if (a.code === currency) return -1
      if (b.code === currency) return 1
      return a.name.localeCompare(b.name)
    })
  }, [currency, search])

  const choose = async (code: string) => {
    await updatePlaybook({ currency: code })
    router.back()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Currency</Text>
        <View style={{ width: 24 }} />
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search currency"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList
        data={rows}
        keyExtractor={item => item.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = item.code === currency
          return (
            <TouchableOpacity style={styles.row} onPress={() => choose(item.code)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={23}
                color={selected ? colors.green : colors.textMuted}
              />
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={<Text style={styles.empty}>No matching currency.</Text>}
      />
    </SafeAreaView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  code: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
})
