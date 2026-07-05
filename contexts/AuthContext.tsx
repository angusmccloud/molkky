import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signUpNewUser,
  signInUser,
  signOutUser,
  signInWithApple as authSignInWithApple,
  reauthenticateWithApple,
  requestAppleAuthorizationCode,
  revokeAppleToken,
  linkAppleToCurrentUser,
  signInWithGoogle as authSignInWithGoogle,
  reauthenticateWithGoogle,
  revokeGoogleAccess,
  signOutGoogleNative,
  linkGoogleToCurrentUser,
  sendVerificationEmail,
  sendPasswordReset as authSendPasswordReset,
  reauthenticateCurrentUser,
  deleteCurrentAuthUser,
} from '@/services/auth';
import {
  getIdentity,
  getFriends as localGetFriends,
  setFriends as localSetFriends,
  clearLocalUserData,
  type Friend,
} from '@/services/localStore';
import { addFriendsLocal, removeFriendLocal, deleteUser, setUserNameCloud } from '@/services/users';
import { cloudDeleteAllUserGames } from '@/services/cloudGames';
import { runLoginBackfill } from '@/services/backfill';
import {
  getPendingCount,
  getStuckCount,
  isOnlineHint,
  processQueue,
  startSyncQueueLifecycle,
  subscribeToSyncQueue,
} from '@/services/syncQueue';
import {
  startCloudSyncLifecycle,
  subscribeToCloudData,
} from '@/services/cloudSync';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

// NOTE: this is deliberately NOT `extends FirebaseUser`. We build the context
// user by spreading a FirebaseUser into a plain object literal
// (`{ ...currentUser, ... }`), which copies only its enumerable DATA fields and
// DROPS the prototype methods (getIdToken, reload, delete, etc.). Declaring
// `extends FirebaseUser` would therefore be a lie — the type would promise
// methods that don't exist at runtime. We instead Pick exactly the FirebaseUser
// data fields that survive the spread AND are read by consumers (grepped across
// app/ components/ containers/: `uid`, `email`, `displayName`, `providerData`,
// and `emailVerified` — used by AuthModal). Add to this Pick if a consumer
// starts reading another field.
export type User = Pick<
  FirebaseUser,
  'uid' | 'email' | 'displayName' | 'providerData' | 'emailVerified'
> & {
  name?: string | null;
  friends?: Friend[];
};

interface AuthContextType {
  /** Firebase user — null when in guest mode. */
  user: User | null;
  /** True if a firebase user is signed in. */
  isAuthenticated: boolean;
  /**
   * Lightweight loading flag, only true during the very first auth restore.
   * UI should NOT block on this — it's exposed purely for cases that want a
   * skeleton. By default everything renders immediately as guest.
   */
  loading: boolean;
  error: string | null;

  /** Stable local identity id — used as the `uid` on guest-owned games. */
  localUserId: string;
  /** Effective uid for new games: firebase uid if signed in, else localUserId. */
  effectiveUid: string;

  /** Friends list, sourced from local storage. */
  friends: Friend[];

  /** Number of operations waiting to be pushed to Firestore. */
  pendingSyncCount: number;
  /**
   * Number of operations that have failed repeatedly and are stuck (retained,
   * never dropped). Non-zero means sync needs attention — surfaced in the UI.
   */
  syncFailedCount: number;
  /**
   * Increments whenever a background cloud pull changes local data. Screens can
   * depend on this to re-read games after another device's changes land.
   */
  dataVersion: number;
  /**
   * True when signed in AND online AND queue is empty. Indicates the user's
   * data is fully backed up to the cloud right now.
   */
  cloudSyncEnabled: boolean;
  /** Best-guess online flag (based on recent network attempts). */
  isOnline: boolean;

  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  /**
   * Sign in (or up) with Apple via the native sheet. Throws on failure —
   * including expo's ERR_REQUEST_CANCELED when the user dismisses the sheet,
   * which callers should swallow silently.
   */
  signInWithApple: () => Promise<void>;
  /**
   * Sign in (or up) with Google via the native account picker. Same error
   * contract as signInWithApple: throws, with code ERR_REQUEST_CANCELED on
   * user dismissal.
   */
  signInWithGoogle: () => Promise<void>;
  /**
   * Link Apple/Google as an additional sign-in method on the current account
   * (never removes existing providers — the user can then sign in with any of
   * them). Throws; code ERR_REQUEST_CANCELED on user dismissal.
   */
  linkApple: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  /** Re-send the address-verification email to the signed-in user. */
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Send a password-reset email to the given address. */
  sendPasswordReset: (email: string) => Promise<void>;
  /**
   * Permanently delete the signed-in account: deletes all cloud data, the
   * auth user, and this device's local data. Password accounts must pass the
   * current password; Apple-only accounts pass nothing — a fresh Apple
   * sign-in sheet is shown to reauthenticate (and the Apple token is revoked,
   * per App Store rules).
   */
  deleteAccount: (password?: string) => Promise<void>;

  /** Add friends locally. Syncs to cloud when signed in. */
  addFriends: (newFriends: Friend[]) => Promise<void>;
  /** Remove a friend locally by id. Syncs to cloud when signed in. */
  removeFriend: (friendId: string) => Promise<void>;
  /** Manually re-read friends from local store (e.g. after backfill). */
  refreshFriends: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriendsState] = useState<Friend[]>([]);
  const [localUserId, setLocalUserId] = useState<string>('');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [syncFailedCount, setSyncFailedCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [dataVersion, setDataVersion] = useState<number>(0);

  // ---- Bootstrap local identity + friends + sync queue lifecycle ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ident = await getIdentity();
      if (cancelled) return;
      setLocalUserId(ident.localUserId);
      const initialFriends = await localGetFriends();
      if (cancelled) return;
      setFriendsState(initialFriends);
      const initialPending = await getPendingCount();
      if (cancelled) return;
      setPendingSyncCount(initialPending);
      const initialStuck = await getStuckCount();
      if (cancelled) return;
      setSyncFailedCount(initialStuck);
    })();
    startSyncQueueLifecycle();
    startCloudSyncLifecycle();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Subscribe to sync queue updates -----------------------------------
  useEffect(() => {
    const unsub = subscribeToSyncQueue(() => {
      void (async () => {
        setPendingSyncCount(await getPendingCount());
        setSyncFailedCount(await getStuckCount());
        setIsOnline(isOnlineHint());
      })();
    });
    return () => {
      unsub();
    };
  }, []);

  const refreshFriends = useCallback(async () => {
    const f = await localGetFriends();
    setFriendsState(f);
  }, []);

  // ---- Re-read local data when a background cloud pull changes it ---------
  useEffect(() => {
    const unsub = subscribeToCloudData(() => {
      setDataVersion((v) => v + 1);
      void refreshFriends();
    });
    return () => {
      unsub();
    };
  }, [refreshFriends]);

  // ---- Firebase auth state subscription ----------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Set the user immediately so UI updates — the heavy lifting (backfill)
        // happens in the background and never blocks.
        setUser({ ...currentUser, name: currentUser.displayName });
        setLoading(false);
        try {
          const result = await runLoginBackfill({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
          });
          setFriendsState(result.friends);
          setUser({
            ...currentUser,
            name: currentUser.displayName,
            friends: result.friends,
          });
        } catch (e) {
          console.log('[AuthContext] backfill failed (non-fatal)', e);
        }
        // After backfill, queue likely changed — refresh count.
        const count = await getPendingCount();
        setPendingSyncCount(count);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ---- Auth actions ------------------------------------------------------
  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    setError(null);
    try {
      await signUpNewUser(email, password, displayName);
      // onAuthStateChanged will fire and drive backfill.
    } catch (err: any) {
      setError(err?.message ?? 'Sign up failed');
      throw err;
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      await signInUser(email, password);
      return true;
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed');
      return false;
    }
  };

  // Re-sync the context user from auth.currentUser. Needed after operations
  // that mutate the firebase user without firing onAuthStateChanged: the
  // updateProfile dance after Apple's first sign-in, and provider linking
  // (which changes providerData).
  const refreshUserFromAuth = useCallback(() => {
    const current = auth.currentUser;
    if (current) {
      setUser((prev) => ({
        ...current,
        name: current.displayName,
        friends: prev?.friends,
      }));
    }
  }, []);

  const signInWithApple = async (): Promise<void> => {
    setError(null);
    try {
      await authSignInWithApple();
      // Apple only sends the user's name on the very first authorization, and
      // the service persists it via updateProfile AFTER onAuthStateChanged has
      // already fired (same timing as email sign-up). Refresh the context user
      // so the name shows immediately instead of after the next app launch.
      refreshUserFromAuth();
      // Same timing problem for the CLOUD doc: the backfill's
      // findOrCreateCloudUser ran (off onAuthStateChanged) before
      // updateProfile landed, so a first sign-in's doc was created with the
      // email as its name. Now that the profile is settled, push the real
      // name up best-effort (setUserNameCloud logs its own failures; the
      // backfill also self-heals this on the next cold launch).
      const current = auth.currentUser;
      if (current?.displayName) {
        void setUserNameCloud(current.uid, current.displayName);
      }
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setError(err?.message ?? 'Apple sign-in failed');
      }
      throw err;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setError(null);
    try {
      await authSignInWithGoogle();
      // No post-sign-in profile fixup needed: Google's ID token carries name
      // and email, and Firebase sets displayName before onAuthStateChanged.
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setError(err?.message ?? 'Google sign-in failed');
      }
      throw err;
    }
  };

  const linkApple = async (): Promise<void> => {
    setError(null);
    try {
      await linkAppleToCurrentUser();
      // providerData changed — refresh so the UI sees the new provider.
      refreshUserFromAuth();
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setError(err?.message ?? 'Could not link Apple sign-in');
      }
      throw err;
    }
  };

  const linkGoogle = async (): Promise<void> => {
    setError(null);
    try {
      await linkGoogleToCurrentUser();
      refreshUserFromAuth();
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setError(err?.message ?? 'Could not link Google sign-in');
      }
      throw err;
    }
  };

  const resendVerificationEmail = async (): Promise<void> => {
    setError(null);
    try {
      await sendVerificationEmail();
    } catch (err: any) {
      setError(err?.message ?? 'Could not send verification email');
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    try {
      // Best-effort drain pending sync ops while we're still signed in —
      // once signed out, processQueue() bails because there's no Firebase
      // user. Cap at 3s so a flaky network never blocks logout.
      try {
        await Promise.race([
          processQueue(),
          new Promise<void>((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch (e) {
        console.log('[AuthContext] sync drain on logout failed (non-fatal)', e);
      }

      await signOutUser();

      // Clear the native Google session too, so the next Google sign-in
      // shows the account picker instead of silently reusing the last
      // account. No-op for non-Google users.
      await signOutGoogleNative();

      // Friends are stored globally (one list per device, not per-uid) so
      // they'd leak to the next user. Clear them. They'll re-pull from the
      // cloud on the next sign-in via backfill.
      // Games are scoped per-uid and won't show for a different user, so
      // we leave them on disk — the original user gets them back instantly
      // on sign-back-in without needing a network round-trip.
      await localSetFriends([]);
      setFriendsState([]);
      // setUser(null) fires via onAuthStateChanged.
    } catch (err: any) {
      setError(err?.message ?? 'Sign out failed');
      throw err;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    setError(null);
    try {
      await authSendPasswordReset(email);
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset email');
      throw err;
    }
  };

  const deleteAccount = async (password?: string): Promise<void> => {
    setError(null);
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in');
    const uid = current.uid;
    try {
      // Reauthenticate first — required by Firebase before deleting the
      // account. Accounts with a password provider confirm with their
      // password (throws on a wrong one); social-only accounts confirm via a
      // fresh native sign-in with their provider. Apple's reauth also yields
      // the authorization code we need to revoke the Apple token below.
      const providerIds = current.providerData.map((p) => p.providerId);
      let appleAuthorizationCode: string | null = null;
      if (providerIds.includes('password')) {
        if (!password) throw new Error('Enter your password to confirm');
        await reauthenticateCurrentUser(password);
      } else if (providerIds.includes('apple.com')) {
        appleAuthorizationCode = await reauthenticateWithApple();
      } else if (providerIds.includes('google.com')) {
        await reauthenticateWithGoogle();
      } else {
        throw new Error('Unsupported sign-in provider for account deletion');
      }

      // Apple token revocation (App Store Guideline 5.1.1(v)) applies to ANY
      // account with Apple linked — including password accounts that just
      // reauthenticated with their password, where the reauth above yielded
      // no code. Run the Apple sheet purely to fetch an authorizationCode.
      // Best-effort: if the user dismisses the sheet (ERR_REQUEST_CANCELED)
      // or it fails, continue the deletion WITHOUT revocation — the user's
      // intent is deletion, and it must not be blocked on this extra step.
      if (providerIds.includes('apple.com') && appleAuthorizationCode === null) {
        try {
          appleAuthorizationCode = await requestAppleAuthorizationCode();
        } catch (e) {
          console.log(
            '[AuthContext] Apple authorization for token revocation skipped (non-fatal)',
            e,
          );
        }
      }

      // Delete cloud data while still authenticated (security rules require it).
      //
      // IMPORTANT (App Store / GDPR): we must NOT swallow these errors. The
      // security rules only let a uid delete its own data, so once the Auth
      // account is gone the docs become orphaned and PERMANENTLY undeletable.
      // If a cloud step fails (e.g. transient network), abort BEFORE touching
      // the Auth account or local data so the user can retry while online and
      // "delete my account" actually deletes the data.
      try {
        await cloudDeleteAllUserGames(uid);
        // deleteUser() swallows its own error and returns false rather than
        // throwing, so we MUST check the result — otherwise a failed
        // users/{uid} deletion would fall through and we'd delete the Auth
        // account anyway, permanently orphaning the email + friends PII doc.
        const userDocDeleted = await deleteUser(uid);
        if (!userDocDeleted) {
          throw new Error('user document deletion failed');
        }
      } catch (e) {
        // Surface a clear, network-oriented message (the raw Firestore error
        // is opaque) and rethrow so we abort before deleting the Auth account.
        console.log('[AuthContext] cloud data deletion failed — aborting', e);
        throw new Error(
          "Couldn't reach the server to delete your data. Please make sure you're online and try again.",
        );
      }

      // Revoke the Sign in with Apple token (App Store Guideline 5.1.1(v))
      // while we're still signed in — revocation goes through Firebase and
      // needs the auth user to exist. Best-effort: the user's intent is
      // deletion, so a revocation hiccup shouldn't strand their account.
      if (appleAuthorizationCode) {
        try {
          await revokeAppleToken(appleAuthorizationCode);
        } catch (e) {
          console.log('[AuthContext] Apple token revocation failed (non-fatal)', e);
        }
      }
      // Likewise disconnect the app from the user's Google account whenever
      // Google is linked — unlike Apple this needs no extra UI, it works off
      // the native session (best-effort — revokeGoogleAccess swallows its own
      // errors).
      if (providerIds.includes('google.com')) {
        await revokeGoogleAccess();
      }

      // Cloud deletions succeeded — only now delete the auth account
      // (fires onAuthStateChanged → guest mode).
      await deleteCurrentAuthUser();

      // Wipe this device's local data; identity (guest id) is preserved.
      await clearLocalUserData();
      setFriendsState([]);
      setPendingSyncCount(0);
      setSyncFailedCount(0);
    } catch (err: any) {
      // Dismissing the Apple confirmation sheet is a cancel, not a failure.
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setError(err?.message ?? 'Account deletion failed');
      }
      throw err;
    }
  };

  const addFriends = async (newFriends: Friend[]): Promise<void> => {
    if (!newFriends.length) return;
    const merged = await addFriendsLocal(newFriends, user?.uid ?? null);
    setFriendsState(merged);
    if (user) {
      setUser({ ...user, friends: merged });
    }
  };

  const removeFriend = async (friendId: string): Promise<void> => {
    if (!friendId) return;
    const next = await removeFriendLocal(friendId, user?.uid ?? null);
    setFriendsState(next);
    if (user) {
      setUser({ ...user, friends: next });
    }
  };

  const effectiveUid = user?.uid ?? localUserId;
  const cloudSyncEnabled = !!user && isOnline && pendingSyncCount === 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        localUserId,
        effectiveUid,
        friends,
        pendingSyncCount,
        syncFailedCount,
        dataVersion,
        cloudSyncEnabled,
        isOnline,
        signUp,
        signIn,
        signInWithApple,
        signInWithGoogle,
        linkApple,
        linkGoogle,
        resendVerificationEmail,
        signOut,
        sendPasswordReset,
        deleteAccount,
        addFriends,
        removeFriend,
        refreshFriends,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Re-export so existing callers that import processQueue elsewhere still work
export { processQueue };
