import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { formatNPR, formatNPRShort } from "@/lib/format";

interface HeroRingProps {
  effectiveIncome: number;
  safeToSpend: number;
  lifestyleSpent: number;
  personalDraws: number;
  confirmedSavedInvested: number;
  unconfirmedSavingsThisMonth: number;
  lentOutstandingThisMonth: number;
  daysRemaining: number;
  weeklyRate: number;
  flaggedAmount: number;
}

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;
const PILL_ORBIT = RADIUS + STROKE / 2 + 2;

type SegmentKind = "available" | "spent" | "unconfirmed" | "confirmed" | "lent";

interface RingSegment {
  kind: SegmentKind;
  ratio: number;
  startRatio: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

function clampRatio(value: number, denom: number) {
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(value / denom, 1));
}

function buildSegments(
  income: number,
  confirmed: number,
  unconfirmed: number,
  spent: number,
  available: number,
  lentOutstanding: number,
): RingSegment[] {
  if (income <= 0) return [];

  const raw = [
    {
      kind: "available" as const,
      value: available,
      stroke: colors.green,
      strokeWidth: STROKE,
      opacity: 1,
    },
    {
      kind: "spent" as const,
      value: spent,
      stroke: colors.red,
      strokeWidth: STROKE,
      opacity: 1,
    },
    {
      kind: "lent" as const,
      value: lentOutstanding,
      stroke: colors.purple,
      strokeWidth: STROKE,
      opacity: 1,
    },
    {
      kind: "unconfirmed" as const,
      value: unconfirmed,
      stroke: colors.savingsSetAside,
      strokeWidth: STROKE,
      opacity: 0.4,
    },
    {
      kind: "confirmed" as const,
      value: confirmed,
      stroke: colors.savingsSetAside,
      strokeWidth: STROKE,
      opacity: 1,
    },
  ];

  let start = 0;
  const segments: RingSegment[] = [];
  for (const item of raw) {
    const ratio = clampRatio(item.value, income);
    if (ratio <= 0.001) continue;
    segments.push({
      kind: item.kind,
      ratio,
      startRatio: start,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      opacity: item.opacity,
    });
    start += ratio;
  }
  return segments;
}

function RingArc({
  ratio,
  startRatio,
  stroke,
  strokeWidth,
  opacity,
}: {
  ratio: number;
  startRatio: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}) {
  const cx = CENTER;
  const cy = CENTER;
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={RADIUS}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
      strokeOpacity={opacity}
      strokeDasharray={`${CIRC * ratio} ${CIRC * (1 - ratio)}`}
      rotation={-90 + startRatio * 360}
      origin={`${cx}, ${cy}`}
    />
  );
}

function MetricChip({
  value,
  accent,
  angleDeg,
  phase,
}: {
  value: string;
  accent: string;
  angleDeg: number;
  phase: number;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, {
        duration: 2800 + phase * 400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [phase]);

  const animStyle = useAnimatedStyle(() => {
    "worklet";
    const wobble = interpolate(drift.value, [0, 1], [-2.5, 2.5]);
    const angleWobble = interpolate(drift.value, [0, 1], [-1.2, 1.2]);
    const rad = ((angleDeg + angleWobble - 90) * Math.PI) / 180;
    const r = PILL_ORBIT + wobble * 0.3;
    return {
      left: CENTER + r * Math.cos(rad) - 22,
      top: CENTER + r * Math.sin(rad) - 10,
    };
  });

  return (
    <Animated.View style={[styles.chip, animStyle]}>
      <Text style={[styles.chipValue, { color: accent }]}>{value}</Text>
    </Animated.View>
  );
}

export function HeroRing({
  effectiveIncome,
  safeToSpend,
  lifestyleSpent,
  personalDraws,
  confirmedSavedInvested,
  unconfirmedSavingsThisMonth,
  lentOutstandingThisMonth,
  daysRemaining,
  weeklyRate,
  flaggedAmount,
}: HeroRingProps) {
  const hasSalary = effectiveIncome > 0;
  const spentTotal = lifestyleSpent + personalDraws;
  const available = Math.max(0, safeToSpend);
  const pulse = useSharedValue(0);

  const segments = useMemo(
    () =>
      hasSalary
        ? buildSegments(
            effectiveIncome,
            confirmedSavedInvested,
            unconfirmedSavingsThisMonth,
            spentTotal,
            available,
            lentOutstandingThisMonth,
          )
        : [],
    [
      hasSalary,
      effectiveIncome,
      confirmedSavedInvested,
      unconfirmedSavingsThisMonth,
      spentTotal,
      available,
      lentOutstandingThisMonth,
    ],
  );

  useEffect(() => {
    pulse.value = withTiming(1, {
      duration: 2400,
      easing: Easing.inOut(Easing.ease),
    });
  }, []);

  const centerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.92, 1]),
  }));

  const isOverspent = hasSalary && safeToSpend < 0;

  const statusColor = !hasSalary
    ? colors.textMuted
    : isOverspent
      ? colors.red
      : flaggedAmount > 0
        ? colors.amber
        : colors.green;

  const statusLabel = !hasSalary
    ? "Awaiting salary"
    : isOverspent
      ? "Overspending"
      : flaggedAmount > 0
        ? "Needs review"
        : "On track";

  const cx = CENTER;
  const cy = CENTER;

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.wrap}>
      <View style={styles.ringArea}>
        <View style={styles.pillLayer} pointerEvents="none">
          <MetricChip
            value={`${daysRemaining}d`}
            accent={colors.textSecond}
            angleDeg={40}
            phase={0}
          />
          <MetricChip
            value={formatNPRShort(spentTotal)}
            accent={hasSalary ? colors.red : colors.textMuted}
            angleDeg={220}
            phase={1}
          />
          {hasSalary && confirmedSavedInvested > 0 && (
            <MetricChip
              value={formatNPRShort(confirmedSavedInvested)}
              accent={colors.savingsSetAside}
              angleDeg={320}
              phase={2}
            />
          )}
        </View>

        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={cx}
            cy={cy}
            r={RADIUS}
            stroke={hasSalary ? colors.green + "20" : "#E5E7EB"}
            strokeWidth={STROKE}
            fill="none"
          />

          {hasSalary &&
            segments.map((seg, i) => (
              <RingArc
                key={`${seg.kind}-${i}`}
                ratio={seg.ratio}
                startRatio={seg.startRatio}
                stroke={seg.stroke}
                strokeWidth={seg.strokeWidth}
                opacity={seg.opacity}
              />
            ))}
        </Svg>

        <Animated.View style={[styles.center, centerStyle]}>
          <Text style={styles.centerLabel}>Safe to spend</Text>
          <Text
            style={[styles.centerAmount, isOverspent && { color: colors.red }]}
          >
            {!hasSalary
              ? "—"
              : isOverspent
                ? `-NPR ${formatNPR(Math.abs(safeToSpend))}`
                : `NPR ${formatNPR(available)}`}
          </Text>
          <Text style={styles.centerHint}>
            {!hasSalary
              ? "Confirm salary in checklist"
              : `${daysRemaining} days left this month`}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor + "18" }]}>
            <Ionicons
              name={
                !hasSalary
                  ? "hourglass-outline"
                  : isOverspent
                    ? "trending-down"
                    : "checkmark-circle"
              }
              size={12}
              color={statusColor}
            />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </Animated.View>
      </View>

      {hasSalary && (
        <Text style={styles.weekly}>
          ≈ NPR {formatNPR(Math.round(Math.max(0, weeklyRate)))}/week
        </Text>
      )}

      <View style={styles.legend}>
        <LegendDot
          color={hasSalary ? colors.green : "#E5E7EB"}
          label={hasSalary ? "Available" : "Locked"}
        />
        <LegendDot color={colors.red} label="Spent" />
        {hasSalary && lentOutstandingThisMonth > 0 && (
          <LegendDot color={colors.purple} label="Lent out" />
        )}
        <LegendDot
          color={colors.savingsSetAside}
          label="To save"
          opacity={0.45}
        />
        <LegendDot color={colors.savingsSetAside} label="Confirmed" />
      </View>
    </Animated.View>
  );
}

function LegendDot({
  color,
  label,
  opacity = 1,
}: {
  color: string;
  label: string;
  opacity?: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, opacity }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  ringArea: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pillLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  center: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  chip: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  chipValue: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  centerLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  centerAmount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  centerHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  weekly: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
    marginTop: 6,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
  },
});
