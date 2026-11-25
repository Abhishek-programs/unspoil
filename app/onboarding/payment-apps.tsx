import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PaymentWatchAppRow } from '@/components/notifications/PaymentWatchAppRow'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { OnboardingPermissionRow } from '@/components/onboarding/OnboardingPermissionRow'
import { KeyboardAvoidingSheet } from '@/components/ui/KeyboardForm'
import { colors } from '@/constants/colors'
import {
  getPaymentWatchEnabled,
  getPaymentWatchLaunchableApps,
  getPaymentWatchTargetPackages,
  hasPaymentWatchNotificationPermission,
  hasPaymentWatchUsageAccess,
  openPaymentWatchUsageSettings,
  PaymentWatchApp,
  setPaymentWatchEnabled,
  setPaymentWatchTargetPackages,
} from '@/lib/payment-watch'

/** Only decides which apps are listed first; every installed app stays pickable. */
const LIKELY_PAYMENT_APP =
  /bank|esewa|khalti|fonepay|connectips|imepay|ime pay|namastepay|wallet|moru|paytm|phonepe|gpay|google pay|paypal|\bpay\b/i

export default function OnboardingPaymentAppsScreen() {
  const insets = useSafeAreaInsets()
  const [apps, setApps] = useState<PaymentWatchApp[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [usageAccess, setUsageAccess] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const loadApps = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const [installed, targets] = await Promise.all([
        getPaymentWatchLaunchableApps(),
        getPaymentWatchTargetPackages(),
      ])
      setApps(installed)
      setSelected(installed.map(a => a.packageName).filter(p => targets.includes(p)))
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApps()
  }, [loadApps])

  useEffect(() => {
    const refreshAccess = () => {
      hasPaymentWatchUsageAccess().then(setUsageAccess, () => {})
    }
    refreshAccess()
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshAccess()
    })
    return () => sub.remove()
  }, [])

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = apps.filter(
      a => a.label.toLowerCase().includes(query) || a.packageName.toLowerCase().includes(query),
    )
    const isLikely = (a: PaymentWatchApp) => LIKELY_PAYMENT_APP.test(`${a.label} ${a.packageName}`)
    return [
      { title: 'Likely payment apps', data: matches.filter(isLikely) },
      { title: 'All apps', data: matches.filter(a => !isLikely(a)) },
    ].filter(section => section.data.length > 0)
  }, [apps, search])

  const toggle = (packageName: string) =>
    setSelected(prev =>
      prev.includes(packageName) ? prev.filter(p => p !== packageName) : [...prev, packageName],
    )

  const grantUsageAccess = async () => {
    try {
      await openPaymentWatchUsageSettings()
    } catch {
      Alert.alert(
        'Could not open settings',
        'Open system Settings → Usage access and allow UnSpoil.',
      )
    }
  }

  const handleNext = async () => {
    if (saving) return
    setSaving(true)
    try {
      // An unloaded list must not wipe an existing choice.
      if (!loading && !loadFailed) {
        if (selected.length > 0) {
          await setPaymentWatchTargetPackages(selected)
          const [access, notifications] = await Promise.all([
            hasPaymentWatchUsageAccess(),
            hasPaymentWatchNotificationPermission(),
          ])
          if (access && notifications) await setPaymentWatchEnabled(true)
        } else if (await getPaymentWatchEnabled()) {
          await setPaymentWatchEnabled(false)
        }
      }
      router.push('/onboarding/money')
    } catch {
      Alert.alert('Could not save your apps', 'You can pick them later in Settings → Notifications.', [
        { text: 'Try again', style: 'cancel' },
        { text: 'Continue', onPress: () => router.push('/onboarding/money') },
      ])
    } finally {
      setSaving(false)
    }
  }

  const hasSelection = selected.length > 0

  return (
    <KeyboardAvoidingSheet style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 8 }]}>
        <OnboardingBack />
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={styles.title}>Pick your banking apps</Text>
          <Text style={styles.subtitle}>
            When you open one, UnSpoil asks what you paid, so you can log it while you remember.
          </Text>
        </Animated.View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search installed apps"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.message}>Loading apps…</Text>
        </View>
      ) : loadFailed ? (
        <View style={styles.center}>
          <Text style={styles.message}>Could not load your apps.</Text>
          <TouchableOpacity onPress={loadApps} hitSlop={12}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={app => app.packageName}
          renderItem={({ item }) => (
            <PaymentWatchAppRow
              app={item}
              selected={selected.includes(item.packageName)}
              onToggle={toggle}
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={<Text style={styles.message}>No matching apps.</Text>}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {hasSelection && (
          <OnboardingPermissionRow
            title="Usage access"
            description="Lets UnSpoil see which app is open, so it knows when to ask. It does not read or record your screen."
            granted={usageAccess}
            onGrant={grantUsageAccess}
          />
        )}
        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{hasSelection ? 'Next' : 'Skip for now'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 16,
  },
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
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  message: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 16,
  },
  retry: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.pageBg,
  },
  button: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderCurve: 'continuous',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
