import { Alert } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { readAsStringAsync } from 'expo-file-system/legacy'
import { backupSummary, importBackup } from '@/lib/backup'

export type ImportBackupResult = {
  txnCount: number
  exportedAt: string
  userName: string | null
  isOnboarded: boolean
}

type ImportBackupFlowOptions = {
  introTitle?: string
  introMessage?: string
  onSuccess?: (result: ImportBackupResult) => void
}

async function pickAndConfirmImport(raw: string, onSuccess?: ImportBackupFlowOptions['onSuccess']) {
  const summary = backupSummary(raw)
  Alert.alert(
    'Restore this backup?',
    [
      summary.userName ? `${summary.userName}'s backup` : 'Backup',
      `from ${summary.exportedAt.slice(0, 10)}`,
      `${summary.txnCount} transactions · ${summary.bucketCount} buckets`,
      summary.isOnboarded ? 'Onboarding complete' : 'Onboarding not finished',
      'Your current data will be replaced.',
    ].join('\n'),
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await importBackup(raw)
            const payload: ImportBackupResult = {
              ...result,
              isOnboarded: summary.isOnboarded,
            }
            if (onSuccess) {
              onSuccess(payload)
              return
            }
            Alert.alert(
              'Import complete',
              result.userName
                ? `Welcome back, ${result.userName}. ${result.txnCount} transactions restored.`
                : `Restored ${result.txnCount} transactions from ${result.exportedAt.slice(0, 10)}.`,
            )
          } catch (e) {
            Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not import backup.')
          }
        },
      },
    ],
  )
}

async function chooseBackupFile(onSuccess?: ImportBackupFlowOptions['onSuccess']) {
  try {
    const pick = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    })
    if (pick.canceled || !pick.assets?.[0]?.uri) return
    const raw = await readAsStringAsync(pick.assets[0].uri)
    await pickAndConfirmImport(raw, onSuccess)
  } catch (e) {
    Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not read backup.')
  }
}

export function confirmImportBackupRaw(raw: string, options: Pick<ImportBackupFlowOptions, 'onSuccess'> = {}) {
  void pickAndConfirmImport(raw, options.onSuccess)
}

export function startImportBackupFlow(options: ImportBackupFlowOptions = {}) {
  const {
    introTitle = 'Import backup?',
    introMessage = 'This replaces all data on this phone with the backup file. Export first if you need a copy of what you have now.',
    onSuccess,
  } = options

  Alert.alert(introTitle, introMessage, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Choose file', onPress: () => void chooseBackupFile(onSuccess) },
  ])
}
