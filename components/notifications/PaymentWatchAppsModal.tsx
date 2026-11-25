import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PaymentWatchAppRow } from '@/components/notifications/PaymentWatchAppRow'
import { colors } from '@/constants/colors'
import type { PaymentWatchApp } from '@/lib/payment-watch'

function fallbackLabel(packageName: string): string {
  if (packageName.includes('esewa')) return 'eSewa (not installed)'
  if (packageName === 'com.f1soft.nabilmbank') return 'nBank (not installed)'
  return `${packageName} (not installed)`
}

type Props = {
  visible: boolean
  loading: boolean
  apps: PaymentWatchApp[]
  selectedPackages: string[]
  onClose: () => void
  onToggle: (packageName: string) => void
}

export function PaymentWatchAppsModal({
  visible,
  loading,
  apps,
  selectedPackages,
  onClose,
  onToggle,
}: Props) {
  const [search, setSearch] = useState('')

  const filteredApps = useMemo(() => {
    const installedPackages = new Set(apps.map(app => app.packageName))
    const unavailable = selectedPackages
      .filter(packageName => !installedPackages.has(packageName))
      .map(packageName => ({
        packageName,
        iconPath: null as string | null,
        label: fallbackLabel(packageName),
      }))
    const selectableApps = [...apps, ...unavailable]
    const query = search.trim().toLowerCase()
    if (!query) return selectableApps
    return selectableApps.filter(
      app =>
        app.label.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query),
    )
  }, [apps, search, selectedPackages])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payment apps</Text>
          <View style={{ width: 48 }} />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search installed apps"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.green} />
            <Text style={styles.loadingText}>Loading apps…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {filteredApps.length === 0 ? (
              <Text style={styles.empty}>No matching launchable apps.</Text>
            ) : (
              filteredApps.map((app, index) => {
                const selected = selectedPackages.includes(app.packageName)
                return (
                  <View key={app.packageName}>
                    {index > 0 && <View style={styles.divider} />}
                    <PaymentWatchAppRow app={app} selected={selected} onToggle={onToggle} />
                  </View>
                )
              })
            )}
          </ScrollView>
        )}
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
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  done: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
    minWidth: 48,
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 24,
  },
  divider: { height: 1, backgroundColor: colors.divider },
})
