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
| **Your money** (collapsed) | Bank leftover pile (carry + this period’s bank flow) plus eSewa and Cash. Cash is its own wallet — it is not subtracted from Bank. Confirming a save moves that amount to net worth. |
| **Safe to spend** (ring) | Lifestyle budgets remaining + unallocated income, after salary confirmed. Excludes carry-forward and unconfirmed Future. |
| **Net worth** (Your money, expanded) | Confirmed EF + goals + SIP + shares only |

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

---

## Categorization

Parked. User picks a bucket on each expense. Keyword mappings and sure-shot merchants are not a product feature. Restore: `docs/superpowers/specs/2026-09-29-keyword-and-sureshot-restore.md`.

---

## Lent & borrowed

Separate from buckets and the transaction ledger's income/expense flow:

- **Lend** — cash left you; reduces safe-to-spend for the month; purple ring slice
- **Borrow** — cash received; temporarily increases available balance
- **Settle** — partial or full repayment; not income or expense
- Entries and people can be edited/deleted; deleting a person removes their lending history. Cash that already moved stays in Your money.
- Paying a settlement leaves Your money; receiving one adds to it, without touching Living buckets
- Per-person net balance; home row shows total net across all people

### Payment helper (Android)

Settings → **Payment helper**. Usage access (`UsageStatsManager`) detects selected apps (defaults: eSewa / nBank) in the foreground. A notification appears after the chosen delay; amount is flagged until you assign a Living bucket. No screenshot, overlay, or Accessibility.

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
