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
import { useTransactionsStore, INCOME_BUCKET_ID, SALARY_BUCKET_ID } from "@/store/transactions";
import { isSalaryTxn } from "@/lib/txn-kind";
import { useBucketsStore } from "@/store/buckets";
import { useGoalsStore } from "@/store/goals";
import { useAccountsStore } from "@/store/accounts";
import { buildFutureGroups, checklistLabel } from "@/lib/goals/future-groups";

import {
  SHARES_BUCKET_ID,
  SIP_BUCKET_ID,
  EF_BUCKET_ID,
  PERSONAL_BUCKET_ID,
} from "@/constants/defaults";
import {
  currentMonthKey,
  effectiveCap,
  runMonthRollover,
} from "@/lib/bucket-balance";
import { isPersonalAtCap } from "@/lib/personal-cap";
import { checkAndCompleteGoals } from "@/lib/goals/completion";
import { PersonalCapPrompt } from "@/components/home/PersonalCapPrompt";
import { LentBorrowRow } from "@/components/home/LentBorrowRow";
import { useLendingStore } from "@/store/lending";
import {
  getDaysUntilNextRegularStart,
  getMonthRange,
  toLocalDateKey,
} from "@/lib/month";
import { runSurplusRollover } from "@/lib/month-surplus";
import { computeMonthMetrics } from "@/lib/lending/balance";
import { movedIntoNewPeriodAdjust } from "@/lib/your-money";
import { formatMoney } from "@/lib/format";
import { applySchemaPatches, restoreWipedSpendingCeilings } from "@/db/client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, allTransactions, deleteTransaction, loadTransactions } =
    useTransactionsStore();
  const { buckets, loadBuckets } = useBucketsStore();
  const { goals, loadGoals } = useGoalsStore();
  const {
    userName,
    monthStartDay,
    earlyMonthStartDate,
    monthlyIncome,
    lastChecklistMonth,
    lastChecklistPromptMonth,
    efFloor,
    personalRecoveryDebt,
    lastBalanceRolloverMonth,
    lastSurplusRolloverMonth,
    loadPlaybook,
    updatePlaybook,
  } = usePlaybookStore();
  const { loadEntries } = useLendingStore();
  const {
    totalIncome,
    effectiveIncome,
    safeToSpend,
    yourMoney,
    bankPile,
    stillInBank,
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
    moneyAccounts,
  } = usePulseData();

  const { seedFromYourMoney, syncBankToPile } = useAccountsStore();

  useEffect(() => {
    void (async () => {
      await seedFromYourMoney(bankPile);
      await syncBankToPile(bankPile);
    })();
  }, [bankPile, seedFromYourMoney, syncBankToPile]);

  const [promptVisible, setPromptVisible] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareBucketId, setShareBucketId] = useState<string | null>(null);
  const [shareConfirmAmount, setShareConfirmAmount] = useState<number | null>(
    null,
  );
  const [capPromptVisible, setCapPromptVisible] = useState(false);
  const [startingMonthEarly, setStartingMonthEarly] = useState(false);

  const flagged = transactions.filter((t) => t.isFlagged);

  const monthKey = currentMonthKey(monthStartDay, earlyMonthStartDate);

  // Determine which checklist items are already completed this month
  // by checking if matching transactions exist
  const hasSalaryThisMonth = transactions.some((t) => isSalaryTxn(t));
  const sipBucket = savingsBuckets.find((b) => b.id === SIP_BUCKET_ID);
  const sipConfirmedPrincipal = transactions
    .filter(
      (t) =>
        t.bucketId === SIP_BUCKET_ID &&
        t.type === "expense" &&
        !t.isFlagged &&
        !t.isRecurringDraft,
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const sipRemaining = Math.max(
    0,
    (sipBucket?.monthlyAmount ?? 0) - sipConfirmedPrincipal,
  );
  const sipChunks = useMemo(() => {
    const chunks: number[] = [];
    for (let remaining = sipRemaining; remaining > 0; remaining -= 5000) {
      chunks.push(Math.min(5000, remaining));
    }
    return chunks;
  }, [sipRemaining]);

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
        chunks: b.id === SIP_BUCKET_ID ? sipChunks : undefined,
      });
    });
    return items;
  }, [
    monthlyIncome,
    savingsBuckets,
    hasSalaryThisMonth,
    confirmedSavingIds,
    goals,
    sipChunks,
  ]);

  const checklistAllDone = checklistItems.every((i) => i.completed);
  const checklistPending = lastChecklistMonth !== monthKey && !checklistAllDone;
  const daysUntilRegularStart = getDaysUntilNextRegularStart(monthStartDay);
  const canStartMonthEarly =
    !earlyMonthStartDate &&
    hasSalaryThisMonth &&
    daysUntilRegularStart >= 1 &&
    daysUntilRegularStart <= 7;

  useEffect(() => {
    if (lastChecklistPromptMonth !== monthKey && !checklistAllDone) {
      setChecklistVisible(true);
      void updatePlaybook({ lastChecklistPromptMonth: monthKey });
    }
  }, [
    lastChecklistPromptMonth,
    monthKey,
    checklistAllDone,
    updatePlaybook,
  ]);

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
        bucketId: SALARY_BUCKET_ID,
        date: txnDate,
        source: "manual",
        fundedFromBucketId: null,
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      });
    } else {
      const bucket = savingsBuckets.find((b) => b.id === id);
      if (!bucket) return;
      if (bucket.id === SIP_BUCKET_ID) {
        handleConfirmSavings(bucket.id);
        return;
      }
      await addTransaction({
        type: "expense",
        amount: bucket.monthlyAmount,
        description: bucket.name,
        merchant: bucket.name,
        bucketId: bucket.id,
        date: txnDate,
        source: "manual",
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
      setShareConfirmAmount(
        bucket.id === SIP_BUCKET_ID
          ? Math.min(5000, sipRemaining)
          : bucket.monthlyAmount,
      );
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
      fundedFromBucketId: null,
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    });
  };

  const handleShareConfirm = async (amount: number, feeAmount: number) => {
    if (!shareBucketId) return;
    const bucket = savingsBuckets.find((b) => b.id === shareBucketId);
    if (!bucket) return;
    await addTransaction({
      type: "expense",
      amount,
      feeAmount,
      description: bucket.name,
      merchant: bucket.name,
      bucketId: bucket.id,
      date: new Date().toISOString(),
      source: "manual",
      fundedFromBucketId: null,
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    });
    setShareBucketId(null);
    setShareConfirmAmount(null);
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
      allTransactions
        .filter(
          (t) => t.bucketId === bucketId && t.type === "expense",
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
  }, [goalGroups, standaloneBuckets, allTransactions, goals, efValue, efFloor]);

  const personalBucket = buckets.find((b) => b.id === PERSONAL_BUCKET_ID);
  const personalBalance = personalBucket
    ? (bucketBalances[personalBucket.id] ?? 0)
    : 0;

  useEffect(() => {
    if (!personalBucket) return;
    isPersonalAtCap(personalBucket).then((atCap) => {
      if (atCap && !personalBucket.capOverride) {
        setCapPromptVisible(true);
      }
    });
  }, [personalBucket?.id, personalBalance]);

  useEffect(() => {
    checkAndCompleteGoals(goals, allTransactions).then((completed) => {
      if (completed.length > 0) {
        loadGoals();
        useBucketsStore.getState().loadBuckets();
        const last = completed[completed.length - 1];
        Alert.alert(
          "Goal completed!",
          `"${last.goal.name}" is fully funded. Create a new big spend goal and redirect ${formatMoney(last.freedMonthlyAmount)}/mo?`,
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
  }, [allTransactions, goals]);

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
                (t) => isSalaryTxn(t),
              );
              if (txn) await deleteTransaction(txn.id);
            } else {
              const txn = transactions.find(
                (t) => t.bucketId === id && t.type === "expense",
              );
              if (txn) await deleteTransaction(txn.id);
            }
          },
        },
      ],
    );
  };

  const handleStartMonthEarly = () => {
    Alert.alert(
      "Start new month today?",
      `Closes this month, logs ${formatMoney(monthlyIncome)} salary, and counts spending from today in the new month. Your regular start day stays ${monthStartDay}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start month",
          onPress: async () => {
            if (startingMonthEarly) return;
            setStartingMonthEarly(true);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const earlyStartKey = toLocalDateKey(today);
            try {
              applySchemaPatches();
              const beforeCeilings = useBucketsStore
                .getState()
                .buckets.filter((b) => b.type === "spending" && b.isActive)
                .map((b) => ({ id: b.id, monthlyAmount: b.monthlyAmount }));
              // Carry is the cash pile on the card now. Today's paid bills stay
              // in the new period, so add them back (and drop today's borrow)
              // or they would be deducted twice.
              const todayEnd = new Date(today);
              todayEnd.setHours(23, 59, 59, 999);
              await useLendingStore.getState().loadAllEntries();
              const lendingState = useLendingStore.getState();
              const lendingRows =
                lendingState.allEntries.length > 0
                  ? lendingState.allEntries
                  : lendingState.entries;
              const lendToday = computeMonthMetrics(
                lendingRows,
                today,
                todayEnd,
              ).lendBorrowCashAdjust;
              const cashNow = Math.max(
                0,
                bankPile +
                  movedIntoNewPeriodAdjust(
                    useTransactionsStore.getState().transactions,
                    lendToday,
                    today,
                  ),
              );
              const surplusKey = await runSurplusRollover(
                monthStartDay,
                lastSurplusRolloverMonth,
                earlyStartKey,
                { cashOnHand: cashNow },
              );
              const balanceKey = await runMonthRollover(
                monthStartDay,
                lastBalanceRolloverMonth,
                earlyStartKey,
              );
              await loadPlaybook();
              await updatePlaybook({
                earlyMonthStartDate: earlyStartKey,
                lastBalanceRolloverMonth: balanceKey,
                lastSurplusRolloverMonth: surplusKey,
              });
              await loadBuckets();
              restoreWipedSpendingCeilings();
              await loadBuckets();

              const { start, end } = getMonthRange(
                monthStartDay,
                earlyStartKey,
                today,
              );
              await Promise.all([
                loadTransactions(start, end),
                loadEntries(start, end),
              ]);
              await addTransaction({
                type: "income",
                amount: monthlyIncome,
                description: "Salary received",
                merchant: "Salary",
                bucketId: SALARY_BUCKET_ID,
                date: start.toISOString(),
                source: "manual",
                fundedFromBucketId: null,
                parsedTxnId: null,
                isFlagged: false,
                isRecurringDraft: false,
              });
              await loadBuckets();

              // Guard: Paid early must never wipe Living ceilings.
              const after = useBucketsStore.getState().buckets;
              const wiped = beforeCeilings.filter((b) => {
                if (!b.monthlyAmount || b.monthlyAmount <= 0) return false;
                const next = after.find((x) => x.id === b.id);
                return !next || !next.monthlyAmount;
              });
              if (wiped.length > 0) {
                for (const b of wiped) {
                  await useBucketsStore
                    .getState()
                    .updateBucket(b.id, { monthlyAmount: b.monthlyAmount });
                }
                await loadBuckets();
              }
              setChecklistVisible(true);
            } catch (error) {
              Alert.alert(
                "Could not start month",
                error instanceof Error ? error.message : "Please try again.",
              );
            } finally {
              setStartingMonthEarly(false);
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
          availableBalance={yourMoney}
          stillInBank={stillInBank}
          intentionalSavings={intentionalSavings}
          monthRemainingBalance={monthRemainingBalance}
          carriedForwardBalance={carriedForwardBalance}
          lentOutAsset={lentOutAsset}
          youOweLiability={youOweLiability}
          accountBalances={moneyAccounts.map((a) => ({
            id: a.id,
            name: a.name,
            balance: a.balance,
          }))}
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
          onStartMonthEarly={
            canStartMonthEarly ? handleStartMonthEarly : undefined
          }
          startingMonthEarly={startingMonthEarly}
        />

        <LentBorrowRow
          totalNet={totalNetLending}
          onPress={() => router.push("/lending")}
        />

        <LivingSection
          buckets={spendingBuckets}
          spentByBucket={spentByBucket}
          bucketBalances={bucketBalances}
          personalRecoveryDebt={personalRecoveryDebt}
        />

        {/* Future — Savings checklist */}
        <FutureSection
          goalGroups={goalGroups}
          standaloneBuckets={standaloneBuckets}
          confirmedBucketIds={confirmedSavingIds}
          progressByBucket={progressByBucket}
          chunksByBucket={{ [SIP_BUCKET_ID]: sipChunks }}
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
        amountEditable={shareBucket?.id !== SIP_BUCKET_ID}
        showFeeByDefault={shareBucket?.id === SIP_BUCKET_ID}
        defaultAmount={
          shareConfirmAmount ?? shareBucket?.monthlyAmount ?? 0
        }
        onConfirm={handleShareConfirm}
        onClose={() => {
          setShareSheetVisible(false);
          setShareBucketId(null);
          setShareConfirmAmount(null);
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
          onClose={() => setCapPromptVisible(false)}
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
