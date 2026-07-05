# Mölkky Scores

Scorekeeping app for the Finnish throwing game [Mölkky](https://en.wikipedia.org/wiki/M%C3%B6lkky). Track turns, scores, misses, and eliminations across a game — built to work in a field with no cell reception.

## Stack

- **Expo SDK 57** with **expo-router** (file-based routing under `app/`), React Native 0.86, React 19, TypeScript
- **Firebase** Auth + Firestore, **offline-first**: local storage (AsyncStorage) is the source of truth during play; Firestore is the backup/sync target. Guest play works with no account.
- **react-native-paper** (MD3) UI, wrapped by the primitives in `components/`
- **AdMob** banner ads (`react-native-google-mobile-ads`, non-personalized) with a **remove-ads in-app purchase** (`expo-iap`)
- **Cloud Functions** under `functions/` (Node 22, TypeScript): server-side App Store receipt validation for the remove-ads purchase (`validatePurchase`). Deploy with `firebase deploy --only functions` (requires the Blaze plan; deploy the function before the Firestore rules — see `LAUNCH_CHECKLIST.md` §B).

## Development setup

Requires Node 24 (via nvm) and, for iOS, Xcode 26.4+. The app uses native modules (ads, IAP, Google/Apple sign-in), so it needs a dev client — it does not run in Expo Go.

```bash
nvm use 24
npm install
npx expo run:ios     # builds the dev client and starts Metro
```

## Scripts

- `npm start` — Expo dev server (`--dev-client`)
- `npm run tunnel` — dev server over a tunnel
- `npm run ios` / `npm run android` — native build + run
- `npm run web` — web via Metro
- `npm run lint` — `expo lint`
- `npm test` — Jest (jest-expo preset)

## More docs

- [`AGENTS.md`](./AGENTS.md) — architecture, conventions, and the critical rules (scoring engine, offline-first, guest play)
- [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) — the single pre-launch checklist: every manual step to App Store submission plus security hardening (Xcode, Firebase rules/App Check/API-key restriction, auth providers, App Store Connect, AdMob, testing)
- [`BEFORE_ANDROID.md`](./BEFORE_ANDROID.md) — deferred work required before any Google Play release
