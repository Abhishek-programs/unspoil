# Your money — cash on you vs net worth

**Date:** 2026-08-19  
**Status:** Implemented  
**App:** SpendSense

## Problem

Playbook Future amounts (EF, goals, SIP, shares) are subtracted from leftover income, so they are **not** in Safe to spend. They are also **not** in Net worth until the user ticks Future (`__savings_confirm__`). That cash is still on the user and disappeared from Home.

## Mental model

**Your money** = cash on you right now.  
**Net worth** = money you have allocated (confirmed into EF / goals / SIP / shares).

Confirming a Future row **moves** that amount: Your money down, net worth up. No double count.

## Formulas

Unchanged:

```
unallocatedAtStart   = max(0, effectiveIncome - totalAllocations)
safeToSpend          = spendingPlan - lifestyleSpent - personalDraws + unallocatedAtStart
                       (+ lend/borrow cash adjust)
                       0 until salary confirmed this month
```

New:

```
stillInBank          = salary confirmed
                         ? max(0, plannedSavings - confirmedSavedInvested this month)
                         : 0
yourMoney            = max(0, safeToSpend) + carriedForward + stillInBank
```

`plannedSavings` = active savings + investment bucket monthlies (same as Future checklist).

## UI — Your money card

**Collapsed:** NPR `yourMoney`. Subtitle mentions still-in-bank if > 0, else carried forward if > 0, else “Available this month”.

**Expanded:**

1. Remaining this month (`max(0, safeToSpend)`) — rolls forward at month end  
2. Carried forward (if > 0)  
3. Not yet confirmed · still in bank (if `stillInBank` > 0)  
4. Net worth — confirmed EF / goals / SIP / shares only (unchanged)

## Out of scope

- Ring / Safe to spend formula  
- Treating unconfirmed Future as spendable  
- Bank sync  
- Putting confirmed savings into the collapsed Your money number  
