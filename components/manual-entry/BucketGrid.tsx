import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

export interface BucketTile {
  id: string
  name: string
  icon: string
  color: string
  /** Money still available in the bucket (may be negative when over). */
  left: number
  /** 0–1 share of the bucket that is still available. */
  fraction: number
  /** Hides the fill — used for the catch-all My money tile. */
  plain?: boolean
  /** Replaces the "X left" line (savings tiles say what is saved or still to save). */
  caption?: string
  /** Savings tiles are never "empty" in the red sense. */
  neverEmpty?: boolean
}

interface BucketGridProps {
  tiles: BucketTile[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

// Same thresholds as the Living bars: amber once 80% is used, red when it is gone.
function fillColor(tile: BucketTile): string {
  if (tile.fraction <= 0) return colors.red
  if (tile.fraction <= 0.2) return colors.amber
  return tile.color
}

function Tile({
  tile,
  index,
  selected,
  onPress,
}: {
  tile: BucketTile
  index: number
  selected: boolean
  onPress: () => void
}) {
  const level = useSharedValue(0)
  const target = Math.max(0, Math.min(1, tile.fraction))

  useEffect(() => {
    // Low damping lets the level overshoot and settle, like liquid sloshing in.
    level.value = withDelay(
      index * 35,
      withSpring(target, { damping: 9, stiffness: 70, mass: 0.8 }),
    )
  }, [target])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1.04, level.value)) * 100}%`,
  }))

  const tint = fillColor(tile)
  const over = !tile.neverEmpty && tile.left <= 0

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        over && { backgroundColor: colors.red + '14', borderColor: colors.red + '55' },
        selected && { borderColor: over ? colors.red : tile.plain ? colors.amber : tint },
        selected && tile.plain && !over && { backgroundColor: colors.amberFill },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {!tile.plain && !over && (
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: tint + (selected ? '40' : '26') },
            fillStyle,
          ]}
        />
      )}
      <Text style={styles.name} numberOfLines={1}>
        {tile.icon} {tile.name}
      </Text>
      <Text style={[styles.left, over && { color: colors.red }]} numberOfLines={1}>
        {tile.caption ??
          (over
            ? tile.left < 0
              ? `${formatNPRShort(-tile.left)} over`
              : 'Nothing left'
            : `${formatNPRShort(tile.left)} left`)}
      </Text>
    </TouchableOpacity>
  )
}

export function BucketGrid({ tiles, selectedId, onSelect }: BucketGridProps) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile, i) => {
        const selected = selectedId === tile.id
        return (
          <Tile
            key={tile.id}
            tile={tile}
            index={i}
            selected={selected}
            onPress={() => onSelect(selected ? null : tile.id)}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tile: {
    width: '31.5%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  left: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
})
