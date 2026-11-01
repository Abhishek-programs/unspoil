# Google Play store listing — copy & assets

Use **default language: English (United States)** or **English** as offered in Play Console. Privacy policy: https://bhattaraiabhishek.com.np/apps/unspoil/privacy

---

## App name (30 chars max)

```
UnSpoil
```

---

## Short description (80 chars max)

```
Track spending and savings. Know what's safe to spend each month. No account.
```

*(76 characters)*

**Alternate:**

```
Manual budget app — multi-currency, Nepal-friendly. Safe to spend on your phone.
```

*(78 characters)*

---

## Full description (4000 chars max)

```
UnSpoil is a personal finance playbook for your phone—multi-currency, with Nepal and NPR in mind (eSewa-friendly payment helper), and works anywhere you set your currency.

Plan your monthly take-home across spending buckets, savings, and goals. Log expenses and income manually—no bank login or automatic sync. See what's safe to spend after salary lands, and keep lent & borrowed separate from your budget. No sign-in, no cloud sync: your data stays on your device.

WHY UNSPOIL
• Playbook-first — income split across buckets you define (Core Living, Personal, EF, SIP, goals, and more)
• Safe to spend — a clear number on Home once salary is confirmed this month
• Your money — bank pile plus wallets you define (e.g. eSewa, Cash)
• Living & Future — track spending ceilings and monthly savings/investment check-offs
• Goals & Vault — targets with progress; archive when done
• Lent & borrowed — person ledger with settle-up (not mixed into bucket spend)
• Month rhythm — start-of-month checklist, optional early salary when pay arrives before your start day
• Nudges — optional local reminders (budget, savings, EF), max one per day

OPTIONAL (YOU CHOOSE)
• Payment helper — pick apps like eSewa or nBank; get a prompt to log amounts while you pay (usage access + notifications; no screenshots or accessibility scraping)
• Export / import backup — JSON for reinstall or new phone; optional nightly auto-backup on device (last 3 files)
• CSV export for your own analysis

PRIVACY
UnSpoil does not require an account and does not upload your financial data to our servers. See the privacy policy link on this listing.

UnSpoil is for people who want structure without linking bank accounts or ads—just your plan, your numbers, and honest safe-to-spend math.

Questions or feedback: i.abhishek.bhattarai@gmail.com
```

---

## Visual assets checklist

| Asset | Spec | File in repo |
|--------|------|----------------|
| **App icon** | PNG/JPEG, 512×512, ≤1 MB | `docs/play-store-assets/app-icon-512.png` (from `assets/icon.png`) |
| **Feature graphic** | PNG/JPEG, 1024×500, ≤15 MB | `feature-graphic-1024x500.jpg` |
| **Phone screenshots** | 2–8 files, 9:16; **1080×2340** (status bar hidden) | `screenshot-01-home.png` … `04-settings.png` |

Re-capture main app (physical phone): `./capture-screenshots.sh [device-id]`

Onboarding (emulator, clean install): `./capture-onboarding-emulator.sh [emulator-5554]` → `screenshots/onboarding-01-welcome.png` … `07-balances.png`

### Suggested screenshots (1080×1920 or 1080×2340 portrait)

1. **Home** — Hero ring + Your money + Living (safe to spend visible if possible)
2. **Transactions** — list + chart tab if available
3. **Goals / Vault**
4. **Settings** — playbook / buckets (shows seriousness)
5. *(Optional)* Manual entry sheet (+ FAB flow)
6. *(Optional)* Nudges & payment helper settings
7. *(Optional)* Lending list
8. *(Optional)* Month-start checklist

Capture on a **release** build with realistic (non-sensitive) demo data. Android Studio device frame optional.

### Feature graphic (1024×500)

Play Store banner—not the same as the app icon. Include:

- App name **UnSpoil**
- Tagline e.g. “Know what’s safe to spend” or “Multi-currency, manual budget”
- Brand green `#16A34A`, light background `#F7F8FA`, Inter or similar clean type
- Optional: simple ring or phone mockup

Export PNG and upload as **Feature graphic**.

### Video

Optional. Leave blank unless you record a short demo and upload **public or unlisted** YouTube with ads off.

---

## Play Console quick fields

| Field | Value |
|--------|--------|
| App name | UnSpoil |
| **Category** | **Finance** → subcategory **Budgeting** or **Money management** (manual entry / expense tracker; **no bank linking**, no payments) |
| Tags / description tone | Say **manual**, **on-device**, **no bank login** so users are not expecting Plaid-style sync |
| Privacy policy | https://bhattaraiabhishek.com.np/apps/unspoil/privacy |
| Ads | No |
| Contains ads | No |

**Is it still “Finance”?** Yes. Google Play’s Finance category includes budgeting and expense apps that only use manual input. You are not a bank, broker, or payment processor—declare **no financial account linking** in Data safety and store copy.

See [PLAY_STORE.md](./PLAY_STORE.md) for Data safety, content rating, and submit flow.
