# No-salary month, borrow repayment plans, real net worth

Status: building (2026-11-21)

## Why

Everything in UnSpoil started from the salary entry. A month without salary (job loss, a break between jobs, a late employer) showed Safe to spend as "—" and locked the plan. Lending and debt repayments were also taken straight off the month's plan, even when Your money had plenty of money nobody had planned for.

## 1. Safe to spend: the Free pile

Three piles:

| Pile | Meaning |
|---|---|
| **Plan** | Living + Personal ceilings left this month (+ unallocated salary), minus fees |
| **Set aside** | Future not yet confirmed + debt repayments due this month |
| **Free** | Everything else in Your money: carry, windfalls, money nobody planned for |

```
cashAvailable = yourMoney − setAside
safeToSpend   = min(plan, cashAvailable)      (0 when the month is not funded)
free          = max(0, cashAvailable − plan)
```

- Lend, borrow and settle move Your money only. They are no longer added to or taken off the plan.
- So lending and repayments come out of Free first. Only once Free is empty does Safe to spend fall.
- Borrowed money raises Your money, but it raises Safe to spend only when cash was short of the plan. Borrowed money is not budget.
- Carry is part of Free. It is still never handed out as plan.

## 2. No-salary month (one toggle)

Settings → No-salary month, also offered from the month checklist and from a Home banner when salary is 3+ days late.

When on (it stays on across months until turned off):

- The month counts as funded without a salary entry. The plan is the **kept** buckets only:
  - Spending buckets: only the kept ones keep their ceiling. Others show "paused" and have a 0 ceiling, so spending there comes out of Core Living's money.
  - Personal: tops up only if kept (month rollover skips its top-up otherwise).
  - Future buckets (EF, SIP, shares, goals): paused unless kept. Paused ones leave the checklist, and Future shows "Paused".
  - Unallocated salary = 0.
- Default kept: Core Living. The user can keep any others (for example SIP).
- The plan is paid out of Free each month. No fake income row is written.
- **Runway** = cashAvailable ÷ monthly survival cost (kept ceilings + kept Personal top-up + kept Future + repayment plans), plus EF when EF backup is on.
- **EF backup** setting (default on): when Free can't cover next month, Home offers a one-tap "Move from Emergency Fund" (one month of survival cost, at most the EF balance). It is logged as an income on `_goal_return` funded from the EF bucket, so the EF balance and net worth drop and Your money rises. Nothing moves without the tap.
- **Gentle nudge:** after spending in a paused bucket, Home shows a calm, dismissible line ("Fun took 1,200 this month. Core Living first while salary is paused."). It comes back only after new paused-bucket spending.
- Turning it off goes back to salary-funded months. A salary logged while it is on is kept as income, but the plan stays the survival plan until the toggle is off.

Stored as JSON in `playbook.no_salary_json`.

## 3. Borrow repayment plan

- Logging a borrow can set "Pay back per month". It is stored per person (`contacts.repay_monthly`), because settlements are per person.
- Due this month for a person = min(monthly, what you owed them at period start) − repayments paid to them this period, floored at 0. A borrow made this month starts repaying next month.
- What's due is **set aside** (it lowers cashAvailable until paid), shows in the month checklist as "Pay back <name>" (a tap logs the settle), and shows on the Lent & borrowed row.
- The person's page can edit or clear the plan.
- Lending has no plan.

## 4. Net worth

```
netWorth = savings (EF + goals + SIP + shares) + yourMoney − youOwe
```

Money lent out is **not** counted until it comes back. It shows below as "Owed to you (not counted)".

Runway also shows in the expanded Your money card in normal months: "If income stopped: ~N months on Core Living".
