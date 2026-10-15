import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/ui/Card'
import { PaymentWatchAppsModal } from '@/components/notifications/PaymentWatchAppsModal'
import { colors } from '@/constants/colors'
import { requestPermissions } from '@/lib/notifications'
import type { NudgeToggles } from '@/lib/nudge-prefs'
import {
  getPaymentWatchDelaySeconds,
  getPaymentWatchEnabled,
  getPaymentWatchKeepBackgroundNotification,
  getPaymentWatchLaunchableApps,
  getPaymentWatchTargetPackages,
  hasPaymentWatchNotificationPermission,
  hasPaymentWatchUsageAccess,
  isPaymentWatchAvailable,
  openPaymentWatchBatterySettings,
  openPaymentWatchNotificationSettings,
  openPaymentWatchUsageSettings,
  PaymentWatchApp,
  setPaymentWatchDelaySeconds,
  setPaymentWatchEnabled,
  setPaymentWatchKeepBackgroundNotification,
  setPaymentWatchTargetPackages,
} from '@/lib/payment-watch'
import { usePlaybookStore } from '@/store/playbook'

const NUDGE_ROWS: { key: keyof NudgeToggles; label: string }[] = [
  { key: 'budgetBreach', label: 'Budget breach alerts' },
  { key: 'savingsReminder', label: 'Savings reminders' },
  { key: 'efFloorWarning', label: 'EF floor warnings' },
  { key: 'recurringDraft', label: 'Recurring draft reminders' },
]

function packageSummary(selectedPackages: string[], apps: PaymentWatchApp[]): string {
  if (selectedPackages.length === 0) return 'None selected'
  const labels = selectedPackages.map(pkg => {
    const found = apps.find(a => a.packageName === pkg)
    if (found) return found.label
    if (pkg.includes('esewa')) return 'eSewa'
    if (pkg === 'com.f1soft.nabilmbank') return 'nBank'
    return pkg.split('.').pop() ?? pkg
  })
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
}

export default function NotificationSettingsScreen() {
  const pb = usePlaybookStore()
  const available = isPaymentWatchAvailable()

  const [helperReady, setHelperReady] = useState(!available)
  const [enabled, setEnabled] = useState(false)
  const [usageAccess, setUsageAccess] = useState(false)
  const [notificationAccess, setNotificationAccess] = useState(false)
  const [delay, setDelay] = useState(5)
  const [delayDraft, setDelayDraft] = useState('5')
  const [keepWatchingNotification, setKeepWatchingNotification] = useState(false)
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [apps, setApps] = useState<PaymentWatchApp[]>([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [appsModalVisible, setAppsModalVisible] = useState(false)

  const refreshHelperCore = useCallback(async () => {
    if (!available) {
      setHelperReady(true)
      return
    }
    try {
      const [isEnabled, hasAccess, hasNotifications, delaySeconds, keepBg, targets] =
        await Promise.all([
          getPaymentWatchEnabled(),
          hasPaymentWatchUsageAccess(),
          hasPaymentWatchNotificationPermission(),
          getPaymentWatchDelaySeconds(),
          getPaymentWatchKeepBackgroundNotification(),
          getPaymentWatchTargetPackages(),
        ])
      setEnabled(isEnabled)
      setUsageAccess(hasAccess)
      setNotificationAccess(hasNotifications)
      setDelay(delaySeconds)
      setDelayDraft(String(delaySeconds))
      setKeepWatchingNotification(keepBg)
      setSelectedPackages(targets)
    } catch {
      Alert.alert('Could not load payment helper', 'Please try again.')
    } finally {
      setHelperReady(true)
    }
  }, [available])

  const loadAppsList = useCallback(async () => {
    if (!available) return
    setAppsLoading(true)
    try {
      const launchable = await getPaymentWatchLaunchableApps()
      setApps(launchable)
    } catch {
      // User can reopen the modal to retry
    } finally {
      setAppsLoading(false)
    }
  }, [available])

  useEffect(() => {
    refreshHelperCore()
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshHelperCore()
    })
    return () => subscription.remove()
  }, [refreshHelperCore])

  useEffect(() => {
    if (available) loadAppsList()
  }, [available, loadAppsList])

  const openAppsModal = () => {
    setAppsModalVisible(true)
    if (apps.length === 0 && !appsLoading) loadAppsList()
  }

  const selectedSummary = useMemo(
    () => packageSummary(selectedPackages, apps),
    [selectedPackages, apps],
  )

  const toggleHelper = async (value: boolean) => {
    if (value && selectedPackages.length === 0) {
      Alert.alert('Choose an app', 'Select at least one payment app first.')
      openAppsModal()
      return
    }
    if (value && !(await requestPermissions())) {
      Alert.alert(
        'Notifications are off',
        'Allow notifications for UnSpoil before enabling payment helper.',
      )
      return
    }
    const result = await setPaymentWatchEnabled(value)
    if (value && result === 'needs_notification_permission') {
      setEnabled(false)
      Alert.alert(
        'Notifications are off',
        'Turn on UnSpoil notifications and enable the “Log a payment” channel.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open settings', onPress: openPaymentWatchNotificationSettings },
        ],
      )
      await refreshHelperCore()
      return
    }
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
    await refreshHelperCore()
  }

  const saveDelay = async (seconds: number) => {
    const next = Math.round(Math.max(0, Math.min(60, seconds)))
    setDelay(next)
    setDelayDraft(String(next))
    await setPaymentWatchDelaySeconds(next)
  }

  const commitDelayDraft = async () => {
    const parsed = Number.parseInt(delayDraft.replace(/\D/g, ''), 10)
    const next = Number.isFinite(parsed) ? parsed : delay
    await saveDelay(next)
  }

  const toggleKeepWatchingNotification = async (value: boolean) => {
    setKeepWatchingNotification(value)
    await setPaymentWatchKeepBackgroundNotification(value)
  }

  const toggleApp = async (packageName: string) => {
    const next = selectedPackages.includes(packageName)
      ? selectedPackages.filter(item => item !== packageName)
      : [...selectedPackages, packageName]
    if (enabled && next.length === 0) {
      Alert.alert('Keep one app selected', 'Turn off payment helper before removing every app.')
      return
    }
    setSelectedPackages(next)
    await setPaymentWatchTargetPackages(next)
  }

  const setNudge = (key: keyof NudgeToggles, value: boolean) => {
    const updated = { ...pb.nudgeToggles, [key]: value }
    pb.updatePlaybook({ nudgeToggles: updated })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Manage notifications and select apps. At most one plan nudge a day; each alert once per
          month while it still applies. Quiet 10pm–8am.
        </Text>

        <Text style={styles.sectionTitle}>Plan nudges</Text>
        <Card>
          {NUDGE_ROWS.map((item, i) => (
            <View key={item.key}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.toggleRow}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Switch
                  value={pb.nudgeToggles[item.key]}
                  onValueChange={v => setNudge(item.key, v)}
                  trackColor={{ false: colors.border, true: colors.greenFill }}
                  thumbColor={pb.nudgeToggles[item.key] ? colors.green : '#f4f3f4'}
                />
              </View>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Payment helper</Text>
        {!available ? (
          <Card>
            <Text style={styles.rowDetail}>
              Payment helper is Android-only and needs a development or store build (not Expo Go).
            </Text>
          </Card>
        ) : !helperReady ? (
          <Card style={styles.helperLoading}>
            <ActivityIndicator color={colors.green} />
          </Card>
        ) : (
          <>
            <Card>
              <SettingRow
                label="Payment helper"
                detail="Log prompt when a selected payment app is open"
                value={enabled}
                onValueChange={toggleHelper}
              />
              {enabled && !usageAccess && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.warning}>
                    Usage access is off. UnSpoil cannot detect the selected apps.
                  </Text>
                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={openPaymentWatchUsageSettings}
                  >
                    <Text style={styles.outlineButtonText}>Grant usage access</Text>
                  </TouchableOpacity>
                </>
              )}
              {enabled && !notificationAccess && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.warning}>
                    Notifications are off or “Log a payment” is blocked — prompts will not appear.
                  </Text>
                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={openPaymentWatchNotificationSettings}
                  >
                    <Text style={styles.outlineButtonText}>Open notification settings</Text>
                  </TouchableOpacity>
                </>
              )}
              {enabled && (
                <>
                  <View style={styles.divider} />
                  <SettingRow
                    label="Always-on watching notification"
                    detail="Optional quiet notification for more reliable detection in the background"
                    value={keepWatchingNotification}
                    onValueChange={toggleKeepWatchingNotification}
                  />
                </>
              )}
              {enabled && usageAccess && notificationAccess && !keepWatchingNotification && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.helpInline}>
                    If log prompts stop, turn on always-on watching or set UnSpoil to unrestricted
                    battery use.
                  </Text>
                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={openPaymentWatchBatterySettings}
                  >
                    <Text style={styles.outlineButtonText}>Battery settings</Text>
                  </TouchableOpacity>
                </>
              )}
            </Card>

            <Text style={styles.sectionTitle}>Prompt timing</Text>
            <Card>
              <View style={styles.delayRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.rowLabel}>Wait before prompt</Text>
                  <Text style={styles.rowDetail}>Seconds after a selected app opens</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, delay <= 0 && styles.stepperBtnDisabled]}
                    disabled={delay <= 0}
                    onPress={() => saveDelay(delay - 1)}
                    accessibilityLabel="Decrease seconds"
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    value={delayDraft}
                    onChangeText={setDelayDraft}
                    onBlur={commitDelayDraft}
                    onSubmitEditing={commitDelayDraft}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.delayInput}
                    accessibilityLabel="Prompt delay in seconds"
                  />
                  <Text style={styles.stepperSuffix}>sec</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, delay >= 60 && styles.stepperBtnDisabled]}
                    disabled={delay >= 60}
                    onPress={() => saveDelay(delay + 1)}
                    accessibilityLabel="Increase seconds"
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Payment apps</Text>
            <Card>
              <TouchableOpacity style={styles.navRow} onPress={openAppsModal}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.rowLabel}>Watched apps</Text>
                  <Text style={styles.rowDetail}>{selectedSummary}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>

      <PaymentWatchAppsModal
        visible={appsModalVisible}
        loading={appsLoading && apps.length === 0}
        apps={apps}
        selectedPackages={selectedPackages}
        onClose={() => setAppsModalVisible(false)}
        onToggle={toggleApp}
      />
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
  lead: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
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
  delayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperBtnDisabled: { opacity: 0.35 },
  delayInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepperSuffix: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginRight: 2,
  },
  helpInline: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  helperLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
})
