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
    ├── Confirmed saved/invested (__savings_confirm__)
    └── Remaining → safe to spend / available balance / month-end carry-forward
```

**Playbook** — income, month start day, EF floor, EF start balance, user name, age (optional), carried-forward balance.

**Buckets** — monthly amounts, types (`spending` | `savings` | `investment`). Regular spending resets each month. **Personal** accumulates with top-up + cap.

**Transactions** — amount, date, bucket, **title** (user label), optional description, remarks, source, optional flag.

**Goals** — targets with linked savings bucket(s); can complete and archive.

---

## Core loops

### 1. Capture → categorize → inform
1. Log via **Manual Entry** (center FAB), or optional **payment helper** notification (eSewa / nBank; amount only, flagged until you assign a bucket)
2. **Categorization** (priority):
   - Keyword word match in description / remarks / merchant
   - Sure-shot merchant (Settings)
   - Fallback bucket → **flagged**
3. Home and Ledger update

### 2. Month rhythm
- **Month Start Checklist:** confirm salary (unlocks safe to spend) + savings/investment transfers
- **Future section** (bottom of Home): monthly check-off for EF, goals, SIP, Shares via `__savings_confirm__`; each row shows balance vs target and % progress — EF is here, not a separate card above the ring
- **Month rollover:** Personal top-up + cap; surplus → carried-forward; cap override reset

### 3. Safe to spend vs available balance

| Concept | Meaning |
|---------|---------|
| **Your money** (collapsed) | Cash on you right now: remaining this month + carried-forward + planned Future not yet confirmed. Confirming a save moves that amount to net worth. |
| **Safe to spend** (ring) | Lifestyle budgets remaining + unallocated income, after salary confirmed. Excludes carry-forward and unconfirmed Future. |
| **Net worth** (Your money, expanded) | Confirmed EF + goals + SIP + shares only |

---

## Bucket behaviors

### Regular spending (Core Living, Dates, Fun)
- Monthly **ceiling** (not a spend target); Home shows spent first, ceiling second
- Bar = spent / ceiling
- Core Living: household & groceries
- Optional: savings contributions can be **funded from** a spending bucket (counts toward that ceiling + fills destination)

### Personal fund
- Top-up each month, balance rolls over, cap default NPR 20,000
- Cap prompts: reallocate, raise cap, or raise for specific purchase
- Can **fund** EF/savings contributions (balance decreases)

### Savings / investment
- Confirmed via `__savings_confirm__` transactions
- Optional `funded_from_bucket_id` when contribution came from Living/Personal
- EF target = 6× **Core Living** monthly amount

### Goals
- Complete at target → archived in Vault; prompt to reallocate freed monthly amount

---

## Categorization (do not change lightly)
1. Keyword word match in description / remarks / merchant
2. Sure-shot merchant (exact)
3. Fallback + flag

Only sure-shot merchants are memorized from flagged review.

---

## Lent & borrowed

Separate from buckets and the transaction ledger's income/expense flow:

- **Lend** — cash left you; reduces safe-to-spend for the month; purple ring slice
- **Borrow** — cash received; temporarily increases available balance
- **Settle** — partial or full repayment; not income or expense
- Per-person net balance; home row shows total net across all people

### Payment helper (Android)

Optional Settings toggle. Usage access (`UsageStatsManager`) plus a reply notification while eSewa or nBank is in the foreground. Amount-only expense is saved flagged (`source: notification`). No screenshot, overlay, or Accessibility.

### Scan bubble (removed)

Screenshot overlay / MediaProjection is out of scope.

---

## Data storage
- SQLite + Drizzle, on-device only
- Zustand: playbook, buckets, transactions, goals, lending (contacts + lend/borrow entries)
- Internal remark tokens: `__salary__`, `__savings_confirm__`

---

## Out of scope (V1)
- Bank balance sync, recurring auto-drafts, share-intent capture, iOS, cloud sync, portfolio returns
