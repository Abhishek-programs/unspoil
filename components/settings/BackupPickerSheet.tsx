import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { readAsStringAsync } from 'expo-file-system/legacy'
import { colors } from '@/constants/colors'
import { formatDate } from '@/lib/format'
import { listAllBackups, type BackupEntry, type BackupSource } from '@/lib/backup-list'
import { chooseBackupFile, confirmImportBackupRaw } from '@/lib/import-backup-flow'

const SOURCE_LABEL: Record<BackupSource, string> = {
  auto: 'Nightly · UnSpoil/Auto',
  export: 'Export · UnSpoil/Exports',
  phone: 'App storage',
}

const SOURCE_ICON: Record<BackupSource, keyof typeof Ionicons.glyphMap> = {
  auto: 'moon-outline',
  export: 'download-outline',
  phone: 'phone-portrait-outline',
}

function whenLabel(entry: BackupEntry): string {
  if (!entry.date) return entry.name
  const d = entry.date
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${formatDate(d)} ${d.getFullYear()} · ${time}`
}

interface BackupPickerSheetProps {
  visible: boolean
  onClose: () => void
}

export function BackupPickerSheet({ visible, onClose }: BackupPickerSheetProps) {
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState<BackupEntry[] | null>(null)

  useEffect(() => {
    if (!visible) return
    setEntries(null)
    void listAllBackups().then(setEntries)
  }, [visible])

  const restore = async (entry: BackupEntry) => {
    try {
      const raw = await readAsStringAsync(entry.uri)
      onClose()
      confirmImportBackupRaw(raw)
    } catch (e) {
      Alert.alert('Could not read backup', e instanceof Error ? e.message : 'Try again.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.title}>Import backup</Text>
          <Text style={styles.subtitle}>
            Replaces all data on this phone. Back up now first if you need what you have.
          </Text>

          {entries === null ? (
            <ActivityIndicator color={colors.green} style={{ marginVertical: 24 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.empty}>No backups found yet.</Text>
          ) : (
            <ScrollView style={styles.list}>
              {entries.map(entry => (
                <TouchableOpacity
                  key={entry.uri}
                  style={styles.row}
                  onPress={() => void restore(entry)}
                >
                  <Ionicons name={SOURCE_ICON[entry.source]} size={18} color={colors.textSecond} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{whenLabel(entry)}</Text>
                    <Text style={styles.rowSub}>{SOURCE_LABEL[entry.source]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.otherButton}
            onPress={() => {
              onClose()
              void chooseBackupFile()
            }}
          >
            <Text style={styles.otherText}>Choose another file</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '75%',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 4,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 24,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  otherButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  otherText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
})
