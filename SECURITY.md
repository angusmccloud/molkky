# Production security & launch checklist

This app is offline-first: the local store (AsyncStorage) is the source of truth
during play, and Firestore is the backup/sync target. The trust boundary is
therefore enforced **server-side by Firestore security rules** — the client is
not trusted.

> **Status legend:** ❌ NOT DONE (blocks launch) · ⚠️ NOT DONE (do before public
> release) · ✅ DONE (in code; still verify in console). Items below marked ❌/⚠️
> require a human with access to the Firebase / Google Cloud console — they
> **cannot** be performed or verified from the repo or CI alone.

## 1. Deploy the Firestore security rules + indexes — ❌ NOT DONE (REQUIRED before launch)

**Until this is deployed, the production database is wide open** — any
authenticated (or, depending on console defaults, any) client can read/write
everything. This is the single most important pre-launch item.

`firestore.rules`, `firestore.indexes.json`, and `firebase.json` are **new and
untracked in git** (`git ls-files` returns nothing for them), and `firebase-tools`
is not installed in this environment, so there is **no evidence the rules have
ever been deployed**. Assume they have NOT been until someone confirms the
deployed ruleset in the console matches `firestore.rules`. Deploy status cannot
be determined from this repo — it must be checked in the Firebase Console
(Firestore → Rules tab shows the live ruleset and its publish timestamp).

Exact steps (order matters — `use` selects the right project before deploying):

```bash
# 1. one-time: install the CLI and authenticate as a project owner/editor
npm install -g firebase-tools
firebase login

# 2. select the project (projectId from constants/firebaseConfig.js)
firebase use molkky-scores-6ee0d

# 3. (recommended) lint/dry-run the rules without publishing
#    Just open them; deploy is the publishing step below.

# 4. deploy rules AND indexes together
firebase deploy --only firestore:rules,firestore:indexes
```

After deploying, confirm in Firebase Console → Firestore → Rules that the live
ruleset matches `firestore.rules` and that the publish timestamp is recent.

What the rules enforce:
- A user can only read/write `games` they own (`resource.data.uid == auth.uid`).
- A user can only read/write their own `users/{uid}` document.
- Nobody can list the `users` collection (no email harvesting).
- Writes are shape/size validated (bounded players/turns/friends) so a
  compromised client can't store arbitrary or unbounded data.

**Follow-up:** commit `firestore.rules`, `firestore.indexes.json`, and
`firebase.json` to git so the deployed config is version-controlled and
reviewable. (They are currently untracked.)

## 2. Enable App Check — ⚠️ NOT DONE (defense-in-depth, before public release)

App Check stops abuse from clients that aren't our genuine app, even with the
public Firebase config (which is expected to be public). Note: the **Firebase
JS SDK has no native attestation provider for React Native** — its ReCaptcha
provider is web-only. So:

- **Web build:** initialize App Check with `ReCaptchaV3Provider` (JS SDK
  supports this). Requires a reCAPTCHA v3 site key from the Firebase console.
- **iOS/Android builds:** requires the native module
  `@react-native-firebase/app-check` (App Attest / DeviceCheck on iOS, Play
  Integrity on Android) added via an Expo config plugin + `expo prebuild`.
  This is a native dependency, not a JS-only change — it cannot be added without
  leaving the managed/Expo Go workflow.

**Order of operations (do NOT reorder — getting this wrong locks out every
client, including the live app):**

1. **Register each app** (web, iOS, Android) under Firebase Console → App Check
   with its attestation provider and configure the provider in the client.
2. Let real traffic flow and watch the App Check **metrics** until verified
   requests are arriving from genuine clients (avoid enforcing while most
   traffic is still "unverified" — that would mean a mass lockout).
3. **Turn on enforcement** for Firestore in the App Check console.
4. **Only after enforcement is live and healthy**, add `request.app != null`
   to `firestore.rules` and re-deploy (step 1 above). **Never add
   `request.app != null` before enforcement is on** — it would deny all
   requests, since unenforced App Check tokens aren't attached server-side.

## 3. Restrict the Firebase API key — ⚠️ NOT DONE (before public release)

The key in `constants/firebaseConfig.js` is a public identifier (safe to ship),
but it is currently **unrestricted**. Restrict it in Google Cloud Console →
APIs & Services → Credentials → (the API key for `molkky-scores-6ee0d`):
- iOS app restriction → bundle id `com.connortyrrell.molkky`
- Android app restriction → package `com.connortyrrell.molkky` + SHA-1
- API restrictions → only the Firebase APIs this app uses

Restricting the key complements App Check (#2) but is independent of it — do
both. This is a console-only change; there is nothing to deploy from the repo.

## 4. Enable the password-reset email template — ⚠️ verify in console

The in-app "Forgot Password?" flow calls Firebase `sendPasswordResetEmail`.
Confirm the template is enabled and branded in Firebase Console → Authentication
→ Templates → Password reset, and that the sender domain is verified.

## 5. Account deletion — ✅ DONE (in code)

In-app account deletion (required by the App Store and Play Store) is wired in
the user menu: it re-authenticates with the password, deletes all the user's
cloud games and their user document, deletes the Auth account, and wipes local
data on the device.
