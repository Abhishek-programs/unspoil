# Early Salary Month Start Implementation Plan

> **For agentic workers:** Implement task-by-task and verify each shared month calculation before wiring UI.

**Goal:** Allow an explicit early salary action to start the next playbook period immediately without changing the configured month start day.

**Architecture:** Persist one early-start date in playbook. Centralize current/previous range and period-key calculation in `lib/month.ts`, then pass that override through loading and rollover paths. Home owns the confirmed action and reuses existing salary, transaction, lending, bucket, and playbook stores.

## Constraints

- Early window is 7 days before `month_start_day`.
- Current period must already have a salary.
- Old period ends yesterday; new period starts today.
- New period ends the day before next month’s configured boundary.
- No prorating or late-pay changes.
- No new dependency or backend.

### Task 1: Month range model

- [ ] Add `earlyMonthStartDate` to playbook schema, migration, fallback patch, and Zustand persistence.
- [ ] Extend `getMonthRange`, `getDaysRemaining`, and period-key helpers for an active/expired early override.
- [ ] Add previous-period range calculation that returns old normal start→yesterday when triggering, and early start→regular end at the following rollover.

### Task 2: Rollover integration

- [ ] Pass override into bucket and cash rollover.
- [ ] Keep normal period keys backward compatible; use a unique early key.
- [ ] Update root hydration/resume transaction and lending ranges.
- [ ] Clear an expired override only after following-boundary rollover has used it.

### Task 3: Home action

- [ ] Add floating `Paid early?` Hero pill in the 7-day window.
- [ ] Confirm with concise consequences and configured day.
- [ ] Roll old cash, activate early period, top up Personal, reload ranges, and add salary.
- [ ] Prevent duplicate taps and hide the action once active.

### Task 4: Verification and docs

- [ ] Update core/design docs.
- [ ] Run `npx tsc --noEmit`.
- [ ] Check modified-file lints.
- [ ] Run Android Expo export.
