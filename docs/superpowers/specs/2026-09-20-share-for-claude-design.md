# Share for Claude (on-demand local snapshot)

**Date:** 2026-09-20  
**Status:** Approved for implementation  
**App:** SpendSense

## Problem

The user wants to ask Claude (or another AI) about SpendSense history without turning the app into a cloud product. SpendSense stays on-device: no backend, no auth, no connector listing. Data leaves the phone only when the user taps share.

Settings **Export CSV** only previews this period’s transactions in an alert. It does not share a file and it does not include playbook, wallets, lending, or goals.

## Non-goals

- Claude Connectors directory, remote MCP, OAuth, or any hosted server
- In-app AI chat
- Cloud sync or backup
- Replacing or removing Export CSV
- Auto-upload, scheduled export, or background share
- JSON format (markdown file is enough; switch later if the file gets huge)

## What the user does

Settings → Data → **Share for Claude**

Helper: *Stays on this phone until you share.*

On tap:

1. Build a markdown snapshot of everything Claude needs (see below).
2. Copy a **short** prompt to the clipboard (never the dump).
3. Open the Android share sheet with `spendsense-YYYY-MM-DD.md` (local date).
4. Toast / brief alert: *Prompt copied. Attach the file in Claude.*

If share is cancelled, the prompt is still on the clipboard. If building the file fails, show an alert and do not pretend it worked.

Export CSV stays on the same Data card, unchanged.

## File (markdown)

Readable dump, not a raw SQLite dump. NPR throughout. Skip recurring drafts.

### Now

- Your money, Bank, eSewa, Cash
- Carried forward
- This playbook period (start–end, including early start if active)
- This period income, expenses, fees, lending cash adjust, found money (exclude `Income` / `Income reversed` shadows)

Numbers must use the same formulas as Home (`computeCashOnHand`, `periodCashFromTransactions`, `computeMonthMetrics`, `foundMoneyInRange`, `getMonthRange`). Do not invent or hardcode balances.

### Playbook

Monthly income, month start day, early start date, EF floor, EF start, carry, name/age if set.

### Buckets

Name, type, monthly amount, active, spent this period (expenses to that bucket, including funded-from savings confirms where Home counts them).

### Transactions

All non-draft rows, oldest first: local date, type, amount, fee, title, bucket name, account name, remarks. One-line note that `__salary__` and `__savings_confirm__` are internal tags, not spending categories.

### Lending

Each visible person: name, current balance, direction. Then every entry: date, person, type, amount, note.

### Goals

Name, target, monthly, current (start + lifetime `__savings_confirm__` on linked buckets), completed or not.

### Keywords / sure-shot

Keyword → bucket and sure-shot merchant → bucket, so Claude can explain categorization.

## Clipboard prompt

Fixed short text (not the dump):

> This is a SpendSense snapshot from my phone. All money is NPR. Attach/read the markdown. Playbook month may not be a calendar month. Your money = carry + this period’s cash flow. Safe to spend is this month’s plan after salary, not the bank pile. Answer from the file only.

## Architecture

| Piece | Responsibility |
|---|---|
| `lib/claude-snapshot.ts` | Pure builder: stores/DB in → markdown string + filename. No UI. |
| Settings Data card | Button, clipboard, write cache file, share sheet |
| Expo modules | `expo-clipboard`, `expo-file-system`, `expo-sharing` (SDK 54) |

Snapshot reads current Zustand/DB state (all transactions, all lending entries, accounts, playbook, buckets, goals). Computed “Now” block calls the same lib functions Home uses.

Write the `.md` under the app cache directory, then `Sharing.shareAsync`. Do not keep a user-visible Documents copy unless share needs a file URI.

No new tables. No network.

## Privacy

Share is explicit. The file includes full local history (names, amounts, merchants). The UI must say it stays on the phone until they share. No analytics.

## Verification

- Typecheck.
- Tap Share for Claude: prompt is on the clipboard; share sheet offers a `.md` file.
- File contains Now / playbook / buckets / all txns / lending / goals.
- Recurring drafts omitted. Income-shadow adjustments omitted from found money.
- Bank / Your money in the file match Home.
- Cancel share → prompt still copied; no error.
- Export CSV still only previews transactions.
