import { useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { usePulseData } from "@/hooks/usePulseData";
import { HeroRing } from "@/components/home/HeroRing";
import { LivingSection } from "@/components/home/LivingSection";
import { FutureSection } from "@/components/home/FutureSection";
import { NetWorthCard } from "@/components/home/NetWorthCard";
import { ShareConfirmSheet } from "@/components/home/ShareConfirmSheet";
import { FlaggedTransactionPrompt } from "@/components/flagged/FlaggedTransactionPrompt";
import {
  MonthStartChecklist,
  type ChecklistItem,
} from "@/components/home/MonthStartChecklist";
import { usePlaybookStore } from "@/store/playbook";
import { useTransactionsStore, INCOME_BUCKET_ID } from "@/store/transactions";
import { useBucketsStore } from "@/store/buckets";
import { useGoalsStore } from "@/store/goals";
import { buildFutureGroups, checklistLabel } from "@/lib/goals/future-groups";

import {
  SHARES_BUCKET_ID,
  SIP_BUCKET_ID,
  EF_BUCKET_ID,
  PERSONAL_BUCKET_ID,
} from "@/constants/defaults";
import { currentMonthKey, effectiveCap } from "@/lib/bucket-balance";
import { isPersonalAtCap } from "@/lib/personal-cap";
import { checkAndCompleteGoals } from "@/lib/goals/completion";
import { PersonalCapPrompt } from "@/components/home/PersonalCapPrompt";
import { LentBorrowRow } from "@/components/home/LentBorrowRow";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction } = useTransactionsStore();
  const { buckets } = useBucketsStore();
  const { goals, loadGoals } = useGoalsStore();
  const {
    userName,
    monthStartDay,
    monthlyIncome,
    lastChecklistMonth,
    efFloor,
    updatePlaybook,
  } = usePlaybookStore();
  const {
    totalIncome,
    effectiveIncome,
    safeToSpend,
    availableBalance,
    monthRemainingBalance,
    carriedForwardBalance,
    confirmedSavedInvested,
    lentOutstandingThisMonth,
    totalNetLending,
    lentOutAsset,
    youOweLiability,
    flaggedAmount,
    unconfirmedSavingsThisMonth,
    lifestyleSpent,
    personalDraws,
    bucketBalances,
    daysRemaining,
    weeklyRate,
    spendingBuckets,
    savingsBuckets,
    spentByBucket,
    confirmedSavingIds,
    monthStart,
    addTransaction,
    intentionalSavings,
    assetBreakdown,
    hasAnyData,
    efValue,
  } = usePulseData();

  const [promptVisible, setPromptVisible] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareBucketId, setShareBucketId] = useState<string | null>(null);
  const [capPromptVisible, setCapPromptVisible] = useState(false);
  const [capPromptMode, setCapPromptMode] = useState<
    "cap_hit" | "idle_rebalance"
  >("cap_hit");

  const flagged = transactions.filter((t) => t.isFlagged);

  const monthKey = currentMonthKey(monthStartDay);

  // Determine which checklist items are already completed this month
  // by checking if matching transactions exist
  const hasSalaryThisMonth = transactions.some(
    (t) => t.remarks === "__salary__" && t.type === "income",
  );

  const checklistItems: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [
      {
        id: "income",
        label: "Confirm Salary Received",
        amount: monthlyIncome,
        bucketId: INCOME_BUCKET_ID,
        completed: hasSalaryThisMonth,
      },
    ];
    savingsBuckets.forEach((b) => {
      items.push({
        id: b.id,
        label: checklistLabel(b, goals),
        amount: b.monthlyAmount,
        bucketId: b.id,
        completed: confirmedSavingIds.has(b.id),
      });
    });
    return items;
  }, [
    monthlyIncome,
    savingsBuckets,
    hasSalaryThisMonth,
    confirmedSavingIds,
    goals,
  ]);

  const checklistAllDone = checklistItems.every((i) => i.completed);
  const checklistPending = lastChecklistMonth !== monthKey && !checklistAllDone;

  useEffect(() => {
    if (lastChecklistMonth !== monthKey && !checklistAllDone) {
      setChecklistVisible(true);
    }
  }, [lastChecklistMonth, monthKey]);

  useEffect(() => {
    if (checklistAllDone && lastChecklistMonth !== monthKey) {
      updatePlaybook({ lastChecklistMonth: monthKey });
    }
  }, [checklistAllDone, monthKey, lastChecklistMonth]);

  const handleToggleChecklistItem = async (id: string) => {
    const txnDate = monthStart.toISOString();

    if (id === "income") {
      await addTransaction({
        type: "income",
        amount: monthlyIncome,
        description: "Salary received",
        merchant: "Salary",
        bucketId: INCOME_BUCKET_ID,
        date: txnDate,
        source: "manual",
        remarks: "__salary__",
        fundedFromBucketId: null,
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      });
    } else {
      const bucket = savingsBuckets.find((b) => b.id === id);
      if (!bucket) return;
      await addTransaction({
        type: "expense",
        amount: bucket.monthlyAmount,
        description: bucket.name,
        merchant: bucket.name,
        bucketId: bucket.id,
        date: txnDate,
        source: "manual",
        remarks: "__savings_confirm__",
        fundedFromBucketId: null,
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      });
    }
  };

  const handleConfirmSavings = async (bucketId: string) => {
    const bucket = savingsBuckets.find((b) => b.id === bucketId);
    if (!bucket || confirmedSavingIds.has(bucketId)) return;

    const isEditable =
      bucket.id === SHARES_BUCKET_ID ||
      bucket.id === SIP_BUCKET_ID ||
      bucket.name === "Direct Shares" ||
      bucket.name === "SIPs";

    if (isEditable) {
      setShareBucketId(bucketId);
      setShareSheetVisible(true);
      return;
    }

    await addTransaction({
      type: "expense",
      amount: bucket.monthlyAmount,
      description: bucket.name,
      merchant: bucket.name,
      bucketId: bucket.id,
      date: new Date().toISOString(),
      source: "manual",
      remarks: "__savings_confirm__",
      fundedFromBucketId: null,
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    });
  };

  const handleShareConfirm = async (amount: number) => {
    if (!shareBucketId) return;
    const bucket = savingsBuckets.find((b) => b.id === shareBucketId);
    if (!bucket) return;
    await addTransaction({
      type: "expense",
      amount,
      description: bucket.name,
      merchant: bucket.name,
      bucketId: bucket.id,
      date: new Date().toISOString(),
      source: "manual",
      remarks: "__savings_confirm__",
      fundedFromBucketId: null,
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    });
    setShareBucketId(null);
  };

  const shareBucket = shareBucketId
    ? savingsBuckets.find((b) => b.id === shareBucketId)
    : null;

  const { goalGroups, standaloneBuckets, hasBigSpendGoal } = useMemo(
    () => buildFutureGroups(savingsBuckets, goals),
    [savingsBuckets, goals],
  );

  const progressByBucket = useMemo(() => {
    const cumulativeConfirmed = (bucketId: string) =>
      transactions
        .filter(
          (t) => t.bucketId === bucketId && t.remarks === "__savings_confirm__",
        )
        .reduce((s, t) => s + t.amount, 0);

    const map: Record<string, { current: number; target: number }> = {};
    for (const group of goalGroups) {
      const goal = goals.find((g) => g.id === group.goalId);
      if (group.buckets.length === 1) {
        map[group.buckets[0].id] = {
          current:
            (goal?.startBalance ?? 0) +
            cumulativeConfirmed(group.buckets[0].id),
          target: goal?.targetAmount ?? 0,
        };
      } else {
        group.buckets.forEach((b) => {
          map[b.id] = {
            current: cumulativeConfirmed(b.id),
            target: effectiveCap(b) ?? b.monthlyAmount * 12,
          };
        });
      }
    }
    for (const b of standaloneBuckets) {
      if (b.id === EF_BUCKET_ID) {
        map[b.id] = { current: efValue, target: efFloor };
      } else {
        map[b.id] = {
          current: cumulativeConfirmed(b.id),
          target: effectiveCap(b) ?? b.monthlyAmount * 12,
        };
      }
    }
    return map;
  }, [goalGroups, standaloneBuckets, transactions, goals, efValue, efFloor]);

  const personalBucket = buckets.find((b) => b.id === PERSONAL_BUCKET_ID);
  const personalBalance = personalBucket
    ? (bucketBalances[personalBucket.id] ?? 0)
    : 0;

  useEffect(() => {
    if (!personalBucket) return;
    isPersonalAtCap(personalBucket).then((atCap) => {
      if (atCap && !personalBucket.capOverride) {
        setCapPromptMode("cap_hit");
        setCapPromptVisible(true);
      }
    });
  }, [personalBucket?.id, personalBalance]);

  useEffect(() => {
    checkAndCompleteGoals(goals, transactions).then((completed) => {
      if (completed.length > 0) {
        loadGoals();
        useBucketsStore.getState().loadBuckets();
        const last = completed[completed.length - 1];
        Alert.alert(
          "Goal completed!",
          `"${last.goal.name}" is fully funded. Create a new big spend goal and redirect NPR ${last.freedMonthlyAmount.toLocaleString()}/mo?`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "Create goal",
              onPress: () => router.push("/(tabs)/goals"),
            },
          ],
        );
      }
    });
  }, [transactions, goals]);

  const handleUndoChecklistItem = (id: string) => {
    Alert.alert(
      "Undo confirmation?",
      "This will remove the logged transaction for this item.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Undo",
          style: "destructive",
          onPress: async () => {
            if (id === "income") {
              const txn = transactions.find(
                (t) => t.remarks === "__salary__" && t.type === "income",
              );
              if (txn) await deleteTransaction(txn.id);
            } else {
              const txn = transactions.find(
                (t) => t.bucketId === id && t.remarks === "__savings_confirm__",
              );
              if (txn) await deleteTransaction(txn.id);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {userName || "there"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notifButton}
          onPress={() => setChecklistVisible(true)}
          hitSlop={12}
        >
          <Ionicons name="list-outline" size={22} color={colors.textSecond} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Checklist Pending Banner */}
        {checklistPending && !checklistVisible && (
          <TouchableOpacity
            style={styles.checklistBanner}
            onPress={() => setChecklistVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.checklistBannerIcon}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.green}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checklistBannerTitle}>
                Month checklist pending
              </Text>
              <Text style={styles.checklistBannerSub}>
                Tap to confirm your monthly transfers
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* Flagged Banner */}
        {flagged.length > 0 && (
          <TouchableOpacity
            style={styles.flaggedBanner}
            onPress={() => setPromptVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.flaggedIconBg}>
              <Ionicons name="alert-circle" size={20} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.flaggedTitle}>
                {flagged.length} transaction{flagged.length > 1 ? "s" : ""} need
                confirmation
              </Text>
              <Text style={styles.flaggedSub}>
                Tap to assign correct buckets
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* Net Worth Card */}
        <NetWorthCard
          availableBalance={availableBalance}
          intentionalSavings={intentionalSavings}
          monthRemainingBalance={monthRemainingBalance}
          carriedForwardBalance={carriedForwardBalance}
          lentOutAsset={lentOutAsset}
          youOweLiability={youOweLiability}
          breakdown={assetBreakdown.map((a) => ({
            label: a.name,
            value: a.value,
          }))}
          emptyHint={
            !hasAnyData
              ? "Your plan is live — savings build from here"
              : undefined
          }
        />

        <HeroRing
          effectiveIncome={effectiveIncome}
          safeToSpend={safeToSpend}
          lifestyleSpent={lifestyleSpent}
          personalDraws={personalDraws}
          confirmedSavedInvested={confirmedSavedInvested}
          unconfirmedSavingsThisMonth={unconfirmedSavingsThisMonth}
          lentOutstandingThisMonth={lentOutstandingThisMonth}
          daysRemaining={daysRemaining}
          weeklyRate={weeklyRate}
          flaggedAmount={flaggedAmount}
        />

        <LentBorrowRow
          totalNet={totalNetLending}
          onPress={() => router.push("/lending")}
        />

        <LivingSection
          buckets={spendingBuckets}
          spentByBucket={spentByBucket}
          bucketBalances={bucketBalances}
        />

        {/* Future — Savings checklist */}
        <FutureSection
          goalGroups={goalGroups}
          standaloneBuckets={standaloneBuckets}
          confirmedBucketIds={confirmedSavingIds}
          progressByBucket={progressByBucket}
          efBucketId={EF_BUCKET_ID}
          showPlaceholder={!hasBigSpendGoal}
          onConfirm={handleConfirmSavings}
          onAddGoal={() => router.push("/(tabs)/goals")}
        />

        <View style={{ height: 80 }} />
      </ScrollView>

      <FlaggedTransactionPrompt
        visible={promptVisible}
        flaggedTransactions={flagged}
        onClose={() => setPromptVisible(false)}
      />

      <ShareConfirmSheet
        visible={shareSheetVisible}
        bucketName={shareBucket?.name ?? "Direct Shares"}
        defaultAmount={shareBucket?.monthlyAmount ?? 0}
        onConfirm={handleShareConfirm}
        onClose={() => {
          setShareSheetVisible(false);
          setShareBucketId(null);
        }}
      />

      <MonthStartChecklist
        visible={checklistVisible}
        items={checklistItems}
        onToggleItem={handleToggleChecklistItem}
        onUndoItem={handleUndoChecklistItem}
        onDismiss={() => setChecklistVisible(false)}
      />

      {personalBucket && (
        <PersonalCapPrompt
          visible={capPromptVisible}
          balance={personalBalance}
          defaultCap={personalBucket.accumulationCap ?? 20000}
          mode={capPromptMode}
          onClose={() => setCapPromptVisible(false)}
          onRebalance={() => {
            setCapPromptVisible(false);
            router.push("/(tabs)/goals");
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  checklistBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenFill,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.green + "30",
    borderCurve: "continuous",
  },
  checklistBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checklistBannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
  },
  checklistBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecond,
  },
  flaggedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B10",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F59E0B20",
    borderCurve: "continuous",
  },
  flaggedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  flaggedTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
  },
  flaggedSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecond,
  },
});
