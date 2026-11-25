# SpendSense — Core Function

**Platform:** Android · React Native + Expo · NPR only

---

## What this app is

SpendSense is a **playbook-first personal finance app** for Nepal. The user defines how their monthly take-home income should be split across named buckets (spending, savings, investments, goals). Every expense or transfer confirmation is logged against a bucket. The Home screen answers:

> *How much can I spend right now — and am I on track with saving and investing?*

It is **not** a bank aggregator. It tracks **intentional money**: planned allocations, spending, confirmed saves/invests, and deliberate set-asides (EF, goals, SIP, shares).

---

## Mental model

```
Monthly take-home (playbook)
    ├── Allocated to buckets (monthly plan)
    ├── Actually spent (lifestyle + Personal draws)
    ├── Confirmed saved/invested (expense to a savings/investment bucket)
    └── Remaining → safe to spend / available balance / month-end carry-forward
```

**Playbook** — income, month start day, EF floor, EF start balance, user name, age (optional), carried-forward balance.

**Buckets** — monthly amounts, types (`spending` | `savings` | `investment`). Regular spending resets each month. **Personal** accumulates with top-up + cap.

**Transactions** — amount, optional fee, date, bucket, **title** (user label), optional description, source, wallet (Bank / eSewa / Cash), optional flag. Salary is income on `_salary`. Future contributions are expenses to a savings or investment bucket. Fees leave cash but do not count toward the bucket or investment principal. Income may optionally **put back into** a spending bucket (friend share); that amount reduces the bucket’s spent (floor 0) and still adds to Your money.

**Goals** — targets with linked savings bucket(s); can complete and archive.

---

## Core loops

### 1. Capture → categorize → inform
1. Log via **Manual Entry** (center FAB), or optional **payment helper** notification in selected Android apps (eSewa / nBank by default; amount is flagged until you assign a bucket)
2. **Categorization** (priority):
   - Keyword word match in title or description
   - Sure-shot merchant (Settings)
   - Fallback bucket → **flagged**
3. Home and Ledger update

### 2. Month rhythm
- **Month Start Checklist:** auto-opens once per playbook month; confirm salary (unlocks safe to spend) + savings/investment transfers
- **Early salary:** during the 7 days before the configured start, **Paid early?** snapshots **Your money** on the card as carry, adds back today's spend (and drops today's borrow/income) so those stay in the new period only, then logs salary. After the tap, cash is that carry + salary − this period’s flow. The configured start day remains the next regular boundary.
- **Future section** (bottom of Home): monthly check-off for EF, goals, SIP, Shares (expense to that bucket); each row shows balance vs target and % progress — EF is here, not a separate card above the ring
- **Month rollover:** Personal top-up + cap; carried-forward becomes that period’s cash on hand (floor 0); cap override reset

### 3. Safe to spend vs available balance

| Concept | Meaning |
|---------|---------|
| **Your money** (collapsed) | Bank leftover pile (carry + this period’s bank flow) plus eSewa and Cash. Cash is its own wallet — it is not subtracted from Bank, and income or spending logged on eSewa / Cash never moves Bank (moves between wallets do). Confirming a save moves that amount to net worth. |
| **Safe to spend** (ring) | min(plan left, cash available). Plan left = Living/Personal plan remaining + unallocated salary − fees. Cash available = Your money − set aside (unconfirmed Future + borrow repayments due this month). The rest is **Free** (carry, windfalls): lending, repayments and unplanned spending come out of Free first. |
| **Net worth** (Your money, expanded) | Savings (EF + goals + SIP + shares) + Your money − what you owe. Money lent out is not counted until it comes back. |
| **No-salary month** | One toggle (Settings, checklist, late-salary banner). Plan = kept buckets only (default Core Living), paid from Free; other buckets pause. Runway card, gentle paused-bucket nudge, optional one-tap Emergency Fund move. |

---

## Bucket behaviors

### Regular spending (Core Living, Dates, Fun)
- Monthly **ceiling** (not a spend target); Home shows spent first, ceiling second
- Bar = spent / ceiling
- Core Living: household & groceries
- Optional: savings contributions can be **funded from** a spending bucket (counts toward that ceiling + fills destination)
- Income put back into this bucket reduces spent (floor 0)

### Personal fund
- Top-up each month, balance rolls over, cap default NPR 20,000
- Cap prompts: reallocate, raise cap, or raise for specific purchase
- Can **fund** EF/savings contributions (balance decreases)

### Savings / investment
- Confirmed by an expense to that savings/investment bucket
- Optional `funded_from_bucket_id` when contribution came from Living/Personal
- EF target = 6× **Core Living** monthly amount

### Goals
- Complete at target → archived in Vault; prompt to reallocate freed monthly amount
- **Buy now / use savings** (goal detail, or the goal chip in [+]): enter what it cost. The saved part is an expense on wallet `_goal_savings` with `funded_from_bucket_id` = the goal bucket — it lowers the goal's saved amount and net worth, and never touches Your money, ceilings or safe to spend. Anything above the saved amount is a normal expense from Your money (`_goal_purchase`, no ceiling) or from a chosen Living/Personal bucket. Leftover goes to Your money (income row on `_goal_return`, shown as **Goal return**), another goal, or stays in the goal. The goal is completed unless leftover stays in it.
- Goal saved = start balance + contributions − everything funded from its buckets. Deleting a goal-savings row puts the money back and reopens a goal that was completed early.

---

## Categorization

Parked. User picks a bucket on each expense. Keyword mappings and sure-shot merchants are not a product feature. Restore: `docs/superpowers/specs/2026-09-29-keyword-and-sureshot-restore.md`.

---

## Lent & borrowed

Separate from buckets and the transaction ledger's income/expense flow:

- **Lend** — cash left you; comes out of Free first, lowers safe to spend only once Free is empty (purple ring slice shows that part)
- **Borrow** — cash received; raises Your money, not the plan. Optional **pay back per month** plan (per person): what's due is set aside, shows in the month checklist and on the Lent & borrowed row
- **Settle** — partial or full repayment; not income or expense
- Entries and people can be edited/deleted; deleting a person removes their lending history. Cash that already moved stays in Your money.
- Paying a settlement leaves Your money; receiving one adds to it, without touching Living buckets
- Per-person net balance; home row shows total net across all people

### Payment helper (Android)

Settings → **Payment helper**. Usage access (`UsageStatsManager`) detects selected apps (defaults: eSewa / nBank) in the foreground. A notification appears after the chosen delay; amount is flagged until you assign a Living bucket. No screenshot, overlay, or Accessibility.

The helper never opens `spendsense.db`: Android's SQLite and expo-sqlite's copy do not see each other's locks in one process, and closing the native connection deleted the live WAL and lost app writes. Native code queues each Log and bucket pick in SharedPreferences (`PaymentWatchQueue.kt`); `lib/payment-queue.ts` applies them on launch, when the app comes to the front and before every backup. JS mirrors the Living buckets and currency back for the notification.

### Scan bubble (removed)

Screenshot overlay / MediaProjection is out of scope.

---

## Data storage
- SQLite + Drizzle, on-device only
- Zustand: playbook, buckets, transactions, goals, lending (contacts + lend/borrow entries)
- Salary = income on `_salary`. Future contribution = expense to a savings/investment bucket.
- Settings can share a local markdown snapshot for Claude; nothing is uploaded until the user taps share.

---

## Out of scope (V1)
- Bank balance sync, recurring auto-drafts, share-intent capture, iOS, cloud sync, portfolio returns
