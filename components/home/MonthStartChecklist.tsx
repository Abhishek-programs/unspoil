import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

interface ChecklistItem {
  id: string
  label: string
  amount?: number
  completed: boolean
}

interface MonthStartChecklistProps {
  visible: boolean
  items: ChecklistItem[]
  onCompleteItem: (id: string) => void
  onConfirm: (items: ChecklistItem[]) => void
  onDismiss: () => void
}

export function MonthStartChecklist({ 
  visible, 
  items, 
  onCompleteItem, 
  onConfirm,
  onDismiss 
}: MonthStartChecklistProps) {
  const allDone = items.every(i => i.completed)
  const anyDone = items.some(i => i.completed)

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
              A new month has begun! Complete these rituals to stay on top of your playbook.
            </Text>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.item, item.completed && styles.itemCompleted]}
                onPress={() => onCompleteItem(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.completed && styles.checkboxActive]}>
                  {item.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, item.completed && styles.itemLabelCompleted]}>
                    {item.label}
                  </Text>
                  {item.amount && (
                    <Text style={[styles.itemAmount, item.completed && styles.itemAmountCompleted]}>
                      Target: {formatNPRShort(item.amount)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.doneButton, !anyDone && styles.doneButtonDisabled]}
              onPress={() => {
                if (anyDone) {
                  onConfirm(items.filter(i => i.completed))
                }
              }}
              disabled={!anyDone}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>
                {allDone ? "Let's crush this month!" : anyDone ? "Confirm Selected" : "Select items to confirm"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.laterButtonText}>I'll fill this later</Text>
            </TouchableOpacity>
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
    maxHeight: '80%',
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
    marginBottom: 12,
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
    color: colors.textPrimary,
  },
  itemAmount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  itemAmountCompleted: {
    color: colors.textSecond,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  doneButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    backgroundColor: colors.border,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
})
