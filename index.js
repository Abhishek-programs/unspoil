import { AppRegistry } from 'react-native'
import { AUTO_BACKUP_HEADLESS_TASK, runHeadlessAutoBackup } from './lib/auto-backup-task'
import 'expo-router/entry'

// Registered at bundle load so the nightly alarm can run it with no screen open.
AppRegistry.registerHeadlessTask(AUTO_BACKUP_HEADLESS_TASK, () => runHeadlessAutoBackup)
