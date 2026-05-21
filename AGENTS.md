# AGENTS.md

Mölkky Scores is a React Native / Expo app for scoring the Finnish lawn game Mölkky. Players use it in the field — often on grass, in the sun, with poor cell reception — to track turns, scores, and eliminations across a game. It was previously built on AWS Amplify and has since been migrated to Firebase.

## Tech stack

- Expo SDK 53 (upgrade to 55 in progress), `expo-router` v5 (file-based routing under `app/`)
- React Native 0.79, React 19, TypeScript (strict)
- Firebase v11 — Auth (with AsyncStorage persistence) + Firestore, initialized in `lib/firebase.ts`
- `react-native-paper` (MD3) for UI primitives; themes live in `constants/Colors.ts`
- `react-native-reanimated` for animation
- `@react-native-async-storage/async-storage` for local persistence
- Entry point is `expo-router/entry` (set in `package.json`); root layout is `app/_layout.tsx`

## Path alias

- `@/*` resolves to the repo root (see `tsconfig.json`). Always import as `@/components/Button`, `@/services/games`, etc. Do not use relative `../../` paths.

## File structure conventions

- `app/` — expo-router routes. `app/_layout.tsx` wraps the app in `PaperProvider` + `AuthProvider`. Tab screens live in `app/(tabs)/` (`index.tsx`, `rules.tsx`, `stats.tsx`).
- `components/` — reusable UI primitives (`Button`, `Text`, `Modal`, `TextInput`, etc.). Mostly thin wrappers around `react-native-paper`. Mix of `.tsx` and legacy `.js`.
- `containers/` — screen-level composed views with business logic (`GameBoard.js`, `NewGameModal.tsx`, `AuthModal.js`, `PlayerStatus.js`). Style files colocated as `*Styles.js`.
- `contexts/` — React Contexts. `AuthContext.tsx` owns the Firebase auth subscription and exposes `user`, `signIn`, `signUp`, `signOut`, `addFriends`.
- `services/` — data layer. `games.js`, `users.js`, `auth.js` wrap Firestore/Auth calls. All Firestore access should go through here, not directly from components.
- `hooks/` — custom hooks (`useColorScheme`, `useDeviceDimensions`, `useReusableStyles`, `useThemeColor`).
- `lib/` — third-party client initialization. Currently just `firebase.ts` (exports `auth` and `db`).
- `constants/` — `Colors.ts` (light/dark Paper themes), `Typography.js`, `firebaseConfig.js`.
- `assets/` — fonts and images.

## How to run

- `npm start` — start Expo dev server (uses `--dev-client`)
- `npm run ios` — `expo run:ios`
- `npm run android` — `expo run:android`
- `npm run web` — web build via Metro
- `npm run lint` — `expo lint`
- `npm test` — Jest (jest-expo preset)

## CRITICAL RULES

1. **Do not modify the scoring engine.** The game logic in `containers/GameBoard.js` is correct and battle-tested. Specifically, `logScore`, `undoTurn`, `skipTurn`, `getNextPlayerId`, and `checkForWinByElimination` are sacred — do not change their behavior, signatures, or the way they mutate `scores`, `turns`, `whichPlayersTurn`, `gameRound`, `isOut`, `timesOver`, or `misses`. If something looks wrong, ask first.
2. **Offline-first.** Local state is the source of truth during a game. Never block UI on a network call. Firebase is for backup/sync only — writes happen in the background, and the user must be able to keep scoring even with no connection. Players are in fields with poor reception; that is the primary use case.
3. **Guest play is allowed.** Login is optional. When the user is not signed in, the app must still be playable, and the UI must clearly indicate that data is not being backed up. Signing in triggers cloud sync.
4. **Use `@/` imports.** No relative `../../` paths.
5. **No AWS / Amplify.** Amplify has been removed and replaced with Firebase. Do not introduce `aws-amplify`, `@aws-amplify/*`, `aws-exports`, or any Amplify-shaped APIs. The leftover `amplify/` and `src/` directories are legacy and slated for deletion — do not add to them.

## Game domain glossary

- **turn** — one player's throw. Recorded as an entry in `turns` with the score logged (0–12).
- **round** — one full pass through all active (non-eliminated) players. Tracked as `gameRound`.
- **whichPlayersTurn** — the `playerId` of the player currently up.
- **winningScore** — the target score (default 50), from `rules.winningScore`.
- **goBackToScore** — penalty score a player drops to when they exceed `winningScore` (default 25), from `rules.goBackToScore`.
- **timesOver** — count of times a player has gone over `winningScore` and been sent back to `goBackToScore`. Three times over eliminates them.
- **misses** — count of consecutive 0-score turns. Three in a row eliminates the player.
- **isOut** — boolean on a player's `scores` entry; `true` means eliminated. `getNextPlayerId` skips eliminated players.
- **scores** — array of per-player score state: `{ playerId, score, misses, timesOver, isOut }`.
- **gameStatus** — one of `inProgress`, `finished`, `abandoned`.
- **winningPlayerId** — set when someone hits `winningScore` exactly, or when `checkForWinByElimination` finds only one player left standing.
