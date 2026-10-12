# Money accounts Implementation Plan

> **For agentic workers:** Implement task-by-task. No new test framework (V1).

**Goal:** Bank / eSewa / Cash split synced to Your money, optional account on income/expense, Settings add/move, Personal spent bar on Home.

**Architecture:** `accounts` balances + `account_transfers` + `account_adjustments`; `transactions.account_id`; debit with Bank fallback; reconcile Bank to Your money.

**Tech Stack:** Expo SQLite / Drizzle, Zustand, existing Home / Manual entry / Settings.

## Tasks

- [ ] Schema + patches + defaults
- [ ] `lib/accounts.ts` + `store/accounts.ts`
- [ ] Wire transactions / yourMoney found money / reconcile
- [ ] Manual entry chips + payment watch account_id
- [ ] NetWorthCard + Settings Money locations
- [ ] LivingSection Personal spent bar
