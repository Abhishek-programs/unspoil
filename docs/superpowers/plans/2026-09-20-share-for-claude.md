# Share for Claude Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings control that builds a local markdown snapshot of SpendSense, copies a short Claude prompt, and opens the Android share sheet — no backend.

**Architecture:** A pure `lib/claude-snapshot.ts` turns current store/DB-shaped data into markdown using the same cash formulas as Home. Settings writes that string to the app cache and shares the file; clipboard gets only the short prompt.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Zustand, `expo-clipboard`, `expo-file-system`, `expo-sharing`.

## Global Constraints

- No backend, auth, cloud sync, MCP, or in-app AI chat.
- Data leaves the phone only when the user taps Share for Claude.
- Export CSV stays as a transaction preview alert; do not replace it.
- Snapshot numbers use `computeCashOnHand`, `periodCashFromTransactions`, `computeMonthMetrics`, `foundMoneyInRange`, `getMonthRange` — no hardcoded balances.
- Skip recurring drafts. Omit `Income` / `Income reversed` from found money (already handled by `foundMoneyInRange`).
- Filename is `spendsense-YYYY-MM-DD.md` via `toLocalDateKey`.
- Clipboard prompt is the exact spec paragraph; never copy the dump.
- No automated test framework in V1; verify with `npx tsc --noEmit` and a device share.
- Do not run git commands without explicit permission.

**Spec:** `docs/superpowers/specs/2026-09-20-share-for-claude-design.md`

---

### Task 1: Snapshot builder

**Files:**
- Create: `lib/claude-snapshot.ts`
- Modify: `docs/design-and-features.md` (Settings list + Data)
- Modify: `docs/core-function.md` (one line under Data storage)
- Modify: `BUILD_ORDER.md` (shipped: Share for Claude)

**Interfaces:**
- Produces: `CLAUDE_SHARE_PROMPT: string`
- Produces: `snapshotFilename(now?: Date): string`
- Produces: `buildClaudeSnapshot(input: ClaudeSnapshotInput): string`

- [x] **Step 1: Add `lib/claude-snapshot.ts`**

```ts
import type { Transaction } from '@/store/transactions'
import type { Contact, LendBorrowEntry } from '@/lib/lending/balance'
import {
  computePersonBalance,
  computeMonthMetrics,
  directionLabel,
} from '@/lib/lending/balance'
import { computeCashOnHand, foundMoneyInRange, periodCashFromTransactions } from '@/lib/your-money'
import { getMonthRange, toLocalDateKey } from '@/lib/month'
import { formatNPR } from '@/lib/format'
import { transactionTitle } from '@/lib/transaction-label'
import { BANK_ACCOUNT_ID } from '@/constants/accounts'

export const CLAUDE_SHARE_PROMPT =
  'This is a SpendSense snapshot from my phone. All money is NPR. Attach/read the markdown. Playbook month may not be a calendar month. Your money = carry + this period’s cash flow. Safe to spend is this month’s plan after salary, not the bank pile. Answer from the file only.'

export type ClaudeSnapshotInput = {
  now?: Date
  playbook: {
    userName: string | null
    userAge: number | null
    monthlyIncome: number
    monthStartDay: number
    earlyMonthStartDate: string | null
    efFloor: number
    efStartBalance: number
    carriedForwardBalance: number
  }
  buckets: {
    id: string
    name: string
    type: string
    monthlyAmount: number
    isActive: boolean
    accumulates?: boolean
  }[]
  transactions: Transaction[]
  accounts: { id: string; name: string; balance: number }[]
  adjustments: { amount: number; date: string; note?: string | null }[]
  contacts: Contact[]
  entries: LendBorrowEntry[]
  goals: {
    name: string
    targetAmount: number
    monthlyContribution: number
    startBalance: number
    linkedBucketIds: string[]
    completedAt: string | null
  }[]
  keywordMappings: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
}

export function snapshotFilename(now = new Date()): string {
  return `spendsense-${toLocalDateKey(now)}.md`
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const ms = new Date(iso).getTime()
  return ms >= start.getTime() && ms <= end.getTime()
}

function spentThisPeriod(
  bucket: ClaudeSnapshotInput['buckets'][number],
  periodTxns: Transaction[],
): number {
  return periodTxns
    .filter(t => {
      if (t.isFlagged || t.isRecurringDraft || t.type !== 'expense') return false
      if (bucket.accumulates) {
        return (
          (t.bucketId === bucket.id && (!t.remarks || !t.remarks.startsWith('__'))) ||
          (t.fundedFromBucketId === bucket.id && t.remarks === '__savings_confirm__')
        )
      }
      if (t.bucketId === bucket.id) return true
      return t.fundedFromBucketId === bucket.id && t.remarks === '__savings_confirm__'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

function goalCurrent(
  goal: ClaudeSnapshotInput['goals'][number],
  allTxns: Transaction[],
): number {
  const confirmed = allTxns
    .filter(
      t =>
        !t.isRecurringDraft &&
        t.remarks === '__savings_confirm__' &&
        goal.linkedBucketIds.includes(t.bucketId),
    )
    .reduce((sum, t) => sum + t.amount, 0)
  return goal.startBalance + confirmed
}

export function buildClaudeSnapshot(input: ClaudeSnapshotInput): string {
  const now = input.now ?? new Date()
  const { start, end } = getMonthRange(
    input.playbook.monthStartDay,
    input.playbook.earlyMonthStartDate,
    now,
  )
  const liveTxns = input.transactions.filter(t => !t.isRecurringDraft)
  const periodTxns = liveTxns.filter(t => inRange(t.date, start, end))
  const cash = periodCashFromTransactions(periodTxns)
  const lending = computeMonthMetrics(input.entries, start, end)
  const found = foundMoneyInRange(input.adjustments, start, end)
  const bankPile = computeCashOnHand({
    carriedForward: input.playbook.carriedForwardBalance,
    income: cash.income,
    expenses: cash.expenses,
    fees: cash.fees,
    lendingCashAdjust: lending.lendBorrowCashAdjust,
    foundThisPeriod: found,
  })
  const otherWallets = input.accounts
    .filter(a => a.id !== BANK_ACCOUNT_ID)
    .reduce((s, a) => s + a.balance, 0)
  const yourMoney = bankPile + otherWallets
  const bucketName = (id: string) => input.buckets.find(b => b.id === id)?.name ?? id
  const accountName = (id: string | null | undefined) =>
    input.accounts.find(a => a.id === id)?.name ?? 'Bank'

  const lines: string[] = [
    '# SpendSense snapshot',
    '',
    `Exported ${toLocalDateKey(now)}. All amounts NPR. Recurring drafts omitted.`,
    '`__salary__` and `__savings_confirm__` are internal tags, not spending categories.',
    '',
    '## Now',
    '',
    `- Your money: ${formatNPR(yourMoney)}`,
    `- Bank: ${formatNPR(bankPile)}`,
    ...input.accounts
      .filter(a => a.id !== BANK_ACCOUNT_ID)
      .map(a => `- ${a.name}: ${formatNPR(a.balance)}`),
    `- Carried forward: ${formatNPR(input.playbook.carriedForwardBalance)}`,
    `- Period: ${toLocalDateKey(start)} → ${toLocalDateKey(end)}`,
    `- This period income: ${formatNPR(cash.income)}`,
    `- This period expenses: ${formatNPR(cash.expenses)}`,
    `- This period fees: ${formatNPR(cash.fees)}`,
    `- This period lending cash: ${formatNPR(lending.lendBorrowCashAdjust)}`,
    `- This period found money: ${formatNPR(found)}`,
    '',
    '## Playbook',
    '',
    input.playbook.userName ? `- Name: ${input.playbook.userName}` : '',
    input.playbook.userAge != null ? `- Age: ${input.playbook.userAge}` : '',
    `- Monthly income: ${formatNPR(input.playbook.monthlyIncome)}`,
    `- Month start day: ${input.playbook.monthStartDay}`,
    `- Early start: ${input.playbook.earlyMonthStartDate ?? 'none'}`,
    `- EF floor: ${formatNPR(input.playbook.efFloor)}`,
    `- EF start: ${formatNPR(input.playbook.efStartBalance)}`,
    `- Carry: ${formatNPR(input.playbook.carriedForwardBalance)}`,
    '',
    '## Buckets',
    '',
    '| Name | Type | Monthly | Active | Spent this period |',
    '| --- | --- | --- | --- | --- |',
    ...input.buckets.map(
      b =>
        `| ${b.name} | ${b.type} | ${formatNPR(b.monthlyAmount)} | ${b.isActive ? 'yes' : 'no'} | ${formatNPR(spentThisPeriod(b, periodTxns))} |`,
    ),
    '',
    '## Transactions',
    '',
    '| Date | Type | Amount | Fee | Title | Bucket | Account | Remarks |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...[...liveTxns]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        const remarks = (t.remarks ?? '').replace(/\|/g, '/')
        const title = transactionTitle(t).replace(/\|/g, '/')
        return `| ${toLocalDateKey(new Date(t.date))} | ${t.type} | ${formatNPR(t.amount)} | ${formatNPR(t.feeAmount ?? 0)} | ${title} | ${bucketName(t.bucketId)} | ${accountName(t.accountId)} | ${remarks} |`
      }),
    '',
    '## Lending',
    '',
    ...input.contacts.flatMap(c => {
      const bal = computePersonBalance(c.id, input.entries)
      return [`- ${c.name}: ${formatNPR(Math.abs(bal))} (${directionLabel(bal)})`]
    }),
    '',
    '| Date | Person | Type | Amount | Note |',
    '| --- | --- | --- | --- | --- |',
    ...[...input.entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => {
        const person = input.contacts.find(c => c.id === e.contactId)?.name ?? e.contactId
        return `| ${toLocalDateKey(new Date(e.date))} | ${person} | ${e.type} | ${formatNPR(e.amount)} | ${(e.note ?? '').replace(/\|/g, '/')} |`
      }),
    '',
    '## Goals',
    '',
    ...input.goals.map(g => {
      const current = goalCurrent(g, liveTxns)
      const done = g.completedAt ? 'completed' : 'open'
      return `- ${g.name}: current ${formatNPR(current)} / target ${formatNPR(g.targetAmount)}, monthly ${formatNPR(g.monthlyContribution)} (${done})`
    }),
    '',
    '## Keywords',
    '',
    ...input.keywordMappings.map(k => `- ${k.keyword} → ${bucketName(k.bucketId)}`),
    '',
    '## Sure-shot merchants',
    '',
    ...input.sureShotMerchants.map(m => `- ${m.merchantName} → ${bucketName(m.bucketId)}`),
    '',
  ]

  return lines.filter(line => line !== '').join('\n')
}
```

Do not drop blank section headers if a list is empty — keep the heading and write `None.` under Keywords / Sure-shot / Goals / Lending people when the array is empty.

- [x] **Step 2: Update docs**

In `docs/design-and-features.md` Settings bullet, add Share for Claude (on-demand markdown snapshot). Status table: Share for Claude | Shipped (local).

In `docs/core-function.md` Data storage, add: Settings can share a local markdown snapshot for Claude; nothing is uploaded until the user taps share.

In `BUILD_ORDER.md` Shipped table, add Share for Claude (local markdown + prompt). Keep AI chat in deferred.

- [x] **Step 3: Typecheck the builder**

Run: `npx tsc --noEmit`  
Expected: no errors from `lib/claude-snapshot.ts`.

---

### Task 2: Settings share sheet

**Files:**
- Modify: `app/(tabs)/settings.tsx`
- Modify: `package.json` (via `npx expo install`)

**Interfaces:**
- Consumes: `CLAUDE_SHARE_PROMPT`, `snapshotFilename`, `buildClaudeSnapshot`
- Produces: Settings Data row that copies the prompt and shares the `.md` file

- [x] **Step 1: Install Expo modules**

Run from repo root:

```bash
npx expo install expo-clipboard expo-file-system expo-sharing
```

Expected: SDK 54–compatible versions added to `package.json`.

- [x] **Step 2: Wire Settings**

Add imports:

```ts
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { buildClaudeSnapshot, CLAUDE_SHARE_PROMPT, snapshotFilename } from '@/lib/claude-snapshot'
```

If `expo-file-system/legacy` does not resolve, use `expo-file-system` `writeAsStringAsync` / `cacheDirectory` from that package’s SDK 54 export.

Add `handleShareForClaude` next to `handleExportCSV`:

```ts
const handleShareForClaude = async () => {
  try {
    if (txnStore.allTransactions.length === 0) {
      await txnStore.loadAllTransactions()
    }
    if (useLendingStore.getState().allEntries.length === 0) {
      await useLendingStore.getState().loadAllEntries()
    }
    const pb = usePlaybookStore.getState()
    const markdown = buildClaudeSnapshot({
      playbook: {
        userName: pb.userName,
        userAge: pb.userAge,
        monthlyIncome: pb.monthlyIncome,
        monthStartDay: pb.monthStartDay,
        earlyMonthStartDate: pb.earlyMonthStartDate,
        efFloor: pb.efFloor,
        efStartBalance: pb.efStartBalance,
        carriedForwardBalance: pb.carriedForwardBalance,
      },
      buckets: useBucketsStore.getState().buckets,
      transactions: useTransactionsStore.getState().allTransactions,
      accounts: useAccountsStore.getState().accounts,
      adjustments: useAccountsStore.getState().adjustments,
      contacts: useLendingStore.getState().contacts,
      entries: useLendingStore.getState().allEntries,
      goals: useGoalsStore.getState().goals,
      keywordMappings: useBucketsStore.getState().keywordMappings,
      sureShotMerchants: useBucketsStore.getState().sureShotMerchants,
    })
    await Clipboard.setStringAsync(CLAUDE_SHARE_PROMPT)
    const name = snapshotFilename()
    const path = `${FileSystem.cacheDirectory}${name}`
    await FileSystem.writeAsStringAsync(path, markdown)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: 'text/markdown',
        dialogTitle: 'Share for Claude',
        UTI: 'public.plain-text',
      })
    } else {
      Alert.alert('Share for Claude', 'Prompt copied. Sharing is not available on this device.')
      return
    }
    Alert.alert('Share for Claude', 'Prompt copied. Attach the file in Claude.')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not build the snapshot.'
    Alert.alert('Share failed', message)
  }
}
```

Map playbook field names to whatever `usePlaybookStore` actually exposes (`userName` vs `name`). Do not invent store keys.

On the Data card (above Export CSV), add:

```tsx
<SectionHeader
  title="Data"
  description="Stays on this phone until you share."
/>
<Card>
  <TouchableOpacity onPress={handleShareForClaude} style={styles.actionButton}>
    <Text style={styles.actionButtonText}>Share for Claude</Text>
  </TouchableOpacity>
  <View style={styles.divider} />
  <TouchableOpacity onPress={handleExportCSV} style={styles.actionButton}>
    <Text style={styles.actionButtonText}>Export CSV</Text>
  </TouchableOpacity>
</Card>
```

Remove the old Data header that only says “Export your transactions” so there is one Data card: Share for Claude + Export CSV. Leave the Danger zone Data header as-is.

If share is dismissed, `shareAsync` may throw — treat that as cancel: do not show Share failed; prompt stays copied.

- [x] **Step 3: Typecheck**

Run: `npx tsc --noEmit`  
Expected: clean.

- [x] **Step 4: Device check**

Rebuild/install the release the user is running. Settings → Share for Claude:

- Clipboard has the short prompt only.
- Share sheet offers `spendsense-YYYY-MM-DD.md`.
- File Now.Bank / Your money match Home.
- Cancel share does not alert an error.
- Export CSV still only previews transactions.
