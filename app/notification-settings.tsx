import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import Slider from '@react-native-community/slider'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/ui/Card'
import { colors } from '@/constants/colors'
import { requestPermissions } from '@/lib/notifications'
import {
  getPaymentWatchDelaySeconds,
  getPaymentWatchEnabled,
  getPaymentWatchLaunchableApps,
  getPaymentWatchTargetPackages,
  hasPaymentWatchNotificationPermission,
  hasPaymentWatchUsageAccess,
  isPaymentWatchAvailable,
  openPaymentWatchNotificationSettings,
  openPaymentWatchUsageSettings,
  PaymentWatchApp,
  setPaymentWatchDelaySeconds,
  setPaymentWatchEnabled,
  setPaymentWatchTargetPackages,
} from '@/lib/payment-watch'

export default function NotificationSettingsScreen() {
  const available = isPaymentWatchAvailable()
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [usageAccess, setUsageAccess] = useState(false)
  const [notificationAccess, setNotificationAccess] = useState(false)
  const [delay, setDelay] = useState(5)
  const [apps, setApps] = useState<PaymentWatchApp[]>([])
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => {
    if (!available) {
      setLoading(false)
      return
    }
    try {
      const [isEnabled, hasAccess, hasNotifications, delaySeconds, targets, launchable] =
        await Promise.all([
          getPaymentWatchEnabled(),
          hasPaymentWatchUsageAccess(),
          hasPaymentWatchNotificationPermission(),
          getPaymentWatchDelaySeconds(),
          getPaymentWatchTargetPackages(),
          getPaymentWatchLaunchableApps(),
        ])
      setEnabled(isEnabled)
      setUsageAccess(hasAccess)
      setNotificationAccess(hasNotifications)
      setDelay(delaySeconds)
      setSelectedPackages(targets)
      setApps(launchable)
    } catch {
      Alert.alert('Could not load payment helper', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [available])

  useEffect(() => {
    refresh()
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  const filteredApps = useMemo(() => {
    const installedPackages = new Set(apps.map(app => app.packageName))
    const unavailable = selectedPackages
      .filter(packageName => !installedPackages.has(packageName))
      .map(packageName => ({
        packageName,
        iconPath: null as string | null,
        label:
          packageName.includes('esewa')
            ? 'eSewa (not installed)'
            : packageName === 'com.f1soft.nabilmbank'
              ? 'nBank (not installed)'
              : `${packageName} (not installed)`,
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

  const toggleHelper = async (value: boolean) => {
    if (value && selectedPackages.length === 0) {
      Alert.alert('Choose an app', 'Select at least one app to watch first.')
      return
    }
    if (value && !(await requestPermissions())) {
      Alert.alert(
        'Notifications are off',
        'Allow notifications for UnSpoil in Android settings before enabling Payment Helper.',
      )
      return
    }
    const result = await setPaymentWatchEnabled(value)
    setEnabled(value)
    if (value && result === 'needs_usage_access') {
      Alert.alert(
        'Usage access needed',
        'Allow UnSpoil to see which app is open. It does not read or record your screen.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open settings', onPress: openPaymentWatchUsageSettings },
        ],
      )
    }
    await refresh()
  }

  const saveDelay = async (seconds: number) => {
    const next = Math.round(Math.max(0, Math.min(60, seconds)))
    setDelay(next)
    await setPaymentWatchDelaySeconds(next)
  }

  const toggleApp = async (packageName: string) => {
    const next = selectedPackages.includes(packageName)
      ? selectedPackages.filter(item => item !== packageName)
      : [...selectedPackages, packageName]
    if (enabled && next.length === 0) {
      Alert.alert('Keep one app selected', 'Turn off Payment Helper before removing every app.')
      return
    }
    setSelectedPackages(next)
    await setPaymentWatchTargetPackages(next)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment helper</Text>
        <View style={{ width: 24 }} />
      </View>

      {!available ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Development build required</Text>
          <Text style={styles.helpText}>
            Payment Helper is Android-only and is unavailable in Expo Go.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Payment helper</Text>
          <Card>
            <SettingRow
              label="Payment Helper"
              detail="Show a payment prompt in selected apps"
              value={enabled}
              onValueChange={toggleHelper}
            />
            {enabled && !usageAccess && (
              <>
                <View style={styles.divider} />
                <Text style={styles.warning}>
                  Usage access is off. UnSpoil cannot detect the selected apps.
                </Text>
                <TouchableOpacity style={styles.outlineButton} onPress={openPaymentWatchUsageSettings}>
                  <Text style={styles.outlineButtonText}>Grant usage access</Text>
                </TouchableOpacity>
              </>
            )}
            {enabled && !notificationAccess && (
              <>
                <View style={styles.divider} />
                <Text style={styles.warning}>
                  Android notifications are off, so payment prompts cannot appear.
                </Text>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={openPaymentWatchNotificationSettings}
                >
                  <Text style={styles.outlineButtonText}>Open notification settings</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>

          <Text style={styles.sectionTitle}>Timing</Text>
          <Card>
            <View style={styles.delayHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Show after</Text>
                <Text style={styles.rowDetail}>Delay after a selected app opens</Text>
              </View>
              <Text style={styles.seconds}>{delay} sec</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={60}
              step={1}
              value={delay}
              onValueChange={setDelay}
              onSlidingComplete={saveDelay}
              minimumTrackTintColor={colors.green}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.green}
              accessibilityLabel="Notification delay in seconds"
            />
          </Card>

          <View style={styles.appsHeading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Apps</Text>
              <Text style={styles.sectionDetail}>
                {selectedPackages.length} selected
              </Text>
            </View>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search installed apps"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
          />
          <Card style={styles.appsCard}>
            {filteredApps.length === 0 ? (
              <Text style={styles.helpText}>No matching launchable apps.</Text>
            ) : (
              filteredApps.map((app, index) => {
                const selected = selectedPackages.includes(app.packageName)
                return (
                  <View key={app.packageName}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.appRow}
                      onPress={() => toggleApp(app.packageName)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      {app.iconPath ? (
                        <Image source={{ uri: `file://${app.iconPath}` }} style={styles.appIcon} />
                      ) : null}
                      <Text style={[styles.rowLabel, { flex: 1 }]}>{app.label}</Text>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={23}
                        color={selected ? colors.green : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                )
              })
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function SettingRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string
  detail: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.greenFill }}
        thumbColor={value ? colors.green : '#f4f3f4'}
      />
    </View>
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
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionDetail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: -4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  rowDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  warning: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.amber,
    marginTop: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  outlineButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  delayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  seconds: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  appsHeading: { flexDirection: 'row', alignItems: 'flex-end' },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  appsCard: { paddingVertical: 6 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  appIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 12,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
})
