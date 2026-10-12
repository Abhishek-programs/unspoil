import { useState } from 'react'
import { Tabs } from 'expo-router'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { ManualEntrySheet } from '@/components/manual-entry/ManualEntrySheet'

function TabBarIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? colors.green : colors.textMuted}
    />
  )
}

function FabIcon() {
  return (
    <View style={styles.fabContainer}>
      <View style={styles.fab}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </View>
    </View>
  )
}

export default function TabsLayout() {
  const [showEntry, setShowEntry] = useState(false)

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
          }}
        />

        <Tabs.Screen
          name="transactions"
          options={{
            tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'list' : 'list-outline'} focused={focused} />,
          }}
        />

        {/* Center FAB — custom button opens ManualEntrySheet, no navigation */}
        <Tabs.Screen
          name="add"
          options={{
            tabBarIcon: () => <FabIcon />,
            tabBarLabel: () => null,
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.fabTouchable}
                activeOpacity={0.8}
                onPress={() => setShowEntry(true)}
              >
                <FabIcon />
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'flag' : 'flag-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} />,
          }}
        />
      </Tabs>
      <ManualEntrySheet visible={showEntry} onClose={() => setShowEntry(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 0,
    elevation: 0,
    height: 64,
    paddingBottom: 8,
  },
  fabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
})
