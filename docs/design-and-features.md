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
| **Your money** — cash on you now | Carry + this period’s cash flow · wallets (Bank / eSewa / Cash) |
| | **Net worth** — confirmed EF, goals, SIP, shares |

Net worth accordion: **Lent out** (asset) · **You owe** (liability).

### Hero ring
- **Center:** Safe to spend (locked until salary confirmed this month)
- **Paid early? pill:** visible during the 7 days before the configured month start when the current salary is already confirmed. Confirmation closes the old period and starts the new plan today without changing the configured day.
- **Arcs:** green available · red spent · purple lent out (this month) · teal savings (confirmed + unconfirmed)
- **Stroke:** uniform width on all arcs; unconfirmed savings use lower opacity (not a thicker stroke)
- **Orbit chips** (compact, color-only numbers on ring edge, subtle float animation): `{days}d` · spent · saved (saved only when > 0)
- **Legend** below ring labels each arc color (chips are numbers only; legend is the key)

### Lent & Borrowed
- Person-based running balance — not a bucket or income/expense
- Compact row below ring: net balance, tap → `/lending` person list
- FAB third toggle: Lend/Borrow (person, direction, note, date)
- Settle up reduces balance without logging income/expense
- Lending entries can be edited/deleted; deleting a person removes their history
- Paid settlements leave Your money; received settlements add to it
- Ledger **Lending** filter shows lend/borrow/settle history

### Living
Core Living, Dates, Fun (budget bars) · Personal (fund bar, rolls over).  
Plain emoji icon column — no tinted icon background. Rows stagger in with `FadeInDown`.

### Future
Savings checklist at the bottom of Home — **EF lives here** (no separate EF card above the ring).

Each row shows:
- Monthly amount + tappable check-off (expense to that Future bucket; same logic as month-start checklist)
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

Field order: **Amount** (auto-focus) + optional **Fee** chip → Paid from / Lands in → Bucket (expense) or **Put back into** (optional income) → **Funded from (optional)** when bucket is savings/investment → **Title** → Description (optional) → Date. Fees debit cash but do not count toward bucket spend or investment principal.  
Modes: Expense / Income / Lend-Borrow. Savings/investment destinations are Future contributions; optional funded-from debits that Living ceiling or Personal fund. Income can put back into a spending bucket so that bar comes down. Transaction details show and edit the wallet.

---

## Living

Regular rows: **Spent NPR X** primary, muted **ceiling NPR Y** secondary (not `X / Y` as a spend target).  
Personal: balance vs cap. Section subtitle: **Ceilings & personal fund**.

---

## Settings

Playbook (income, month start, EF floor, age) · buckets (Living / Future headers show the sum of those monthly amounts) · Payment helper (delay + watched apps + log notification) · nudge notifications · Share for Claude (on-demand markdown snapshot) · CSV export · reset all data. Keyword / sure-shot Settings UI is parked — see `docs/superpowers/specs/2026-09-29-keyword-and-sureshot-restore.md`.

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
safeToSpend          = spendingPlan - lifestyleSpent - personalDraws + max(0, effectiveIncome - totalAllocations) + lendingCashAdjust - fees
bankPile             = max(0, carriedForward + periodIncome - periodExpenses - fees + lendingCashAdjust + foundThisPeriod)
yourMoney            = bankPile + eSewa + Cash
stillInBank          = salary confirmed ? max(0, plannedSavings - confirmedSavedInvested) : 0
efFloor              = coreLiving × 6
suggestSipTarget     = income × 12 × max(10, 60 - age) × 0.15  (when age set)
nextCarry            = bank pile on the card at close + today’s expenses − today’s income − today’s lending-in (those stay in the new period; Cash is not folded into Bank)
```

SIP confirms are shown in NPR 5,000 chunks (last chunk may be smaller); each chunk accepts its own fee. The Month Start Ritual auto-opens only once per playbook month while its pending banner remains available.

Living overspend never reallocates or changes other bucket ceilings.

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
| Share for Claude (local markdown snapshot) | Shipped (local) |
| Recurring drafts | Not shipped |
