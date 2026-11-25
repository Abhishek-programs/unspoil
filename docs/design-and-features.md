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
| | **Net worth** — savings + Your money − what you owe (lent money not counted) |

Net worth accordion: **Lent out** (asset) · **You owe** (liability).

### Hero ring
- **Center:** Safe to spend (locked until salary confirmed this month, or No-salary month on)
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
Day headers show that day's spend. **Search** (header icon) looks across every period by title, bucket or amount and hides the period, filter and summary rows while open. **Long-press** an expense for a quick bucket change; **swipe left** to delete with a 5-second Undo bar (rows tied to goal savings are deleted from the detail sheet only). Detail sheet: date is editable.

**Charts:** sentence-case section titles · `FadeIn` on cards · six-month trend bars with top NPR labels (`overflowTop` / extra card padding so labels aren't clipped) · softer bar radii · non-current trend months at lower green opacity.

---

## Vault

Active goals · Completed (archived) · SIP suggested target when age set · inline monthly edit in detail sheet.  
Goal cards use softened shadows; list rows stagger in with `FadeInDown`.  
Goal detail: **Buy now / use savings** (big-spend goals only — not EF, SIP, Shares) opens a sheet: cost → from goal savings / still to pay / left in goal → pay the rest from (Your money or a Living bucket) → leftover goes to (Your money, another goal, keep in goal). Completed cards show `Used NPR X of savings · date`.

---

## Manual Entry

Field order: **Amount** (auto-focus) + optional **Fee** chip → Bucket grid (expense) or **Put back into** (optional income) → **Funded from (optional)** when bucket is savings/investment → **Title** → one details line (`Bank · Today`) that expands to Paid from / Lands in, Date (Today / Yesterday / Pick), Description and Recurring monthly.  
Bucket grid: compact three-column tiles, most-used first. **Spend bucket** section (Living buckets + **My money** last) is always open; each tile has a liquid fill showing what is left (amber at ≤20% left; an empty tile, including My money at 0, turns red). **Savings & investments** (EF, SIP, Shares, goals) is collapsed until toggled; tiles show what is saved and fill as this month's contribution is confirmed.  
Selection rules: spend bucket only → expense there (`_my_money` = outside every bucket, with a warning above the save button). Spend bucket + savings bucket → contribution to the saving funded from that bucket (My money = from general money, no funded-from). Savings bucket only → spending out of that saving (wallet `_goal_savings`, lowers the saving, not Your money) with a warning above the save button; for a goal the warning links to the complete-goal sheet. Fees debit cash but do not count toward bucket spend or investment principal.  
Modes: Expense / Income / Lend-Borrow. Savings/investment destinations are Future contributions; optional funded-from debits that Living ceiling or Personal fund. Income can put back into a spending bucket so that bar comes down. Leftover released when a goal is completed is logged as income type **Goal return** (`_goal_return`), kept out of the savings-rate income. Transaction details show and edit the wallet.

---

## Living

Regular rows: **Spent NPR X** primary, muted **ceiling NPR Y** secondary (not `X / Y` as a spend target).  
Personal: balance vs cap. Section subtitle: **Ceilings & personal fund**.

---

## Settings

Playbook (income, month start, EF floor, age) · buckets (Living / Future headers show the sum of those monthly amounts) · Payment helper (delay + watched apps + log notification) · nudge notifications · Share for Claude (on-demand markdown snapshot) · CSV export · reset all data. Keyword / sure-shot Settings UI is parked — see `docs/superpowers/specs/2026-09-29-keyword-and-sureshot-restore.md`.

---

## Onboarding (6 steps)

1. Name, then permissions and **Banking apps** (Android; optional — picks the Payment helper's watched apps and turns it on once usage access and notifications are granted)  
2. Money — take-home, **cash on hand**, month start, age (optional)  
3. Foundations — **Core Living** → EF target = 6× that, current EF balance  
4. Bucket builder — income meter, spending + Personal + EF + **Saving towards goal** pool + SIP/Shares  
5. Goals — split the pool across one or more purchases (monthlies must sum to the pool)  
6. Starting balances — SIP + Shares to date  

---

## Key formulas

```
effectiveIncome      = salary txn amount if confirmed this month else 0
safeToSpend          = min(
                         spendingPlan - lifestyleSpent - personalDraws + max(0, effectiveIncome - totalAllocations) + lendingCashAdjust - fees,
                         max(0, yourMoney - carriedForward - stillInBank)
                       )
                       Personal plan top-up uses NPR 1,000/mo while personal recovery debt > 0.
bankPile             = max(0, carriedForward + bankIncome - bankExpenses - bankFees + lendingCashAdjust + foundInBankThisPeriod + movesIntoBank - movesOutOfBank)
                       Only transactions whose wallet is Bank count. eSewa / Cash income and spending change that wallet's own balance.
                       If a wallet cannot cover a spend, the shortfall is saved as a Bank → wallet move.
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
