# SpendSense — Design & Features

**Theme:** Light · `#F7F8FA` · green `#16A34A` · Inter  
**See also:** [`design.md`](design.md) (color tokens) · [`core-function.md`](core-function.md) (logic)

---

## Navigation

```
Home | Ledger | [+ FAB] | Vault | Settings
```

Center **green FAB** → Manual Entry (not a tab).

---

## Home

**Scroll order:** greeting + checklist banner → **Your money** → **Hero ring** → **Lent & Borrowed** → **Living** → **Future**.  
Headers use safe-area inset (`insets.top + 12`) on all tabs.

### Your money card (collapsed default)
| Collapsed | Expanded |
|-----------|----------|
| **Your money** — cash on you now | Remaining this month · carried-forward · not-yet-confirmed (still in bank) |
| | **Net worth** — confirmed EF, goals, SIP, shares |

Net worth accordion: **Lent out** (asset) · **You owe** (liability).

### Hero ring
- **Center:** Safe to spend (locked until salary confirmed this month)
- **Arcs:** green available · red spent · purple lent out (this month) · teal savings (confirmed + unconfirmed)
- **Stroke:** uniform width on all arcs; unconfirmed savings use lower opacity (not a thicker stroke)
- **Orbit chips** (compact, color-only numbers on ring edge, subtle float animation): `{days}d` · spent · saved (saved only when > 0)
- **Legend** below ring labels each arc color (chips are numbers only; legend is the key)

### Lent & Borrowed
- Person-based running balance — not a bucket or income/expense
- Compact row below ring: net balance, tap → `/lending` person list
- FAB third toggle: Lend/Borrow (person, direction, note, date)
- Settle up reduces balance without logging income/expense
- Ledger **Lending** filter shows lend/borrow/settle history

### Living
Core Living, Dates, Fun (budget bars) · Personal (fund bar, rolls over).  
Plain emoji icon column — no tinted icon background. Rows stagger in with `FadeInDown`.

### Future
Savings checklist at the bottom of Home — **EF lives here** (no separate EF card above the ring).

Each row shows:
- Monthly amount + tappable check-off (`__savings_confirm__`; same logic as month-start checklist)
- Thin progress bar + `NPR current / target · %` (EF uses blue accent + shield icon)
- EF + goal buckets: fixed confirm · SIP/Shares: editable amount in detail flows
- Placeholder CTA when no big-spend goal yet

Animated checkmark on confirm; progress bars animate fill width.

---

## Ledger

List / Chart toggle · filters (including **Lending**) · flagged amber border · **title** as main line, description as subtitle when different.

**Charts:** sentence-case section titles · `FadeIn` on cards · six-month trend bars with top NPR labels (`overflowTop` / extra card padding so labels aren't clipped) · softer bar radii · non-current trend months at lower green opacity.

---

## Vault

Active goals · Completed (archived) · SIP suggested target when age set · inline monthly edit in detail sheet.  
Goal cards use softened shadows; list rows stagger in with `FadeInDown`.

---

## Manual Entry

Field order: **Amount** (auto-focus) → Bucket → **Funded from (optional)** when bucket is savings/investment → **Title** → Description (optional) → Notes (hidden for savings confirms) → Date.  
Modes: Expense / Income / Lend-Borrow. Savings/investment destinations save as `__savings_confirm__`; optional funded-from debits that Living ceiling or Personal fund.

---

## Living

Regular rows: **Spent NPR X** primary, muted **ceiling NPR Y** secondary (not `X / Y` as a spend target).  
Personal: balance vs cap. Section subtitle: **Ceilings & personal fund**.

---

## Settings

Playbook (income, month start, EF floor, age) · buckets · keywords · sure-shot merchants · **payment helper** (eSewa / nBank) · notifications · CSV export · reset all data

---

## Onboarding (6 steps)

1. Name  
2. Money — take-home, **cash on hand**, month start, age (optional)  
3. Foundations — **Core Living** → EF target = 6× that, current EF balance  
4. Bucket builder — income meter, spending + Personal + EF + **Saving towards goal** pool + SIP/Shares  
5. Goals — split the pool across one or more purchases (monthlies must sum to the pool)  
6. Starting balances — SIP + Shares to date  

---

## Key formulas

```
effectiveIncome      = salary txn amount if confirmed this month else 0
safeToSpend          = spendingPlan - lifestyleSpent - personalDraws + max(0, effectiveIncome - totalAllocations)
availableBalance     = max(0, safeToSpend) + carriedForwardBalance
yourMoney            = availableBalance + stillInBank
stillInBank          = salary confirmed ? max(0, plannedSavings - confirmedSavedInvested) : 0
efFloor              = coreLiving × 6
suggestSipTarget     = income × 12 × max(10, 60 - age) × 0.15  (when age set)
```

---

## UI polish (shipped)

- Uniform hero ring stroke; compact orbit metric chips
- Home reorder + EF folded into Future with progress %
- Living icons without background boxes; animated progress bars
- Safe-area headers on Home, Ledger, Vault, Settings
- Lending screens: consistent 16px card radius, staggered list entrances

---

## Status

| Feature | Status |
|---------|--------|
| Home finance UX overhaul | Shipped |
| Lent & borrowed (person ledger, ring slice, net worth) | Shipped |
| Full-app design polish | Shipped |
| Description field + word categorize | Shipped |
| Manual entry (expense / income / lend-borrow) | Shipped |
| Payment helper (usage access + reply notification) | Shipped (dev client) |
| Recurring drafts | Not shipped |
