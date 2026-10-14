import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
import { formatMoney, formatNPRShort } from "@/lib/format";

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
  onStartMonthEarly?: () => void;
  startingMonthEarly?: boolean;
}

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
/** Slight overlap so SVG butt caps do not leave hairline gaps. */
const JOINT_TURN = 0.003;
const CENTER = SIZE / 2;
const PILL_ORBIT = RADIUS + STROKE / 2 + 2;

type SegmentKind = "available" | "spent" | "unconfirmed" | "confirmed" | "lent";

interface RingSlice {
  kind: SegmentKind;
  ratio: number;
  startRatio: number;
  dashLength: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

interface RingModel {
  slices: RingSlice[];
  spentOverlay: RingSlice | null;
}

function buildRing(
  income: number,
  confirmed: number,
  unconfirmed: number,
  spent: number,
  available: number,
  lentOutstanding: number,
): RingModel {
  if (income <= 0) return { slices: [], spentOverlay: null };

  const conf = Math.max(0, confirmed);
  const unconf = Math.max(0, unconfirmed);
  const lent = Math.max(0, lentOutstanding);
  const spentAmt = Math.max(0, spent);
  const avail = Math.max(0, available);

  let pool = avail + spentAmt;
  let confV = conf;
  let unconfV = unconf;
  let lentV = lent;
  let total = pool + confV + unconfV + lentV;
  if (total > income) {
    const scale = income / total;
    pool *= scale;
    confV *= scale;
    unconfV *= scale;
    lentV *= scale;
  } else if (total < income) {
    pool += income - total;
  }

  const parts = [
    {
      kind: "available" as const,
      value: pool,
      stroke: colors.green,
      strokeWidth: STROKE,
      opacity: 1,
    },
    {
      kind: "lent" as const,
      value: lentV,
      stroke: colors.purple,
      strokeWidth: STROKE,
      opacity: 1,
    },
    {
      kind: "unconfirmed" as const,
      value: unconfV,
      stroke: colors.savingsSetAside,
      strokeWidth: STROKE,
      opacity: 0.4,
    },
    {
      kind: "confirmed" as const,
      value: confV,
      stroke: colors.savingsSetAside,
      strokeWidth: STROKE,
      opacity: 1,
    },
  ].filter((p) => p.value > 0);

  if (parts.length === 0) return { slices: [], spentOverlay: null };

  const totalVal = parts.reduce((s, p) => s + p.value, 0);
  if (totalVal <= 0) return { slices: [], spentOverlay: null };

  const slices: RingSlice[] = [];
  let ratioCursor = 0;
  for (let i = 0; i < parts.length; i++) {
    let ratio =
      i === parts.length - 1 ? 1 - ratioCursor : parts[i].value / totalVal;
    if (ratio <= 0) continue;
    const lead = i === 0 ? 0 : JOINT_TURN;
    const tail = JOINT_TURN;
    slices.push({
      kind: parts[i].kind,
      ratio,
      startRatio: Math.max(0, ratioCursor - lead),
      dashLength: CIRC * (ratio + lead + tail),
      stroke: parts[i].stroke,
      strokeWidth: parts[i].strokeWidth,
      opacity: parts[i].opacity,
    });
    ratioCursor += ratio;
  }

  const poolSlice = slices.find((s) => s.kind === "available");
  const poolStart = poolSlice?.startRatio ?? 0;
  const poolRatio = poolSlice ? poolSlice.dashLength / CIRC : 0;
  const spentRatio = Math.min(spentAmt / income, poolRatio);
  const spentOverlay: RingSlice | null =
    spentRatio > 0.001
      ? {
          kind: "spent",
          ratio: spentRatio,
          startRatio: poolStart,
          dashLength: 0,
          stroke: colors.red,
          strokeWidth: STROKE,
          opacity: 1,
        }
      : null;

  return { slices, spentOverlay };
}

function RingDashArc({
  dashLength,
  startRatio,
  stroke,
  strokeWidth,
  opacity,
}: {
  dashLength: number;
  startRatio: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}) {
  if (dashLength <= 0) return null;
  const gap = Math.max(0, CIRC - dashLength);
  return (
    <Circle
      cx={CENTER}
      cy={CENTER}
      r={RADIUS}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
      strokeOpacity={opacity}
      strokeDasharray={`${dashLength} ${gap}`}
      rotation={-90 + startRatio * 360}
      origin={`${CENTER}, ${CENTER}`}
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
  onStartMonthEarly,
  startingMonthEarly = false,
}: HeroRingProps) {
  const hasSalary = effectiveIncome > 0;
  const spentTotal = lifestyleSpent + personalDraws;
  const available = Math.max(0, safeToSpend);
  const pulse = useSharedValue(0);

  const ring = useMemo(() => {
    if (!hasSalary) return { slices: [], spentOverlay: null };
    const model = buildRing(
      effectiveIncome,
      confirmedSavedInvested,
      unconfirmedSavingsThisMonth,
      spentTotal,
      available,
      lentOutstandingThisMonth,
    );
    const paintOrder: SegmentKind[] = [
      "lent",
      "unconfirmed",
      "confirmed",
      "available",
    ];
    model.slices.sort(
      (a, b) => paintOrder.indexOf(a.kind) - paintOrder.indexOf(b.kind),
    );
    return model;
  }, [
    hasSalary,
    effectiveIncome,
    confirmedSavedInvested,
    unconfirmedSavingsThisMonth,
    spentTotal,
    available,
    lentOutstandingThisMonth,
  ]);

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
        {onStartMonthEarly && (
          <TouchableOpacity
            style={styles.earlyPill}
            onPress={onStartMonthEarly}
            disabled={startingMonthEarly}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Start new month with early salary"
          >
            <Ionicons name="calendar-outline" size={12} color={colors.green} />
            <Text style={styles.earlyPillText}>
              {startingMonthEarly ? "Starting…" : "Paid early?"}
            </Text>
          </TouchableOpacity>
        )}

        <Svg width={SIZE} height={SIZE}>
          {!hasSalary && (
            <Circle
              cx={cx}
              cy={cy}
              r={RADIUS}
              stroke="#E5E7EB"
              strokeWidth={STROKE}
              fill="none"
            />
          )}

          {hasSalary &&
            ring.slices.map((seg, i) => (
              <RingDashArc
                key={`${seg.kind}-${i}`}
                dashLength={seg.dashLength}
                startRatio={seg.startRatio}
                stroke={seg.stroke}
                strokeWidth={seg.strokeWidth}
                opacity={seg.opacity}
              />
            ))}
          {hasSalary && ring.spentOverlay && (
            <RingDashArc
              key="spent-overlay"
              dashLength={CIRC * ring.spentOverlay.ratio}
              startRatio={ring.spentOverlay.startRatio}
              stroke={ring.spentOverlay.stroke}
              strokeWidth={ring.spentOverlay.strokeWidth}
              opacity={ring.spentOverlay.opacity}
            />
          )}
        </Svg>

        <Animated.View style={[styles.center, centerStyle]}>
          <Text style={styles.centerLabel}>Safe to spend</Text>
          <Text
            style={[styles.centerAmount, isOverspent && { color: colors.red }]}
          >
            {!hasSalary
              ? "—"
              : isOverspent
                ? `-${formatMoney(Math.abs(safeToSpend))}`
                : `${formatMoney(available)}`}
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
          ≈ {formatMoney(Math.round(Math.max(0, weeklyRate)))}/week
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
  earlyPill: {
    position: "absolute",
    right: -18,
    bottom: 45,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.green + "55",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  earlyPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: colors.green,
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
