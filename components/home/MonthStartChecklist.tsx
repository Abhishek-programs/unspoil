import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated'

export interface ChecklistItem {
  id: string
  label: string
  amount: number
  bucketId: string
  completed: boolean
}

interface MonthStartChecklistProps {
  visible: boolean
  items: ChecklistItem[]
  onToggleItem: (id: string) => void
  onDismiss: () => void
}

export function MonthStartChecklist({
  visible,
  items,
  onToggleItem,
  onDismiss,
}: MonthStartChecklistProps) {
  const allDone = items.every(i => i.completed)
  const doneCount = items.filter(i => i.completed).length

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="calendar" size={20} color={colors.green} />
              <Text style={styles.title}>Month Start Ritual</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.intro}>
            <Text style={styles.introText}>
              {allDone
                ? 'All done! Your playbook is set for this month.'
                : 'Confirm your monthly transfers. Each tap logs the transaction immediately.'}
            </Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{doneCount} of {items.length} confirmed</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(doneCount / items.length) * 100}%` }]} />
              </View>
            </View>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <Animated.View key={item.id} layout={Layout.springify()}>
                <TouchableOpacity
                  style={[styles.item, item.completed && styles.itemCompleted]}
                  onPress={() => !item.completed && onToggleItem(item.id)}
                  activeOpacity={item.completed ? 1 : 0.7}
                  disabled={item.completed}
                >
                  <View style={[styles.checkbox, item.completed && styles.checkboxActive]}>
                    {item.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, item.completed && styles.itemLabelCompleted]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.itemAmount, item.completed && styles.itemAmountCompleted]}>
                      NPR {formatNPRShort(item.amount)}
                    </Text>
                  </View>
                  {item.completed && (
                    <Animated.View entering={FadeIn.duration(300)}>
                      <Ionicons name="checkmark-done" size={18} color={colors.green} />
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            {allDone ? (
              <TouchableOpacity style={styles.doneButton} onPress={onDismiss} activeOpacity={0.8}>
                <Text style={styles.doneButtonText}>Done — let's crush this month!</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.laterButton} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={styles.laterButtonText}>I'll finish this later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.pageBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    maxHeight: '85%',
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  intro: {
    padding: 24,
    paddingBottom: 12,
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    minWidth: 90,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  list: {
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  itemCompleted: {
    borderColor: colors.green,
    backgroundColor: colors.greenFill,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  itemLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  itemLabelCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecond,
  },
  itemAmount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  itemAmountCompleted: {
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  doneButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  laterButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
})
