# EAS setup

UnSpoil is linked to Expo account **`abhishekprograms`** → **@abhishekprograms/unspoil**.

`app.json`:

```json
"owner": "abhishekprograms",
"slug": "unspoil"
```

## One-time (new machine or clone)

1. Install deps (includes **eas-cli** locally — no global `eas` required):
   ```bash
   npm install
   ```
2. Log in:
   ```bash
   npm exec eas-cli login
   npm exec eas-cli whoami
   ```
   Expect **`abhishekprograms`**.

   Or without npm scripts: `npx eas-cli login` / `npx eas-cli whoami`.
3. If the project is not linked yet:
   ```bash
   npm exec eas-cli init -- --account abhishekprograms
   npm exec eas-cli update:configure
   ```
4. Optional: mirror the project UUID in `.env` as `EAS_PROJECT_ID` — `app.config.js` can override `app.json` at build time.

Verify:

```bash
npm exec eas-cli project:info
# fullName  @abhishekprograms/unspoil
```

## Builds & submit

```bash
npm run eas:build:android:production
npm run eas:submit:android
```

See [PLAY_STORE.md](./PLAY_STORE.md) for Google Play Console steps.
