import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  ErrorCode,
  useIAP,
  getAvailablePurchases as iapGetAvailablePurchases,
  type Purchase,
} from 'expo-iap';
import { REMOVE_ADS_SKU } from '@/constants/iap';
import { isIapAvailable } from '@/lib/iap';
import { AuthContext } from '@/contexts/AuthContext';
import {
  getEntitlements,
  setRemoveAdsEntitlement,
  subscribeToEntitlements,
  type RemoveAdsInfo,
} from '@/services/localStore';
import { validatePurchaseCloud } from '@/services/purchaseValidation';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface PurchaseContextType {
  /**
   * True when the user owns the remove-ads purchase. Local-first: hydrated
   * from the AsyncStorage entitlement flag, so it works signed-out and
   * offline; Firestore mirroring/restore happens in the background (see
   * services/backfill.ts).
   */
  adsRemoved: boolean;
  /** True when this binary can talk to the store AND the connection is up. */
  iapConnected: boolean;
  /**
   * Localized store price of the remove-ads product (e.g. "$4.99", "4,99 €").
   * Undefined until the product loads — UI must fall back to a price-less
   * label, never a hardcoded amount.
   */
  removeAdsPrice: string | undefined;
  /** User-facing purchase/restore failure, or null. Cleared via clearPurchaseMessages. */
  purchaseError: string | null;
  /** User-facing restore outcome (e.g. "no purchases found"), or null. */
  restoreMessage: string | null;
  /** True while a purchase is in flight (store sheet up / processing). */
  purchasing: boolean;
  /** True while a restore is in flight. */
  restoring: boolean;
  buyRemoveAds: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  clearPurchaseMessages: () => void;
}

const noopAsync = async () => {};

const DEFAULT_VALUE: PurchaseContextType = {
  adsRemoved: false,
  iapConnected: false,
  removeAdsPrice: undefined,
  purchaseError: null,
  restoreMessage: null,
  purchasing: false,
  restoring: false,
  buyRemoveAds: noopAsync,
  restorePurchases: noopAsync,
  clearPurchaseMessages: () => {},
};

export const PurchaseContext = createContext<PurchaseContextType>(DEFAULT_VALUE);

// ----------------------------------------------------------------------------
// Shared local-entitlement state
// ----------------------------------------------------------------------------

/**
 * Hydrate the remove-ads flag from local storage and stay subscribed to
 * changes (the login backfill can grant it from the cloud at any time).
 */
const useLocalAdsRemoved = (): [boolean, (v: boolean) => void] => {
  const [adsRemoved, setAdsRemoved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const readFlag = async () => {
      const entitlements = await getEntitlements();
      if (!cancelled) setAdsRemoved(entitlements.removeAds);
    };
    void readFlag();
    const unsub = subscribeToEntitlements(() => {
      void readFlag();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return [adsRemoved, setAdsRemoved];
};

// ----------------------------------------------------------------------------
// Provider (store-backed)
// ----------------------------------------------------------------------------

const PURCHASE_FAILED_MESSAGE =
  "The purchase couldn't be completed and you have not been charged. Please try again.";
const RESTORE_FAILED_MESSAGE =
  "Couldn't reach the store to restore purchases. Please check your connection and try again.";

const IapPurchaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const uid = authContext?.user?.uid ?? null;
  // Keep the signed-in uid in a ref: purchase callbacks are registered once
  // but must see the CURRENT auth state when a transaction lands.
  const uidRef = useRef<string | null>(null);
  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  const [adsRemoved, setAdsRemoved] = useLocalAdsRemoved();
  // Ref mirror for the availablePurchases effect below (kept in sync BEFORE
  // that effect runs — effects execute in declaration order).
  const adsRemovedRef = useRef(adsRemoved);
  useEffect(() => {
    adsRemovedRef.current = adsRemoved;
  }, [adsRemoved]);

  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Set while a user-initiated restore awaits the availablePurchases refresh,
  // so the effect below knows to report an outcome message.
  const restorePendingRef = useRef(false);

  // Last uid we already handled a cloud claim for (successful direct claim
  // OR an attempt by the claim-on-sign-in effect below). Prevents the effect
  // from hammering the Cloud Function — one attempt per uid per app session.
  const claimHandledUidRef = useRef<string | null>(null);

  /**
   * Claim the entitlement on the signed-in account's cloud doc by sending the
   * StoreKit signed transaction (JWS) to the `validatePurchase` Cloud
   * Function — the ONLY way removeAds reaches Firestore (rules reject client
   * writes). Best-effort and silent: the local flag is already granted, and
   * the claim-on-sign-in effect below self-heals a missed claim.
   *
   * iOS ONLY: on Android, purchase.purchaseToken is a Google Play billing
   * token that the Apple-only verifier would always reject — Android keeps
   * the local entitlement (works on-device), no cloud claim.
   * TODO(owner): before any Play Store launch, add Play token verification
   * to validatePurchase (Google Play Developer API) and lift this gate.
   */
  const claimCloud = useCallback(async (jws: string | null | undefined) => {
    if (Platform.OS !== 'ios') return;
    const uid = uidRef.current;
    if (!uid || !jws) return;
    // Already claimed for this account this session (e.g. the restore path
    // re-claims the same JWS grantEntitlement just sent) — skip the round-trip.
    if (claimHandledUidRef.current === uid) return;
    const ok = await validatePurchaseCloud(jws);
    if (ok) claimHandledUidRef.current = uid;
  }, []);

  /**
   * Persist the entitlement everywhere: local flag (source of truth), React
   * state, and — when signed in — a server-validated claim on the cloud doc.
   * Each step is best-effort so a persistence hiccup never blocks the others.
   */
  const grantEntitlement = useCallback(
    async (purchase: Purchase) => {
      // Record WHICH account was signed in when the purchase was granted
      // (history/debugging), and — crucially — the signed transaction (JWS,
      // iOS `purchaseToken`) so a signed-out purchase can be claimed on
      // whatever account signs in later (see the claim effect below).
      const uid = uidRef.current;
      const jws = purchase.purchaseToken ?? undefined;
      const info: RemoveAdsInfo = {
        productId: purchase.productId,
        transactionId: purchase.transactionId ?? purchase.id,
        platform: Platform.OS,
        purchasedAt: new Date(purchase.transactionDate || Date.now()).toISOString(),
        ...(uid ? { ownerUid: uid } : null),
        ...(jws ? { jws } : null),
      };
      try {
        await setRemoveAdsEntitlement(true, info);
      } catch (e) {
        console.log('[purchase] failed to persist local entitlement', e);
      }
      setAdsRemoved(true);
      // Server-validated cloud claim (no-op when signed out or no JWS; the
      // claim-on-sign-in effect below picks it up later).
      void claimCloud(jws);
    },
    [setAdsRemoved, claimCloud],
  );

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void (async () => {
        if (purchase.productId !== REMOVE_ADS_SKU) return;
        if (purchase.purchaseState !== 'purchased') {
          // e.g. Ask to Buy: leave the transaction unfinished; the store
          // replays it (through this same callback) once approved.
          setPurchasing(false);
          return;
        }
        try {
          await grantEntitlement(purchase);
        } finally {
          // ALWAYS finish, even if persistence failed — an unfinished iOS
          // transaction replays on every launch, and this provider mounts at
          // app root precisely so those replays land here and complete.
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (e) {
            console.log('[purchase] finishTransaction failed', e);
          }
          setPurchasing(false);
        }
      })();
    },
    onPurchaseError: (error) => {
      setPurchasing(false);
      if (error.code === ErrorCode.UserCancelled) return;
      console.log('[purchase] purchase error', error.code, error.message);
      setPurchaseError(PURCHASE_FAILED_MESSAGE);
    },
    onError: (error) => {
      // Non-purchase store errors (fetch/restore plumbing). Logged only —
      // user-facing messaging is handled per-action below.
      console.log('[purchase] store error', error);
    },
  });

  // In-flight guard so the connect effect, the buy path, and the foreground
  // listener below can't stack overlapping fetchProducts calls.
  const fetchingProductsRef = useRef(false);
  const loadProducts = useCallback(() => {
    if (fetchingProductsRef.current) return;
    fetchingProductsRef.current = true;
    fetchProducts({ skus: [REMOVE_ADS_SKU], type: 'in-app' })
      .catch((e) => {
        console.log('[purchase] fetchProducts failed', e);
      })
      .finally(() => {
        fetchingProductsRef.current = false;
      });
  }, [fetchProducts]);

  // Load the product (for its localized price) once connected.
  useEffect(() => {
    if (!connected) return;
    loadProducts();
  }, [connected, loadProducts]);

  // That one-shot fetch can fail (e.g. app launched offline), which would
  // leave the price missing for the whole session — retry on foreground
  // while the product list is still empty.
  useEffect(() => {
    if (!connected || products.length > 0) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadProducts();
    });
    return () => sub.remove();
  }, [connected, products.length, loadProducts]);

  // Grant from restored/owned purchases (populated by getAvailablePurchases).
  useEffect(() => {
    const owned = availablePurchases.find((p) => p.productId === REMOVE_ADS_SKU);
    if (owned && !adsRemovedRef.current) {
      void (async () => {
        await grantEntitlement(owned);
        // Mirror onPurchaseSuccess: finish the restored transaction too, or
        // the store replays it on every launch. Never let a finish hiccup
        // undo the grant — it already happened above.
        try {
          await finishTransaction({ purchase: owned, isConsumable: false });
        } catch (e) {
          console.log('[purchase] finishTransaction (restore) failed', e);
        }
        // Server-validated claim for the restored purchase (no-op when
        // signed out — grantEntitlement already claimed with the same JWS,
        // so this only matters when that call raced sign-in).
        void claimCloud(owned.purchaseToken);
      })();
    }
    if (restorePendingRef.current) {
      restorePendingRef.current = false;
      setRestoreMessage(
        owned || adsRemovedRef.current
          ? 'Purchases restored — ads are now removed.'
          : 'No previous purchases were found for this store account.',
      );
    }
  }, [availablePurchases, grantEntitlement, finishTransaction]);

  // Claim-on-sign-in: a purchase made while signed OUT is only recorded
  // locally. When an account signs in on this device and the local flag is
  // set, send the stored JWS to the validation function so the entitlement
  // follows the account (other devices then get it via the backfill
  // pull-down). At most ONE attempt per uid per session (claimHandledUidRef)
  // so a rejected/unreachable function can never cause a retry loop.
  useEffect(() => {
    // iOS only — same reason as claimCloud above: the stored token on
    // Android is a Play billing token the Apple verifier would reject.
    if (Platform.OS !== 'ios') return;
    if (!uid || !adsRemoved) return;
    if (claimHandledUidRef.current === uid) return;
    void (async () => {
      const entitlements = await getEntitlements();
      const info = entitlements.removeAdsInfo;
      let jws = info?.jws ?? null;
      if (!jws && connected) {
        // Grants recorded before the JWS was stored locally: re-fetch the
        // owned purchase from the store and persist its token for next time.
        try {
          const purchases = await iapGetAvailablePurchases();
          const owned = purchases.find((p) => p.productId === REMOVE_ADS_SKU);
          if (owned?.purchaseToken) {
            jws = owned.purchaseToken;
            await setRemoveAdsEntitlement(true, {
              productId: owned.productId,
              transactionId: owned.transactionId ?? owned.id,
              platform: Platform.OS,
              purchasedAt: new Date(owned.transactionDate || Date.now()).toISOString(),
              ...info,
              jws,
            });
          }
        } catch (e) {
          console.log('[purchase] claim-on-sign-in store lookup failed', e);
        }
      }
      if (!jws) return; // nothing to claim yet — retry when `connected` flips
      // Mark BEFORE the network call so re-renders during the await (or a
      // failure) can't queue another attempt for this uid.
      claimHandledUidRef.current = uid;
      const ok = await validatePurchaseCloud(jws);
      if (!ok) {
        console.log('[purchase] cloud claim failed — will retry next session');
      }
    })();
  }, [uid, adsRemoved, connected]);

  const removeAdsPrice = useMemo(
    () => products.find((p) => p.id === REMOVE_ADS_SKU)?.displayPrice,
    [products],
  );

  const clearPurchaseMessages = useCallback(() => {
    setPurchaseError(null);
    setRestoreMessage(null);
  }, []);

  const buyRemoveAds = useCallback(async () => {
    setPurchaseError(null);
    setRestoreMessage(null);
    setPurchasing(true);
    // If the product never loaded (e.g. the fetch on connect failed), kick a
    // re-fetch so the price shows up for next time — but don't block the
    // purchase on it: requestPurchase works by SKU alone.
    if (connected && products.length === 0) {
      loadProducts();
    }
    try {
      // v4 semantics: the result arrives via onPurchaseSuccess /
      // onPurchaseError above, NOT via this call's return value.
      await requestPurchase({
        request: {
          apple: { sku: REMOVE_ADS_SKU, quantity: 1 },
          google: { skus: [REMOVE_ADS_SKU] },
        },
        type: 'in-app',
      });
    } catch (e: any) {
      setPurchasing(false);
      if (e?.code === ErrorCode.UserCancelled) return;
      console.log('[purchase] requestPurchase failed', e);
      setPurchaseError(PURCHASE_FAILED_MESSAGE);
    }
  }, [requestPurchase, connected, products.length, loadProducts]);

  const restorePurchases = useCallback(async () => {
    setPurchaseError(null);
    setRestoreMessage(null);
    setRestoring(true);
    restorePendingRef.current = true;
    try {
      // Refreshes the hook's availablePurchases state; the effect above then
      // grants the entitlement and reports the outcome.
      await getAvailablePurchases();
    } catch (e) {
      console.log('[purchase] getAvailablePurchases failed', e);
      restorePendingRef.current = false;
      setPurchaseError(RESTORE_FAILED_MESSAGE);
    } finally {
      setRestoring(false);
    }
  }, [getAvailablePurchases]);

  const value = useMemo<PurchaseContextType>(
    () => ({
      adsRemoved,
      iapConnected: connected,
      removeAdsPrice,
      purchaseError,
      restoreMessage,
      purchasing,
      restoring,
      buyRemoveAds,
      restorePurchases,
      clearPurchaseMessages,
    }),
    [
      adsRemoved,
      connected,
      removeAdsPrice,
      purchaseError,
      restoreMessage,
      purchasing,
      restoring,
      buyRemoveAds,
      restorePurchases,
      clearPurchaseMessages,
    ],
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
};

// ----------------------------------------------------------------------------
// Provider (fallback — native IAP module not in this binary)
// ----------------------------------------------------------------------------

const UnavailablePurchaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // The entitlement still works from the local flag (and the cloud backfill
  // can grant it), so a previously-purchased user keeps their ad-free app
  // even in a build without the store module.
  const [adsRemoved] = useLocalAdsRemoved();

  const value = useMemo<PurchaseContextType>(
    () => ({ ...DEFAULT_VALUE, adsRemoved }),
    [adsRemoved],
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
};

// ----------------------------------------------------------------------------
// Public provider
// ----------------------------------------------------------------------------

export const PurchaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // isIapAvailable() is constant for the lifetime of the binary, so this
  // branch never flips between renders (no conditional-hook hazard). Mounting
  // useIAP in a binary without the native module would crash — see lib/iap.ts.
  if (!isIapAvailable()) {
    return <UnavailablePurchaseProvider>{children}</UnavailablePurchaseProvider>;
  }
  return <IapPurchaseProvider>{children}</IapPurchaseProvider>;
};
