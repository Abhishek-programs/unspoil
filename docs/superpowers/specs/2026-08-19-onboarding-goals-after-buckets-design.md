# Onboarding: buckets first, then goal split

**Date:** 2026-08-19  
**Status:** Implemented  
**App:** SpendSense (manual-entry V1)

---

## Problem

Onboarding asks for **goal details** (name, target, date, payment) *before* the user has allocated take-home. Bucket Builder then mixes those goal buckets into savings. Users want to set **normal buckets first**, reserve one monthly line for goals, then name/split that money.

## Goals

- Wizard order: **Foundations → Bucket Builder → Goals → Balances**.
- Bucket Builder has a single **Saving towards goal** monthly NPR line (a pool).
- The next screen is where they specify **one or more goals** that **split that pool**.
- Take-home meter and SIP/Shares leftover use the pool amount, not per-goal buckets, at the bucket step.

## Non-goals (this pass)

- Changing Home / Vault / Settings goal editing beyond what onboarding creates.
- Letting the Goals pace slider change the **total** monthly (that would break the bucket step).
- Requiring goals when the pool is 0.

---

## 1. Wizard order

| From | Next |
|------|------|
| Foundations | Bucket Builder (`/onboarding/buckets`) |
| Bucket Builder | Goals (`/onboarding/goals`) |
| Goals | Balances (`/onboarding/balances`) |

Back chevron uses the reverse stack (already true with Expo Router).

---

## 2. Saving towards goal (Bucket Builder)

### Data

- Seed a real savings bucket: id `goal-pool`, name **Saving towards goal**, icon `🎯`, type `savings`.
- Not non-removable like Core Living / EF (user can set monthly to 0).
- Default monthly: **0** (leftover still suggests SIP/Shares after Core + EF + spending).

### UI

Under **Savings & investments**, order:

1. Emergency Fund (locked, as today)
2. **Saving towards goal** (editable monthly, same row chrome as SIP)
3. SIPs
4. Direct Shares

**Do not** show per-goal groups or goal-linked buckets on this screen.

### Allocation

`allocated` includes the pool monthly when the row is active. SIP/Shares leftover suggestion:

`take-home − Core − EF − other spending − goal pool`

Same ratio split as today.

---

## 3. Goals screen (split the pool)

### Header

Show the committed pool: **NPR {pool}/mo to split**. If pool is 0, copy: **No monthly set aside — you can skip or add goals with NPR 0/mo.**

### Default

One enabled draft (MacBook defaults as today) whose monthly share is **100% of the pool**.

**Add another big purchase** (max 5). New drafts start enabled with **NPR 0**; user must move money from other goals so the total still matches.

### Split rule

Let `S` = sum of `monthlyContribution` for **enabled** drafts with a name and target > 0.

- **Continue** enabled only when `S === pool` (integer NPR).
- Show remaining: `pool − S` (green when 0, amber/red when over or under).
- Disabled drafts do not count toward `S`.
- Pace slider **redistributes nothing at the total**; it must not change the pool. Per-goal monthly is the **share of the pool** (editable NPR). Target date is **projected** from that share (existing `projectDateFromMonthly`). Hide or disable “Apply new pace” when it would change the goal’s monthly away from the share (pace that only moves the date via extra savings is out of scope here).

### Upfront / EMI

Existing payment-mode UI. That goal’s **share** is the `totalMonthly` passed into `computeGoalPlan`. Upfront vs EMI buckets still split *that share*, not extra take-home.

### Pool 0 / skip

- User can disable all goals or leave drafts invalid and tap Continue.
- No goal rows created. Pool bucket stays at 0 (or whatever they set; 0 is skip).

### Save (Continue)

1. `clearAllGoalsForOnboarding()` (back-nav safe).
2. Create each valid enabled goal via `createGoalWithBuckets` with `monthlyContribution` = that draft’s share.
3. Set pool bucket `monthlyAmount` to **0** and `isActive: false` so playbook does not double-count (goal-linked buckets now hold the money).
4. `loadBuckets` + `loadGoals`, then `/onboarding/balances`.

### Back to Bucket Builder

Pool amount is whatever they last saved on the bucket step (goals Continue is the only place that deactivates the pool). If they had already continued past Goals once, back then Next again must not duplicate goals (`clearAllGoalsForOnboarding` already handles this).

If they **increase/decrease the pool** after creating goals, then go Next: Goals screen reloads drafts from scratch (same as today: local drafts, not hydrated from DB) — acceptable. Optional later: hydrate from existing goals.

---

## 4. Files (implementation)

| File | Change |
|------|--------|
| `constants/defaults.ts` | `GOAL_POOL_BUCKET_ID`, seed row |
| `db/seed.ts` | picks up `DEFAULT_BUCKETS` |
| `app/onboarding/foundations.tsx` | push buckets, not goals |
| `app/onboarding/buckets.tsx` | pool row; drop goal groups; next → goals |
| `app/onboarding/goals.tsx` | split UI; next → balances; no bucket leftover math |
| `app/onboarding/_layout.tsx` | order unchanged (named screens) |
| `AGENTS.md` / `BUILD_ORDER.md` / `docs/design-and-features.md` | wizard order copy |

Existing users: `onConflictDoNothing` seed will **not** add the pool bucket. Onboarding Bucket Builder should **ensure** the pool bucket exists (insert if missing) so first-run after update still works.

---

## 5. Out of scope leftovers

- Generic leftover pool bucket after a *partial* split — **not allowed**; Continue requires exact sum.
- Settings auto-creating the pool for already-onboarded users who never see the wizard — skip unless they open Bucket-like settings; they can add a savings bucket manually.
