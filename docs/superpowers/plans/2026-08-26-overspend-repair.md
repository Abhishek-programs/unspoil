# Overspend repair Implementation Plan

> **For agentic workers:** Implement task-by-task. No new test framework (V1).

**Goal:** Double-red overspend bars, Living priority reallocate (cut lower ceilings), Personal 1000/mo recovery + Settings reset.

**Architecture:** Playbook fields for Personal debt; `lib/living-reallocate.ts` for cut math; LivingSection UI + sheet; rollover applies recovery top-up.

**Tech Stack:** Expo RN, Zustand, Drizzle/SQLite patches.

## Tasks

- [ ] Schema patches: `personal_recovery_debt`, `personal_normal_top_up`
- [ ] ProgressBar darkRed + LivingSection double-red / over labels
- [ ] `lib/living-reallocate.ts` + ReallocateSheet + Living header icon
- [ ] Personal recovery on overspend + `runMonthRollover` + Settings reset
