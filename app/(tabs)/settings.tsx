import { useState, useCallback, useRef } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { db } from '@/db/client'
import {
  transactions,
  netWorthSnapshots,
  buckets as bucketsTable,
  keywordMappings as keywordMappingsTable,
  sureShotMerchants as sureShotMerchantsTable,
  playbook,
} from '@/db/schema'
import { seedDefaults } from '@/db/seed'

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

  const startEdit = () => {
    if (editing) return
    setDraft(String(value))
    setEditing(true)
  }

  const save = () => {
    const num = parseInt(draft, 10)
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num)
      setJustSaved(true)
      onSaved?.()
      setTimeout(() => setJustSaved(false), 2000)
    }
    setEditing(false)
  }

  return (
    <TouchableOpacity onPress={startEdit} style={styles.editableRow} activeOpacity={0.6}>
      <Text style={styles.editableLabel}>{label}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={save} hitSlop={12}>
            <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Save</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.editableInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType={keyboardType}
            onSubmitEditing={save}
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

  const startEdit = () => {
    if (editing) return
    setDraft(value)
    setEditing(true)
  }

  const save = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
      setJustSaved(true)
      onSaved?.()
      setTimeout(() => setJustSaved(false), 2000)
    }
    setEditing(false)
  }

  return (
    <TouchableOpacity onPress={startEdit} style={styles.editableRow} activeOpacity={0.6}>
      <Text style={styles.editableLabel}>{label}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={save} hitSlop={12}>
            <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Save</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.editableInput, { textAlign: 'right' }]}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={save}
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

export default function SettingsScreen() {
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
  const [bucketDraft, setBucketDraft] = useState({ name: '', monthlyAmount: '', type: 'spending' as Bucket['type'], showOnHome: true })

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

  // Notification toggle state (local only for V1)
  const [nudges, setNudges] = useState({
    budgetBreach: true,
    savingsReminder: true,
    efFloorWarning: true,
    recurringDraft: true,
  })

  const expandBucket = (b: Bucket) => {
    if (expandedBucketId === b.id) {
      setExpandedBucketId(null)
      return
    }
    setExpandedBucketId(b.id)
    setBucketDraft({ name: b.name, monthlyAmount: String(b.monthlyAmount), type: b.type, showOnHome: b.showOnHome })
  }

  const saveBucketEdit = async (id: string) => {
    const amt = parseInt(bucketDraft.monthlyAmount, 10)
    if (!bucketDraft.name.trim() || isNaN(amt) || amt < 0) return
    await bs.updateBucket(id, { 
      name: bucketDraft.name.trim(), 
      monthlyAmount: amt, 
      type: bucketDraft.type,
      showOnHome: bucketDraft.showOnHome 
    })
    setExpandedBucketId(null)
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
            await db.delete(transactions)
            await db.delete(netWorthSnapshots)
            await db.delete(keywordMappingsTable)
            await db.delete(sureShotMerchantsTable)
            await db.delete(bucketsTable)
            await db.delete(playbook)
            await seedDefaults()
            await pb.loadPlaybook()
            await bs.loadBuckets()
            const { start, end } = getMonthRange(pb.monthStartDay)
            await txnStore.loadTransactions(start, end)
            await goalsStore.loadGoals()
            Alert.alert('Done', 'All data cleared and defaults restored.')
          },
        },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
                    <Text style={styles.bucketAmount}>NPR {formatNPR(b.monthlyAmount)}/mo</Text>
                  </View>
                  <TypeBadge type={b.type} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeactivate(b)} hitSlop={8} style={{ marginLeft: 12 }}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {expandedBucketId === b.id && (
                <View style={styles.bucketEditor}>
                  <TextInput
                    style={styles.input}
                    value={bucketDraft.name}
                    onChangeText={v => setBucketDraft(d => ({ ...d, name: v }))}
                    placeholder="Name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={bucketDraft.monthlyAmount}
                    onChangeText={v => setBucketDraft(d => ({ ...d, monthlyAmount: v }))}
                    keyboardType="numeric"
                    placeholder="Monthly amount"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.typeRow}>
                    {BUCKET_TYPES.map(t => (
                      <Pressable
                        key={t}
                        onPress={() => setBucketDraft(d => ({ ...d, type: t }))}
                        style={[
                          styles.typeChip,
                          bucketDraft.type === t && { backgroundColor: colors.green },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            bucketDraft.type === t && { color: '#fff' },
                          ]}
                        >
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={[styles.toggleRow, { marginTop: 12 }]}>
                    <Text style={styles.editableLabel}>Show on Home Screen</Text>
                    <Switch
                      value={bucketDraft.showOnHome}
                      onValueChange={v => setBucketDraft(d => ({ ...d, showOnHome: v }))}
                      trackColor={{ false: colors.border, true: colors.greenFill }}
                      thumbColor={bucketDraft.showOnHome ? colors.green : '#f4f3f4'}
                    />
                  </View>
                  <View style={styles.editorActions}>
                    <TouchableOpacity onPress={() => setExpandedBucketId(null)}>
                      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => saveBucketEdit(b.id)}>
                      <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
                    <Text style={styles.bucketAmount}>NPR {formatNPR(b.monthlyAmount)}/mo</Text>
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

              {expandedBucketId === b.id && (
                <View style={styles.bucketEditor}>
                  <TextInput
                    style={styles.input}
                    value={bucketDraft.name}
                    onChangeText={v => setBucketDraft(d => ({ ...d, name: v }))}
                    placeholder="Name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={bucketDraft.monthlyAmount}
                    onChangeText={v => setBucketDraft(d => ({ ...d, monthlyAmount: v }))}
                    keyboardType="numeric"
                    placeholder="Monthly amount"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.typeRow}>
                    {BUCKET_TYPES.map(t => (
                      <Pressable
                        key={t}
                        onPress={() => setBucketDraft(d => ({ ...d, type: t }))}
                        style={[
                          styles.typeChip,
                          bucketDraft.type === t && { backgroundColor: colors.green },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            bucketDraft.type === t && { color: '#fff' },
                          ]}
                        >
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={[styles.toggleRow, { marginTop: 12 }]}>
                    <Text style={styles.editableLabel}>Show on Home Screen</Text>
                    <Switch
                      value={bucketDraft.showOnHome}
                      onValueChange={v => setBucketDraft(d => ({ ...d, showOnHome: v }))}
                      trackColor={{ false: colors.border, true: colors.greenFill }}
                      thumbColor={bucketDraft.showOnHome ? colors.green : '#f4f3f4'}
                    />
                  </View>
                  <View style={styles.editorActions}>
                    <TouchableOpacity onPress={() => setExpandedBucketId(null)}>
                      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => saveBucketEdit(b.id)}>
                      <Text style={{ color: colors.green, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
                  onValueChange={v => setNudges(n => ({ ...n, [item.key]: v }))}
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

        {/* Section 7: Developer */}
        <SectionHeader title="Developer" description="Danger zone" />
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
