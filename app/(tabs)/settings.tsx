import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { Card } from '@/components/ui/Card'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore, Bucket } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { formatNPR, formatMoney } from '@/lib/format'
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
import * as Clipboard from 'expo-clipboard'
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { buildClaudeSnapshot, CLAUDE_SHARE_PROMPT, snapshotFilename } from '@/lib/claude-snapshot'
import {
  backupFilename,
  exportBackup,
  hydrateStoresAfterDbChange,
  saveBackupToDevice,
} from '@/lib/backup'
import { startImportBackupFlow } from '@/lib/import-backup-flow'
const BUCKET_TYPES: Bucket['type'][] = ['spending', 'savings', 'investment']

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={{ marginBottom: 8, marginTop: 24 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && <Text style={styles.sectionDesc}>{description}</Text>}
    </View>
  )
}

function SubGroupHeader({
  title,
  total,
  first,
}: {
  title: string
  total: number
  first?: boolean
}) {
  return (
    <View style={[styles.subGroupHeader, first && { marginTop: 0 }]}>
      <Text style={styles.subGroupTitle}>{title}</Text>
      <Text style={styles.subGroupTotal}>{formatMoney(total)}</Text>
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
        title="Accounts"
        description="Where Your money sits. Add found cash or move between wallets."
      />
      <Card>
        {accounts.map((a, i) => (
          <View key={a.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.toggleRow}>
              <Text style={styles.editableLabel}>{a.name}</Text>
              <Text style={styles.editableValue}>{formatMoney(a.balance)}</Text>
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
  const livingTotal = livingBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const futureTotal = futureBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

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
    // Blur/toggle auto-persist: a 0 from a stale draft must never wipe a live ceiling.
    if (amt === 0 && bucket.monthlyAmount > 0) return
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

  const getBucketName = (id: string) => bs.buckets.find(b => b.id === id)?.name ?? 'Unknown'

  const handleShareForClaude = async () => {
    try {
      if (txnStore.allTransactions.length === 0) {
        await txnStore.loadAllTransactions()
      }
      if (useLendingStore.getState().allEntries.length === 0) {
        await useLendingStore.getState().loadAllEntries()
      }
      const markdown = buildClaudeSnapshot({
        playbook: {
          userName: pb.userName,
          userAge: pb.userAge,
          monthlyIncome: pb.monthlyIncome,
          monthStartDay: pb.monthStartDay,
          earlyMonthStartDate: pb.earlyMonthStartDate,
          efFloor: pb.efFloor,
          efStartBalance: pb.efStartBalance,
          carriedForwardBalance: pb.carriedForwardBalance,
        },
        buckets: bs.buckets,
        transactions: useTransactionsStore.getState().allTransactions,
        accounts: useAccountsStore.getState().accounts,
        adjustments: useAccountsStore.getState().adjustments,
        contacts: useLendingStore.getState().contacts,
        entries: useLendingStore.getState().allEntries,
        goals: goalsStore.goals.map(g => ({
          name: g.name,
          targetAmount: g.targetAmount,
          monthlyContribution: g.monthlyContribution,
          startBalance: g.startBalance,
          linkedBucketIds: g.linkedBucketIds,
          completedAt: g.completedAt ?? null,
        })),
        keywordMappings: bs.keywordMappings,
        sureShotMerchants: bs.sureShotMerchants,
      })
      await Clipboard.setStringAsync(CLAUDE_SHARE_PROMPT)
      const name = snapshotFilename()
      const dir = cacheDirectory
      if (!dir) throw new Error('Could not write the snapshot file.')
      const path = `${dir}${name}`
      await writeAsStringAsync(path, markdown)
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Share for Claude', 'Prompt copied. Sharing is not available on this device.')
        return
      }
      try {
        await Sharing.shareAsync(path, {
          mimeType: 'text/markdown',
          dialogTitle: 'Share for Claude',
          UTI: 'public.plain-text',
        })
      } catch (shareError) {
        const text = shareError instanceof Error ? shareError.message : ''
        if (/cancel|dismiss|abort/i.test(text)) return
        throw shareError
      }
      Alert.alert('Share for Claude', 'Prompt copied. Attach the file in Claude.')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not build the snapshot.'
      Alert.alert('Share failed', message)
    }
  }

  const shareBackupFile = async (json: string, name: string) => {
    const dir = cacheDirectory
    if (!dir) throw new Error('Could not write the backup file.')
    const path = `${dir}${name}`
    await writeAsStringAsync(path, json)
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Backup ready', 'Sharing is not available on this device.')
      return
    }
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export UnSpoil backup',
      UTI: 'public.json',
    })
  }

  const handleExportBackup = () => {
    const runSave = async () => {
      try {
        const json = await exportBackup()
        const name = backupFilename()
        await saveBackupToDevice(json, name)
        Alert.alert('Backup saved', `${name} is in the folder you selected (e.g. Downloads).`)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not export backup.'
        if (message === 'CANCELLED') return
        Alert.alert('Export failed', message)
      }
    }
    const runShare = async () => {
      try {
        const json = await exportBackup()
        await shareBackupFile(json, backupFilename())
      } catch (e) {
        const text = e instanceof Error ? e.message : ''
        if (/cancel|dismiss|abort/i.test(text)) return
        Alert.alert('Export failed', text || 'Could not export backup.')
      }
    }

    if (Platform.OS === 'android') {
      Alert.alert(
        'Export backup',
        'Save a copy on this phone before reinstalling or switching to the new app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save to device', onPress: () => void runSave() },
          { text: 'Share', onPress: () => void runShare() },
        ],
      )
      return
    }
    void runShare()
  }

  const handleImportBackup = () => startImportBackupFlow()

  const handleExportCSV = () => {
    const rows = txnStore.transactions
    const header = 'Date,Type,Amount,Fee,Merchant,Bucket,Source'
    const csvRows = rows.map(t => {
      const bucket = getBucketName(t.bucketId)
      const merchant = (t.merchant ?? '').replace(/,/g, ' ')
      return `${t.date},${t.type},${t.amount},${t.feeAmount},${merchant},${bucket},${t.source}`
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
              await hydrateStoresAfterDbChange()
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
            Current balance: {formatMoney(bs.getBucketBalance(b.id))}
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
        <SectionHeader title="Playbook" description="Name, currency, income, and the month" />
        <Card>
          <EditableStringRow
            label="Display name"
            value={pb.userName || ''}
            onSave={v => pb.updatePlaybook({ userName: v })}
            onSaved={saved.show}
            placeholder="Your name"
          />
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.editableRow}
            onPress={() => router.push('/currency')}
          >
            <Text style={styles.editableLabel}>Currency</Text>
            <Text style={styles.editableValue}>{pb.currency}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <EditableRow
            label="Monthly income"
            value={pb.monthlyIncome}
            prefix={`${pb.currency} `}
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
            prefix={`${pb.currency} `}
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
        
        <SubGroupHeader title="Living (Spending)" total={livingTotal} first />
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
                        ? `Fund: ${formatMoney(bs.getBucketBalance(b.id))} · +${formatMoney(b.monthlyAmount)}/mo`
                        : `${formatMoney(b.monthlyAmount)}/mo`}
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

        <SubGroupHeader title="Future (Savings & Investments)" total={futureTotal} />
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
                        ? `Fund: ${formatMoney(bs.getBucketBalance(b.id))} · +${formatMoney(b.monthlyAmount)}/mo`
                        : `${formatMoney(b.monthlyAmount)}/mo`}
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

        <MoneyLocationsCard />

        <SectionHeader
          title="Notifications"
          description="Manage notifications and select apps."
        />
        <Card>
          <TouchableOpacity
            style={styles.mappingRow}
            onPress={() => router.push('/notification-settings')}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.editableLabel}>Nudges and payment helper</Text>
              <Text style={styles.mappingBucket}>
                Plan alerts, log prompts, timing, and watched apps
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Section 5: Data */}
        <SectionHeader
          title="Data"
          description="Full backup for another phone, UnSpoil reinstall, or your own analysis."
        />
        <Card>
          <TouchableOpacity onPress={handleExportBackup} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Export backup</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={handleImportBackup} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Import backup</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={handleShareForClaude} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Share for Claude</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={handleExportCSV} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Export CSV (transactions)</Text>
          </TouchableOpacity>
        </Card>

        <SectionHeader
          title="Danger zone"
          description={
            (pb.personalRecoveryDebt ?? 0) > 0
              ? `Personal top-up is ${formatMoney(1000)}/mo until ${formatMoney(pb.personalRecoveryDebt)} is recovered.`
              : 'These cannot be undone.'
          }
        />
        <Card>
          {(pb.personalRecoveryDebt ?? 0) > 0 && (
            <>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => {
                  Alert.alert(
                    'Reset Personal recovery?',
                    'Restores full Personal top-up starting next month rollover (debt cleared now).',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: () => pb.resetPersonalRecovery(),
                      },
                    ],
                  )
                }}
              >
                <Text style={styles.dangerButtonText}>Reset Personal recovery</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}
          <TouchableOpacity onPress={handleClearAllData} style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>Clear all data</Text>
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
  subGroupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 4,
    marginTop: 20,
  },
  subGroupTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    marginRight: 12,
  },
  subGroupTotal: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
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
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.red,
  },
})
