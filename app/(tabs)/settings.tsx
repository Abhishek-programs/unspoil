import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  AppState,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { Card } from '@/components/ui/Card'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore, Bucket } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { formatNPR } from '@/lib/format'
import { getMonthRange } from '@/lib/month'
import { EF_BUCKET_ID } from '@/constants/defaults'
import { db, applySchemaPatches } from '@/db/client'
import {
  transactions,
  netWorthSnapshots,
  buckets as bucketsTable,
  keywordMappings as keywordMappingsTable,
  sureShotMerchants as sureShotMerchantsTable,
  bucketBalances as bucketBalancesTable,
  playbook,
  goals as goalsTable,
  contacts as contactsTable,
  lendBorrowEntries as lendBorrowEntriesTable,
  accounts as accountsTable,
  accountTransfers as accountTransfersTable,
  accountAdjustments as accountAdjustmentsTable,
} from '@/db/schema'
import { seedDefaults } from '@/db/seed'
import { useLendingStore } from '@/store/lending'
import { useAccountsStore } from '@/store/accounts'
import { BANK_ACCOUNT_ID, ESEWA_ACCOUNT_ID } from '@/constants/accounts'
import {
  getPaymentWatchEnabled,
  hasPaymentWatchUsageAccess,
  isPaymentWatchAvailable,
  openPaymentWatchUsageSettings,
  setPaymentWatchEnabled,
} from '@/lib/payment-watch'
import { requestPermissions } from '@/lib/notifications'

const BUCKET_TYPES: Bucket['type'][] = ['spending', 'savings', 'investment']

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={{ marginBottom: 8, marginTop: 24 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && <Text style={styles.sectionDesc}>{description}</Text>}
    </View>
  )
}

function EditableRow({
  label,
  value,
  onSave,
  prefix,
  suffix,
  keyboardType = 'numeric',
  onSaved,
}: {
  label: string
  value: number
  onSave: (v: number) => void
  prefix?: string
  suffix?: string
  keyboardType?: 'numeric' | 'number-pad'
  onSaved?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const skipBlurSave = useRef(false)

  const startEdit = () => {
    if (editing) return
    setDraft(String(value))
    setEditing(true)
  }

  const save = () => {
    if (skipBlurSave.current) {
      skipBlurSave.current = false
      return
    }
    const num = parseInt(draft, 10)
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num)
      setJustSaved(true)
      onSaved?.()
      setTimeout(() => setJustSaved(false), 2000)
    }
    setEditing(false)
  }

  const reset = () => {
    skipBlurSave.current = true
    setDraft(String(value))
    setTimeout(() => {
      skipBlurSave.current = false
    }, 300)
  }

  return (
    <TouchableOpacity onPress={startEdit} style={styles.editableRow} activeOpacity={0.6}>
      <Text style={styles.editableLabel}>{label}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPressIn={reset} hitSlop={12}>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Reset</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.editableInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType={keyboardType}
            onSubmitEditing={save}
            onBlur={save}
            autoFocus
            selectTextOnFocus
          />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {justSaved && <Text style={{ color: colors.green, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>Saved ✓</Text>}
          <Text style={styles.editableValue}>
            {prefix}
            {prefix ? formatNPR(value) : String(value)}
            {suffix}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

function EditableStringRow({
  label,
  value,
  onSave,
  placeholder,
  onSaved,
}: {
  label: string
  value: string
  onSave: (v: string) => void
  placeholder?: string
  onSaved?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const skipBlurSave = useRef(false)

  const startEdit = () => {
    if (editing) return
    setDraft(value)
    setEditing(true)
  }

  const save = () => {
    if (skipBlurSave.current) {
      skipBlurSave.current = false
      return
    }
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
      setJustSaved(true)
      onSaved?.()
      setTimeout(() => setJustSaved(false), 2000)
    }
    setEditing(false)
  }

  const reset = () => {
    skipBlurSave.current = true
    setDraft(value)
    setTimeout(() => {
      skipBlurSave.current = false
    }, 300)
  }

  return (
    <TouchableOpacity onPress={startEdit} style={styles.editableRow} activeOpacity={0.6}>
      <Text style={styles.editableLabel}>{label}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPressIn={reset} hitSlop={12}>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Reset</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.editableInput, { textAlign: 'right' }]}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={save}
            onBlur={save}
            placeholder={placeholder}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
          />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {justSaved && <Text style={{ color: colors.green, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>Saved ✓</Text>}
          <Text style={styles.editableValue}>
            {value || placeholder}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

function TypeBadge({ type }: { type: Bucket['type'] }) {
  const bg =
    type === 'spending' ? colors.amberFill : type === 'savings' ? colors.greenFill : '#EDE9FE'
  const fg = type === 'spending' ? colors.amber : type === 'savings' ? colors.green : '#7C3AED'
  return (
    <View style={[styles.typeBadge, { backgroundColor: bg }]}>
      <Text style={[styles.typeBadgeText, { color: fg }]}>{type}</Text>
    </View>
  )
}

function BucketPicker({
  activeBuckets,
  selectedId,
  onSelect,
}: {
  activeBuckets: Bucket[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <View style={styles.bucketPicker}>
      {activeBuckets.map(b => (
        <Pressable
          key={b.id}
          onPress={() => onSelect(b.id)}
          style={[
            styles.bucketPickerItem,
            selectedId === b.id && { backgroundColor: colors.greenFill, borderColor: colors.green },
          ]}
        >
          <Text
            style={[
              styles.bucketPickerText,
              selectedId === b.id && { color: colors.green },
            ]}
            numberOfLines={1}
          >
            {b.icon} {b.name}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function useSavedFeedback() {
  const opacity = useRef(new Animated.Value(0)).current
  const show = () => {
    opacity.setValue(1)
    Animated.timing(opacity, {
      toValue: 0,
      duration: 1500,
      delay: 400,
      useNativeDriver: true,
    }).start()
  }
  return { opacity, show }
}

function MoneyLocationsCard() {
  const { accounts, addFoundMoney, transfer, loadAccounts } = useAccountsStore()
  const [mode, setMode] = useState<'idle' | 'add' | 'move'>('idle')
  const [amount, setAmount] = useState('')
  const [destId, setDestId] = useState(BANK_ACCOUNT_ID)
  const [fromId, setFromId] = useState(BANK_ACCOUNT_ID)
  const [toId, setToId] = useState(ESEWA_ACCOUNT_ID)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const parsed = Math.round((parseFloat(amount.replace(/,/g, '')) || 0) * 1000) / 1000

  const reset = () => {
    setMode('idle')
    setAmount('')
    setDestId(BANK_ACCOUNT_ID)
    setFromId(BANK_ACCOUNT_ID)
    setToId(ESEWA_ACCOUNT_ID)
  }

  const onAdd = async () => {
    if (parsed <= 0 || busy) return
    setBusy(true)
    try {
      await addFoundMoney(destId, parsed, 'Found money')
      reset()
    } finally {
      setBusy(false)
    }
  }

  const onMove = async () => {
    if (parsed <= 0 || fromId === toId || busy) return
    setBusy(true)
    try {
      await transfer(fromId, toId, parsed)
      reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SectionHeader
        title="Money locations"
        description="Where Your money sits — Bank, eSewa, Cash. Add found cash or move between wallets."
      />
      <Card>
        {accounts.map((a, i) => (
          <View key={a.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.toggleRow}>
              <Text style={styles.editableLabel}>{a.name}</Text>
              <Text style={styles.editableValue}>NPR {formatNPR(a.balance)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.divider} />
        {mode === 'idle' && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setMode('add')} style={[styles.actionButton, { flex: 1 }]}>
              <Text style={styles.actionButtonText}>Add money</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('move')} style={[styles.actionButton, { flex: 1 }]}>
              <Text style={styles.actionButtonText}>Move</Text>
            </TouchableOpacity>
          </View>
        )}
        {mode === 'add' && (
          <View>
            <Text style={styles.editableLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.editableLabel, { marginTop: 12 }]}>Into</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setDestId(a.id)}
                  style={[
                    styles.typeChip,
                    destId === a.id && { backgroundColor: colors.greenFill, borderColor: colors.green },
                  ]}
                >
                  <Text style={[styles.typeChipText, destId === a.id && { color: colors.green }]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editorActions}>
              <TouchableOpacity onPress={reset}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onAdd} disabled={parsed <= 0 || busy}>
                <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {mode === 'move' && (
          <View>
            <Text style={styles.editableLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.editableLabel, { marginTop: 12 }]}>From</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setFromId(a.id)}
                  style={[
                    styles.typeChip,
                    fromId === a.id && { backgroundColor: colors.greenFill, borderColor: colors.green },
                  ]}
                >
                  <Text style={[styles.typeChipText, fromId === a.id && { color: colors.green }]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.editableLabel, { marginTop: 12 }]}>To</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setToId(a.id)}
                  style={[
                    styles.typeChip,
                    toId === a.id && { backgroundColor: colors.greenFill, borderColor: colors.green },
                  ]}
                >
                  <Text style={[styles.typeChipText, toId === a.id && { color: colors.green }]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editorActions}>
              <TouchableOpacity onPress={reset}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onMove} disabled={parsed <= 0 || fromId === toId || busy}>
                <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                  Move
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    </>
  )
}

function PaymentWatchCard() {
  const available = isPaymentWatchAvailable()
  const [enabled, setEnabled] = useState(false)
  const [usage, setUsage] = useState(false)

  const refresh = useCallback(async () => {
    if (!available) return
    const [on, access] = await Promise.all([
      getPaymentWatchEnabled(),
      hasPaymentWatchUsageAccess(),
    ])
    setEnabled(on)
    setUsage(access)
  }, [available])

  useEffect(() => {
    refresh()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => sub.remove()
  }, [refresh])

  if (Platform.OS !== 'android') return null

  const onToggle = async (value: boolean) => {
    if (!available) return
    if (value) {
      await requestPermissions()
    }
    const result = await setPaymentWatchEnabled(value)
    await refresh()
    if (value && result === 'needs_usage_access') {
      Alert.alert(
        'Usage access needed',
        'Android will show a list of apps. Find SpendSense and turn usage access on. We never record your screen — we only see which app is open so we can offer a log notification.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open settings', onPress: () => openPaymentWatchUsageSettings() },
        ],
      )
    }
  }

  return (
    <>
      <SectionHeader
        title="Payment helper"
        description="While eSewa or nBank is open, type the amount in a notification. Assign a bucket the next time you open SpendSense. Off until you enable it."
      />
      <Card>
        {!available ? (
          <Text style={styles.sectionDesc}>
            Needs a development build (not Expo Go). Rebuild with npx expo run:android.
          </Text>
        ) : (
          <>
            <View style={styles.toggleRow}>
              <Text style={[styles.editableLabel, { flex: 1, paddingRight: 12 }]}>
                Log from eSewa / nBank
              </Text>
              <Switch
                value={enabled}
                onValueChange={onToggle}
                trackColor={{ false: colors.border, true: colors.greenFill }}
                thumbColor={enabled ? colors.green : '#f4f3f4'}
              />
            </View>
            {enabled && !usage && (
              <>
                <View style={styles.divider} />
                <Text style={[styles.sectionDesc, { marginBottom: 10 }]}>
                  Usage access is off. SpendSense cannot tell when a payment app is open.
                </Text>
                <TouchableOpacity
                  onPress={() => openPaymentWatchUsageSettings()}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Grant usage access</Text>
                </TouchableOpacity>
              </>
            )}
            {enabled && usage && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionDesc}>
                  A notification appears about 5 seconds after eSewa or nBank is open. After you log and pick a bucket, it stays gone until you leave that app.
                </Text>
              </>
            )}
          </>
        )}
      </Card>
    </>
  )
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const pb = usePlaybookStore()
  const bs = useBucketsStore()
  const txnStore = useTransactionsStore()
  const goalsStore = useGoalsStore()
  const saved = useSavedFeedback()

  const activeBuckets = bs.buckets.filter(b => b.isActive)
  const livingBuckets = activeBuckets.filter(b => b.type === 'spending')
  const futureBuckets = activeBuckets.filter(b => b.type === 'savings' || b.type === 'investment')

  // Bucket inline editor state
  const [expandedBucketId, setExpandedBucketId] = useState<string | null>(null)
  const [bucketDraft, setBucketDraft] = useState({
    name: '',
    monthlyAmount: '',
    accumulationCap: '',
    type: 'spending' as Bucket['type'],
    showOnHome: true,
  })
  const bucketDraftRef = useRef(bucketDraft)
  bucketDraftRef.current = bucketDraft
  const skipBucketBlurPersist = useRef(false)
  const [focusedBucketField, setFocusedBucketField] = useState<
    'name' | 'monthlyAmount' | 'accumulationCap' | null
  >(null)

  // Add bucket state
  const [addingBucket, setAddingBucket] = useState(false)
  const [newBucket, setNewBucket] = useState({ name: '', monthlyAmount: '', type: 'spending' as Bucket['type'], showOnHome: true })

  // Keyword mapping state
  const [addingMapping, setAddingMapping] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newMappingBucketId, setNewMappingBucketId] = useState(activeBuckets[0]?.id ?? '')

  // Merchant add state
  const [addingMerchant, setAddingMerchant] = useState(false)
  const [newMerchant, setNewMerchant] = useState('')
  const [newMerchantBucketId, setNewMerchantBucketId] = useState(activeBuckets[0]?.id ?? '')

  // Notification toggles — synced to playbook store
  const [nudges, setNudges] = useState(pb.nudgeToggles)

  const draftFromBucket = (b: Bucket) => ({
    name: b.name,
    monthlyAmount: String(b.monthlyAmount),
    accumulationCap: b.accumulationCap != null ? String(b.accumulationCap) : '',
    type: b.type,
    showOnHome: b.showOnHome,
  })

  const persistBucketDraft = async (
    id: string,
    draft = bucketDraftRef.current,
  ) => {
    const bucket = bs.buckets.find(x => x.id === id)
    if (!bucket) return
    const amt = parseInt(draft.monthlyAmount, 10)
    if (!draft.name.trim() || isNaN(amt) || amt < 0) return
    const patch: Partial<Bucket> = {
      name: draft.name.trim(),
      monthlyAmount: amt,
      type: draft.type,
      showOnHome: draft.showOnHome,
    }
    if (bucket.accumulates) {
      const cap = parseInt(draft.accumulationCap, 10)
      if (!isNaN(cap) && cap > 0) {
        patch.accumulationCap = cap
      }
    }
    const unchanged =
      patch.name === bucket.name &&
      patch.monthlyAmount === bucket.monthlyAmount &&
      patch.type === bucket.type &&
      patch.showOnHome === bucket.showOnHome &&
      (!bucket.accumulates || patch.accumulationCap === bucket.accumulationCap)
    if (unchanged) return
    await bs.updateBucket(id, patch)
    saved.show()
  }

  const expandBucket = async (b: Bucket) => {
    if (expandedBucketId && expandedBucketId !== b.id) {
      await persistBucketDraft(expandedBucketId)
    }
    if (expandedBucketId === b.id) {
      await persistBucketDraft(b.id)
      setExpandedBucketId(null)
      setFocusedBucketField(null)
      return
    }
    setExpandedBucketId(b.id)
    setFocusedBucketField(null)
    setBucketDraft(draftFromBucket(b))
  }

  const onBucketFieldBlur = (id: string) => {
    if (skipBucketBlurPersist.current) {
      skipBucketBlurPersist.current = false
      return
    }
    setFocusedBucketField(null)
    void persistBucketDraft(id)
  }

  const resetBucketField = (b: Bucket) => {
    skipBucketBlurPersist.current = true
    const existing = draftFromBucket(b)
    if (focusedBucketField === 'name') {
      setBucketDraft(d => ({ ...d, name: existing.name }))
    } else if (focusedBucketField === 'monthlyAmount') {
      setBucketDraft(d => ({ ...d, monthlyAmount: existing.monthlyAmount }))
    } else if (focusedBucketField === 'accumulationCap') {
      setBucketDraft(d => ({ ...d, accumulationCap: existing.accumulationCap }))
    } else {
      setBucketDraft(existing)
    }
    setTimeout(() => {
      skipBucketBlurPersist.current = false
    }, 300)
  }

  const applyBucketType = (id: string, type: Bucket['type']) => {
    const next = { ...bucketDraftRef.current, type }
    setBucketDraft(next)
    void persistBucketDraft(id, next)
  }

  const applyBucketShowOnHome = (id: string, showOnHome: boolean) => {
    const next = { ...bucketDraftRef.current, showOnHome }
    setBucketDraft(next)
    void persistBucketDraft(id, next)
  }

  const confirmDeactivate = (b: Bucket) => {
    Alert.alert('Deactivate Bucket', `Remove "${b.name}" from active buckets?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => bs.deactivateBucket(b.id) },
    ])
  }

  const handleAddBucket = async () => {
    const amt = parseInt(newBucket.monthlyAmount, 10)
    if (!newBucket.name.trim() || isNaN(amt) || amt <= 0) return
    await bs.addBucket({
      name: newBucket.name.trim(),
      type: newBucket.type,
      monthlyAmount: amt,
      color: colors.green,
      icon: '💰',
      sortOrder: bs.buckets.length,
      isActive: true,
      showOnHome: newBucket.showOnHome,
    })
    setNewBucket({ name: '', monthlyAmount: '', type: 'spending', showOnHome: true })
    setAddingBucket(false)
  }

  const handleAddMapping = async () => {
    if (!newKeyword.trim() || !newMappingBucketId) return
    await bs.addKeywordMapping(newKeyword.trim().toLowerCase(), newMappingBucketId)
    setNewKeyword('')
    setAddingMapping(false)
  }

  const handleAddMerchant = async () => {
    if (!newMerchant.trim() || !newMerchantBucketId) return
    await bs.addSureShotMerchant(newMerchant.trim(), newMerchantBucketId)
    setNewMerchant('')
    setAddingMerchant(false)
  }

  const getBucketName = (id: string) => bs.buckets.find(b => b.id === id)?.name ?? 'Unknown'

  const handleExportCSV = () => {
    const rows = txnStore.transactions
    const header = 'Date,Type,Amount,Merchant,Bucket,Remarks,Source'
    const csvRows = rows.map(t => {
      const bucket = getBucketName(t.bucketId)
      const merchant = (t.merchant ?? '').replace(/,/g, ' ')
      const remarks = (t.remarks ?? '').replace(/,/g, ' ')
      return `${t.date},${t.type},${t.amount},${merchant},${bucket},${remarks},${t.source}`
    })
    const csv = [header, ...csvRows].join('\n')
    Alert.alert('CSV Export', `${rows.length} transactions exported.\n\n${csv.slice(0, 500)}${csv.length > 500 ? '...' : ''}`)
  }

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL transactions, goals, buckets, and settings, then re-seed defaults. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.delete(transactions)
              await db.delete(accountTransfersTable)
              await db.delete(accountAdjustmentsTable)
              await db.delete(accountsTable)
              await db.delete(lendBorrowEntriesTable)
              await db.delete(contactsTable)
              await db.delete(goalsTable)
              await db.delete(bucketBalancesTable)
              await db.delete(netWorthSnapshots)
              await db.delete(keywordMappingsTable)
              await db.delete(sureShotMerchantsTable)
              await db.delete(bucketsTable)
              await db.delete(playbook)
              applySchemaPatches()
              await seedDefaults()
              await pb.loadPlaybook()
              await bs.loadBuckets()
              const { start, end } = getMonthRange(pb.monthStartDay)
              await txnStore.loadTransactions(start, end)
              await goalsStore.loadGoals()
              await useLendingStore.getState().loadContacts()
              await useLendingStore.getState().loadAllEntries()
              await useLendingStore.getState().loadEntries(start, end)
              await useAccountsStore.getState().loadAccounts()
              Alert.alert('Done', 'All data cleared and defaults restored.')
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not clear data')
            }
          },
        },
      ],
    )
  }

  const renderExistingBucketEditor = (b: Bucket) => (
    <View style={styles.bucketEditor}>
      <TextInput
        style={styles.input}
        value={bucketDraft.name}
        onChangeText={v => setBucketDraft(d => ({ ...d, name: v }))}
        onFocus={() => setFocusedBucketField('name')}
        onBlur={() => onBucketFieldBlur(b.id)}
        placeholder="Name"
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        value={bucketDraft.monthlyAmount}
        onChangeText={v => setBucketDraft(d => ({ ...d, monthlyAmount: v }))}
        onFocus={() => setFocusedBucketField('monthlyAmount')}
        onBlur={() => onBucketFieldBlur(b.id)}
        keyboardType="numeric"
        placeholder={b.accumulates ? 'Monthly top-up' : 'Monthly amount'}
        placeholderTextColor={colors.textMuted}
      />
      {b.accumulates && (
        <>
          <Text style={[styles.fieldHint, { marginTop: 8 }]}>
            Current balance: NPR {formatNPR(bs.getBucketBalance(b.id))}
          </Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={bucketDraft.accumulationCap}
            onChangeText={v => setBucketDraft(d => ({ ...d, accumulationCap: v }))}
            onFocus={() => setFocusedBucketField('accumulationCap')}
            onBlur={() => onBucketFieldBlur(b.id)}
            keyboardType="numeric"
            placeholder="Max balance cap"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.fieldHint}>Disabling stops top-ups; balance is kept.</Text>
        </>
      )}
      <View style={styles.typeRow}>
        {BUCKET_TYPES.map(t => (
          <Pressable
            key={t}
            onPress={() => applyBucketType(b.id, t)}
            style={[styles.typeChip, bucketDraft.type === t && { backgroundColor: colors.green }]}
          >
            <Text style={[styles.typeChipText, bucketDraft.type === t && { color: '#fff' }]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.toggleRow, { marginTop: 12 }]}>
        <Text style={styles.editableLabel}>Show on Home Screen</Text>
        <Switch
          value={bucketDraft.showOnHome}
          onValueChange={v => applyBucketShowOnHome(b.id, v)}
          trackColor={{ false: colors.border, true: colors.greenFill }}
          thumbColor={bucketDraft.showOnHome ? colors.green : '#f4f3f4'}
        />
      </View>
      <View style={styles.editorActions}>
        <TouchableOpacity onPressIn={() => resetBucketField(b)} hitSlop={12}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Animated.Text style={[styles.headerSaved, { opacity: saved.opacity }]}>
          Saved
        </Animated.Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
      >

        {/* Section 1: Playbook */}
        <SectionHeader title="Playbook" description="Core financial parameters" />
        <Card>
          <EditableStringRow
            label="Display name"
            value={pb.userName || ''}
            onSave={v => pb.updatePlaybook({ userName: v })}
            onSaved={saved.show}
            placeholder="Your name"
          />
          <View style={styles.divider} />
          <EditableRow
            label="Monthly income"
            value={pb.monthlyIncome}
            prefix="NPR "
            onSave={v => pb.updatePlaybook({ monthlyIncome: v })}
            onSaved={saved.show}
          />
          <View style={styles.divider} />
          <EditableRow
            label="Month start day"
            value={pb.monthStartDay}
            suffix=" of Month"
            onSave={v => pb.updatePlaybook({ monthStartDay: Math.max(1, Math.min(28, v)) })}
            onSaved={saved.show}
          />
          <View style={styles.divider} />
          <EditableRow
            label="EF floor"
            value={pb.efFloor}
            prefix="NPR "
            onSave={v => pb.updatePlaybook({ efFloor: v })}
            onSaved={saved.show}
          />
          <View style={styles.divider} />
          <EditableRow
            label="Your age (optional)"
            value={pb.userAge ?? 0}
            onSave={v => pb.updatePlaybook({ userAge: v > 0 ? v : null })}
            onSaved={saved.show}
          />
        </Card>

        <SectionHeader title="Buckets" description="Categorize and manage your financial buckets" />
        
        <Text style={styles.subGroupTitle}>Living (Spending)</Text>
        <Card>
          {livingBuckets.map((b, i) => (
            <View key={b.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.bucketRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => expandBucket(b)}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{b.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.bucketName}>{b.name}</Text>
                      {!b.showOnHome && <Ionicons name="eye-off" size={14} color={colors.textMuted} />}
                    </View>
                    <Text style={styles.bucketAmount}>
                      {b.accumulates
                        ? `Fund: NPR ${formatNPR(bs.getBucketBalance(b.id))} · +${formatNPR(b.monthlyAmount)}/mo`
                        : `NPR ${formatNPR(b.monthlyAmount)}/mo`}
                    </Text>
                  </View>
                  <TypeBadge type={b.type} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeactivate(b)} hitSlop={8} style={{ marginLeft: 12 }}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {expandedBucketId === b.id && renderExistingBucketEditor(b)}
            </View>
          ))}
          {livingBuckets.length === 0 && (
            <Text style={styles.emptyText}>No spending buckets yet.</Text>
          )}
        </Card>

        <Text style={[styles.subGroupTitle, { marginTop: 20 }]}>Future (Savings & Investments)</Text>
        <Card>
          {futureBuckets.map((b, i) => (
            <View key={b.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.bucketRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => expandBucket(b)}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{b.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.bucketName}>{b.name}</Text>
                      {!b.showOnHome && <Ionicons name="eye-off" size={14} color={colors.textMuted} />}
                    </View>
                    <Text style={styles.bucketAmount}>
                      {b.accumulates
                        ? `Fund: NPR ${formatNPR(bs.getBucketBalance(b.id))} · +${formatNPR(b.monthlyAmount)}/mo`
                        : `NPR ${formatNPR(b.monthlyAmount)}/mo`}
                    </Text>
                  </View>
                  <TypeBadge type={b.type} />
                </TouchableOpacity>
                {b.id === EF_BUCKET_ID ? (
                  <View style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenFill, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Ionicons name="lock-closed" size={12} color={colors.green} />
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.green }}>Protected</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => confirmDeactivate(b)} hitSlop={8} style={{ marginLeft: 12 }}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {expandedBucketId === b.id && renderExistingBucketEditor(b)}
            </View>
          ))}
          {futureBuckets.length === 0 && (
            <Text style={styles.emptyText}>No savings or investment buckets yet.</Text>
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          {addingBucket ? (
            <View style={styles.bucketEditor}>
              <TextInput
                style={styles.input}
                value={newBucket.name}
                onChangeText={v => setNewBucket(d => ({ ...d, name: v }))}
                placeholder="Bucket name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={newBucket.monthlyAmount}
                onChangeText={v => setNewBucket(d => ({ ...d, monthlyAmount: v }))}
                keyboardType="numeric"
                placeholder="Monthly amount"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.typeRow}>
                {BUCKET_TYPES.map(t => (
                  <Pressable
                    key={t}
                    onPress={() => setNewBucket(d => ({ ...d, type: t }))}
                    style={[
                      styles.typeChip,
                      newBucket.type === t && { backgroundColor: colors.green },
                    ]}
                  >
                    <Text
                      style={[styles.typeChipText, newBucket.type === t && { color: '#fff' }]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.toggleRow, { marginTop: 12 }]}>
                <Text style={styles.editableLabel}>Show on Home Screen</Text>
                <Switch
                  value={newBucket.showOnHome}
                  onValueChange={v => setNewBucket(d => ({ ...d, showOnHome: v }))}
                  trackColor={{ false: colors.border, true: colors.greenFill }}
                  thumbColor={newBucket.showOnHome ? colors.green : '#f4f3f4'}
                />
              </View>
              <View style={styles.editorActions}>
                <TouchableOpacity onPress={() => setAddingBucket(false)}>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddBucket}>
                  <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setAddingBucket(true)} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>+ Add bucket</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Section 3: Keyword Mappings */}
        <SectionHeader title="Keyword Mappings" description='End remarks with "keyword -" to auto-categorize' />
        <Card>
          {bs.keywordMappings.map((km, i) => (
            <View key={km.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.mappingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mappingKeyword}>{km.keyword}</Text>
                  <Text style={styles.mappingBucket}>{getBucketName(km.bucketId)}</Text>
                </View>
                <TouchableOpacity onPress={() => bs.deleteKeywordMapping(km.id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {bs.keywordMappings.length > 0 && <View style={styles.divider} />}

          {addingMapping ? (
            <View style={{ paddingTop: 4 }}>
              <TextInput
                style={styles.input}
                value={newKeyword}
                onChangeText={setNewKeyword}
                placeholder="Keyword (exact match)"
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCapitalize="none"
              />
              <Text style={[styles.editableLabel, { marginTop: 8, marginBottom: 4 }]}>Bucket:</Text>
              <BucketPicker
                activeBuckets={activeBuckets}
                selectedId={newMappingBucketId}
                onSelect={setNewMappingBucketId}
              />
              <View style={styles.editorActions}>
                <TouchableOpacity onPress={() => setAddingMapping(false)}>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddMapping}>
                  <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setAddingMapping(true); setNewMappingBucketId(activeBuckets[0]?.id ?? '') }} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>+ Add keyword</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Section 4: Sure-Shot Merchants */}
        <SectionHeader title="Sure-Shot Merchants" description="Auto-categorize by merchant name" />
        <Card>
          {bs.sureShotMerchants.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.mappingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mappingKeyword}>{m.merchantName}</Text>
                  <Text style={styles.mappingBucket}>{getBucketName(m.bucketId)}</Text>
                </View>
                <TouchableOpacity onPress={() => bs.deleteSureShotMerchant(m.id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {bs.sureShotMerchants.length > 0 && <View style={styles.divider} />}

          {addingMerchant ? (
            <View style={{ paddingTop: 4 }}>
              <TextInput
                style={styles.input}
                value={newMerchant}
                onChangeText={setNewMerchant}
                placeholder="Merchant name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <Text style={[styles.editableLabel, { marginTop: 8, marginBottom: 4 }]}>Bucket:</Text>
              <BucketPicker
                activeBuckets={activeBuckets}
                selectedId={newMerchantBucketId}
                onSelect={setNewMerchantBucketId}
              />
              <View style={styles.editorActions}>
                <TouchableOpacity onPress={() => setAddingMerchant(false)}>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddMerchant}>
                  <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setAddingMerchant(true); setNewMerchantBucketId(activeBuckets[0]?.id ?? '') }} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>+ Add merchant</Text>
            </TouchableOpacity>
          )}
        </Card>

        <MoneyLocationsCard />

        <PaymentWatchCard />

        {/* Section 5: Notifications */}
        <SectionHeader title="Notifications" description="Nudge preferences (max 1 per day, quiet 10pm-8am)" />
        <Card>
          {[
            { key: 'budgetBreach' as const, label: 'Budget breach alerts' },
            { key: 'savingsReminder' as const, label: 'Savings reminders' },
            { key: 'efFloorWarning' as const, label: 'EF floor warnings' },
            { key: 'recurringDraft' as const, label: 'Recurring draft reminders' },
          ].map((item, i) => (
            <View key={item.key}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.toggleRow}>
                <Text style={styles.editableLabel}>{item.label}</Text>
                <Switch
                  value={nudges[item.key]}
                  onValueChange={v => {
                    const updated = { ...nudges, [item.key]: v }
                    setNudges(updated)
                    pb.updatePlaybook({ nudgeToggles: updated })
                  }}
                  trackColor={{ false: colors.border, true: colors.greenFill }}
                  thumbColor={nudges[item.key] ? colors.green : '#f4f3f4'}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Section 6: Data */}
        <SectionHeader title="Data" description="Export your transactions" />
        <Card>
          <TouchableOpacity onPress={handleExportCSV} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </Card>

        <SectionHeader title="Data" description="Danger zone" />
        <Card>
          <TouchableOpacity onPress={handleClearAllData} style={[styles.actionButton, { borderColor: colors.red }]}>
            <Text style={[styles.actionButtonText, { color: colors.red }]}>Clear All Data</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerSaved: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  subGroupTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyText: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 8,
  },
  editableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  editableLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  editableValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  editableInput: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 80,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  nameInput: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 80,
    textAlign: 'right',
  },
  savedLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bucketName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  bucketAmount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  bucketEditor: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.pageBg,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    textTransform: 'capitalize',
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  mappingKeyword: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  mappingBucket: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bucketPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bucketPickerItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
  },
  bucketPickerText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
})
