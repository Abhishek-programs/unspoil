import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { colors } from '@/constants/colors'
import { useLendingStore } from '@/store/lending'

interface PersonPickerProps {
  selectedContactId: string | null
  onSelect: (contactId: string) => void
}

export function PersonPicker({ selectedContactId, onSelect }: PersonPickerProps) {
  const { contacts, addContact } = useLendingStore()
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed || adding) return
    setAdding(true)
    try {
      const contact = await addContact(trimmed)
      onSelect(contact.id)
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {contacts.map(c => {
          const selected = selectedContactId === c.id
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(c.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.name}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={styles.newRow}>
        <TextInput
          style={styles.newInput}
          value={newName}
          onChangeText={setNewName}
          placeholder="New person name"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!newName.trim() || adding}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.purple + '18',
    borderColor: colors.purple,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.purple,
  },
  newRow: {
    flexDirection: 'row',
    gap: 8,
  },
  newInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
