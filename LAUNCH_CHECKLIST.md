# Pre-Launch Checklist

The single source of truth for shipping Mölkky Scores to the App Store. Everything
code-side is done on branch `expo55AndOffline` (uncommitted). The items below are the
steps a human with the right logins/hardware must do, roughly in order, plus the
security hardening that can't be verified from the repo alone.

Companion doc: [`BEFORE_ANDROID.md`](./BEFORE_ANDROID.md) — deferred Android work, out of
scope for the iOS launch.

**Security model:** the app is offline-first — the local store (AsyncStorage) is the
source of truth during play, and Firestore is the backup/sync target. The trust boundary
is therefore enforced **server-side by Firestore security rules**; the client is not
trusted. Console-side items (Firebase / Google Cloud / App Store Connect / AdMob) cannot
be performed or verified from the repo or CI.

**Status legend:** `[x]` done · `[ ]` not done, required before launch · ⚠️ not done, do
before public release (defense-in-depth, not a hard blocker).

---

## A. Dev machine & build

- [x] **Xcode 26.4+** — Expo SDK 56+ hard-requires it (now on 26.6, ships the iOS 26.5
      SDK; iOS device builds unblocked).
- [x] **Node 24 via nvm** is the project default (`nvm use 24`). Node 22.7.0 fails
      RN 0.86's engine check.
- [ ] **Rebuild the dev client** — three native modules now require a fresh binary
      (`react-native-google-mobile-ads`, `expo-iap`, and the Google-signin
      `iosUrlScheme`): `npx expo prebuild --clean -p ios` then `npx expo run:ios` (or
      `npm run ios:device`). Until then ads/purchases/Google-signin are gracefully
      unavailable.
- [ ] **Commit the branch** — everything is uncommitted, including files the build
      imports (`constants/googleSignInConfig.ts`, `lib/googleSignIn.ts`, `functions/`).
      A clean checkout won't build until these are committed.

## B. Firebase console & backend (project `molkky-scores-6ee0d`)

- [x] **Blaze plan** — required to deploy Cloud Functions (free tier is generous,
      expected cost ≈ $0; optionally set a budget alert).
- [x] **Deployed the Cloud Function then the Firestore rules** (2026-07-05, in that
      order — rules-first would strand clients with no way to record the entitlement).
      `.firebaserc` added (default project `molkky-scores-6ee0d`).
      - `validatePurchase` (`functions/src/index.ts`) is the **only** writer of
        `users/{uid}.removeAds/removeAdsInfo`: the client sends the StoreKit 2 signed
        transaction (JWS), the function verifies Apple's signature offline against the
        pinned root certs (`functions/certs/`), checks the product id and non-refund,
        then writes via the Admin SDK. The rules reject client writes to those fields, so
        a forged client can't self-grant the cloud entitlement (the on-device flag stays
        client-side by design — offline-first).
      - **What the rules enforce:** a user can only read/write `games` they own and their
        own `users/{uid}` doc; nobody can list the `users` collection (no email
        harvesting); writes are shape/size-validated (bounded players/turns/friends).
      - ⚠️ **Post-deploy watch item:** the rules enforce a `users/` key allowlist
        `[email, name, friends, createdAt, removeAds, removeAdsInfo]`. Any pre-offline
        user doc carrying a stray field gets its next full-doc write rejected —
        spot-check the `users` collection in the console if it predates the offline
        rewrite.
- [x] **Fill `APP_APPLE_ID` in `functions/src/verifiers.ts` and redeploy functions**
      (`firebase deploy --only functions`). It's the app's numeric Apple ID from App
      Store Connect → App Information → "Apple ID" (see §C). Until it's set, only
      SANDBOX/TestFlight receipts verify — **production receipts are rejected**. Fine to
      leave for TestFlight; required before the production release.
- [x] Verify (in console) the **password-reset + email-verification templates** are
      enabled and branded (Authentication → Templates), and the sender domain is
      verified. Verification isn't just hygiene: Firebase's "one account per email"
      policy strips UNVERIFIED sign-in methods when a trusted provider (Google/Apple)
      signs in with the same email — a verified password survives and the provider links
      alongside it, so users keep all their login methods. *(Mark done once confirmed.)*
- ⚠️ **Enable App Check** (defense-in-depth against non-genuine clients). The Firebase JS
      SDK has no native RN attestation provider, so iOS needs the native
      `@react-native-firebase/app-check` module (App Attest) via a config plugin +
      prebuild. **Order matters — getting it wrong locks out every client:**
      1. Register the iOS app under App Check with its attestation provider; configure
         the client.
      2. Let real traffic flow; watch App Check metrics until verified requests arrive.
      3. Turn on **enforcement** for Firestore only once traffic is healthy.
      4. **Only then** add `request.app != null` to `firestore.rules` and redeploy. Never
         add it before enforcement is live — it denies all requests.
- ⚠️ **Restrict the Firebase API key** (Google Cloud Console → APIs & Services →
      Credentials → the key for `molkky-scores-6ee0d`). The key is a public identifier
      (safe to ship) but currently unrestricted: add an iOS app restriction (bundle
      `com.connortyrrell.molkky`) and limit API restrictions to the Firebase APIs the app
      uses. Complements App Check but is independent — do both.

## C. Auth providers

- [x] **Sign in with Apple enabled** (Authentication → Sign-in method). CRITICAL: the
      button is visible in-app; a reviewer tapping it while the provider is disabled is a
      near-certain rejection. App uses the native iOS flow (`expo-apple-authentication` →
      Firebase `OAuthProvider('apple.com')`).
- [x] **Apple Services ID + OAuth code flow config filled** (Services ID, Apple Team ID
      `3E6PWBQT7M`, Key ID, `.p8` private key). Native sign-in alone doesn't need these,
      but the app **revokes the Apple token on account deletion** (Guideline 5.1.1(v),
      via Firebase `revokeAccessToken`), and revocation requires them — without them it
      fails silently (deletion proceeds, token never revoked → non-compliant). This is
      why §F still calls for verifying revocation actually succeeds.
- [ ] Apple Developer → Identifiers → `com.connortyrrell.molkky`: confirm the **Sign In
      with Apple capability** is enabled on the App ID. EAS-managed credentials add it
      automatically on the next build (the entitlement is in the app config); with manual
      signing, tick it and regenerate the provisioning profile.
- [x] **Sign in with Google enabled + configured** (2026-07-05, iOS only). Provider
      enabled in Firebase; `GOOGLE_WEB_CLIENT_ID` (…d2u2b12ug…) and `GOOGLE_IOS_CLIENT_ID`
      (…1ncnstkrhd…) filled in `constants/googleSignInConfig.ts`; reversed `iosUrlScheme`
      set in `app.json`. The button stays hidden until the Web client ID is set AND the
      native module is in the binary — so it appears after the §A rebuild. Google's iOS
      OAuth client can take 5 min–a few hours to propagate.
      - ⚠️ **Permanent once shipped:** a Google-only account can't complete account
        deletion in a build where Google sign-in is unconfigured (the reauth throws) —
        keep the Google config in place permanently after enabling.
      - Android's Google OAuth client is deferred (`BEFORE_ANDROID.md` §5).

## D. App Store Connect

- [x] **Paid Applications Agreement** signed + banking/tax started (Business section).
      IAP products return empty from StoreKit until this is *Active* — the #1 "IAP
      doesn't work" cause. (Banking can take ~24h to process.)
- [ ] **Create the app record**, then copy its numeric **Apple ID** into `APP_APPLE_ID`
      (§B) and redeploy functions.
- [ ] **Create the IAP:** Non-Consumable, product ID
      `com.connortyrrell.molkky.removeads` (immutable — check spelling), price tier
      (~$4.99), one localization, review screenshot. **Enable Family Sharing** on it (how
      a household member gets ad-free via Restore).
- [ ] **Attach the IAP** to the first app-version submission (In-App Purchases section of
      the version page) — first IAPs must ship with a version.
- [ ] **Create a sandbox tester** (Users and Access → Sandbox) and sign it into the test
      iPhone (Settings → App Store → Sandbox Account).
- [ ] **App metadata:** Support URL (`https://connortyrrell.com/contact-me/`), Privacy
      Policy URL (`https://connortyrrell.com/privacy-policy-mobile-apps/`), **privacy
      label** — mirror the in-code privacy manifest in `app.json`: email, name, user ID,
      user content linked to identity for app functionality; device ID + advertising data
      not linked, for third-party advertising; **no tracking**.
- [ ] **iPad screenshots** (app claims tablet support).
- [ ] **Verify the iOS `buildNumber`** — `app.json` has `buildNumber: "1"`. EAS remote
      versioning ignores it, but a LOCAL Xcode archive uses it, and App Store Connect
      rejects reused build numbers.

## E. AdMob console

- [ ] Create an AdMob **iOS app** + one **anchored adaptive banner** ad unit.
- [ ] Swap the real iOS App ID into `app.json` (`iosAppId`, currently Google's test ID) —
      **requires a native rebuild** — and the real unit ID into `constants/ads.ts`
      (JS-only). Keep the `__DEV__ ? TestIds…` guard as is.
- [ ] Update the privacy policy page to mention advertising/AdMob data sharing.
- [ ] Add **"Mölkky Scores"** to the privacy policy page's covered-apps list (currently
      lists only Convo Cards and Camp Conndigo).
- [ ] **EEA/UK decision:** either add the UMP consent flow (~5 lines via
      `AdsConsent.gatherConsent()`) or exclude EEA/UK from distribution. Google requires
      consent there even for non-personalized ads.

## F. Pre-submission device testing

- [ ] Tabs/navigation, haptics, reanimated animations (DraggableList especially —
      reanimated 4.5), theme switching.
- [ ] Auth: email; Apple sign-in (first-time — verify display name lands in Firestore);
      Google sign-in; link flows; account deletion (password account with Apple linked →
      expect the extra Apple sheet for token revocation).
- [ ] **Sandbox-verify Apple token revocation on account deletion actually succeeds** —
      `revokeAccessToken()` is best-effort and its docs are ambiguous about
      authorization-code vs access-token input, so a silent no-op would go unnoticed. (Now
      that the §C OAuth code flow config is filled, this should work — confirm it.)
- [ ] Offline: create games offline, sync on reconnect.
- [ ] Ads: banner shows on all tabs for a non-entitled user; last Home-list row not
      covered; banner recovers after airplane-mode launch → reconnect → foreground.
- [ ] IAP (StoreKit config file first, then sandbox): buy → ads gone instantly → relaunch
      → still gone; delete app → reinstall → Restore Purchases; buy signed-out → sign in
      → entitlement appears on the account (check Firestore doc); second device sign-in →
      ads gone; cancel mid-purchase → no error banner.
- [ ] Known deferred issue: the repo has **zero test files** (jest is configured, nothing
      to run) — worth adding some eventually.

## Known accepted risks / decisions on record

- One Apple purchase can be claimed by multiple Firebase accounts (deliberate: Family
  Sharing + comping; documented in `functions/src/index.ts`).
- Manual comp mechanism: set `removeAds: true` on any `users/{uid}` doc from the Firebase
  console — Admin access bypasses the rules, clients cannot.
- Cloud claims are iOS-only until Play verification exists (`BEFORE_ANDROID.md` §1).
