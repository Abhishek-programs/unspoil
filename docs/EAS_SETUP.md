# EAS setup

UnSpoil is linked to Expo account **`abhishekprograms`** → **@abhishekprograms/unspoil**.

`app.json`:

```json
"owner": "abhishekprograms",
"slug": "unspoil"
```

## One-time (new machine or clone)

1. Log in:
   ```bash
   eas login
   eas whoami
   ```
   Expect **`abhishekprograms`**.
2. If the project is not linked yet:
   ```bash
   npx eas-cli@latest init --account abhishekprograms
   npx eas-cli@latest update:configure
   ```
3. Optional: mirror the project UUID in `.env` as `EAS_PROJECT_ID` — `app.config.js` can override `app.json` at build time.

Verify:

```bash
npx eas-cli@latest project:info
# fullName  @abhishekprograms/unspoil
```

## Builds & submit

```bash
npm run eas:build:android:production
npm run eas:submit:android
```

See [PLAY_STORE.md](./PLAY_STORE.md) for Google Play Console steps.
