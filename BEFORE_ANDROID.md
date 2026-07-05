# Before Deploying to Android

iOS is the current priority; Android was deliberately deferred. The app *compiles* for
Android and the local (on-device) remove-ads entitlement works there, but several pieces
were intentionally left iOS-only. Work through this list before any Play Store release.

## 1. Server-side purchase validation (required — code TODO)

The `validatePurchase` Cloud Function only verifies **Apple** StoreKit 2 JWS signatures
(`functions/src/verifiers.ts`). On Android, `purchase.purchaseToken` is a **Google Play
billing token**, not a JWS — the verifier would always reject it. Because of this, cloud
claims are gated to iOS in `contexts/PurchaseContext.tsx` (search `Platform.OS !== 'ios'`,
two gates: `claimCloud` and the claim-on-sign-in effect).

To do:
- Add Play verification to `functions/src/index.ts`: accept a `platform` field, and for
  Android verify the token via the **Google Play Developer API**
  (`purchases.products.get` with `packageName: com.connortyrrell.molkky`, the product ID,
  and the token; check `purchaseState === 0`). Needs a service account with the
  "Android Publisher" role linked in Play Console → API access.
- Lift the two iOS gates in `PurchaseContext.tsx` and send the platform with the claim.
- Until then: Android buyers get local ad-removal only — no cross-device sync, and the
  entitlement doesn't survive reinstall+sign-in on a different device.

## 2. Transaction acknowledgment (verify on device)

Google auto-refunds purchases not acknowledged within **3 days**. `finishTransaction` is
called on both the purchase path and the restore path (this was a fixed review finding —
`contexts/PurchaseContext.tsx`), but it has never been exercised against real Play
billing. Test: buy with a license tester, kill the app mid-flow, relaunch, restore, and
confirm acknowledgment in Play Console.

## 3. Google Play Console setup

- Create the app (`com.connortyrrell.molkky`), complete the store listing.
- Create the **in-app product** with the *same* product ID:
  `com.connortyrrell.molkky.removeads` (one-time / managed product).
- Products only become purchasable after a build is uploaded to a testing track.
- Add **license testers** (Play Console → Settings → License testing).
- **Data safety form** (Play's version of Apple's privacy label): declare email, name,
  user ID, user content (games/friends), and advertising identifiers/data for AdMob.
- **Account deletion web URL**: Google Play *requires* a URL where users can request
  account deletion for apps that support account creation. In-app deletion exists, but
  the web URL must also be provided in the Data safety form.

## 4. AdMob (Android side)

- Create an **Android app** in the AdMob console (separate from the iOS one) and a banner
  ad unit for it.
- Swap the Android test App ID in `app.json` (`androidAppId`, currently Google's test ID
  `ca-app-pub-3940256099942544~3347511713`) — requires a native rebuild.
- Swap the Android banner unit ID in `constants/ads.ts`.

## 5. Google Sign-In on Android

- Register the app's **SHA-1 and SHA-256 fingerprints** (from the EAS/upload keystore) in
  Firebase console → Project settings → Android app, or Google Cloud OAuth credentials.
- `GOOGLE_WEB_CLIENT_ID` in `constants/googleSignInConfig.ts` must be filled (the button
  stays hidden until it is).
- Enable the Google provider in Firebase console → Authentication.

## 6. Platform QA specific to this codebase

- **Banner insets**: on Android the tab bar is in normal layout flow (iOS floats it) —
  verify `useBottomContentInset` produces correct padding on all four scrollable
  surfaces (Home history list, Stats, Rules, GameBoard).
- **Memory regression**: RN 0.85+/Hermes V1 has a known ~25–30% Android memory increase
  when reanimated is imported (listed in the Expo SDK 56/57 changelogs). Profile on a
  low-end device; the workaround is worklets bundle mode.
- **Edge-to-edge**: RN 0.86 tweaked Android edge-to-edge behavior — check status bar /
  keyboard (`softwareKeyboardLayoutMode: pan` in app.json) interactions.
- Full smoke: auth (Google + email), Firestore sync, IAP with a license tester, banner
  fill, share/export.

## 7. Consent (if distributing in EEA/UK on Play)

Google requires a certified UMP consent flow even for non-personalized ads. Not
implemented — see the same item in `LAUNCH_CHECKLIST.md`; it applies doubly on Android.
