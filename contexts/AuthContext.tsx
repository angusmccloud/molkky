import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signUpNewUser,
  signInUser,
  signOutUser,
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
import { addFriendsLocal, removeFriendLocal, deleteUser } from '@/services/users';
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
// app/ components/ containers/: `uid`, `email`, `displayName`, and
// `providerData` — used by AuthModal). Add to this Pick if a consumer starts
// reading another field.
export type User = Pick<
  FirebaseUser,
  'uid' | 'email' | 'displayName' | 'providerData'
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
  signOut: () => Promise<void>;
  /** Send a password-reset email to the given address. */
  sendPasswordReset: (email: string) => Promise<void>;
  /**
   * Permanently delete the signed-in account: requires the current password,
   * deletes all cloud data, the auth user, and this device's local data.
   */
  deleteAccount: (password: string) => Promise<void>;

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

  const deleteAccount = async (password: string): Promise<void> => {
    setError(null);
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in');
    const uid = current.uid;
    try {
      // Reauthenticate first — throws on a wrong password and is required by
      // Firebase before deleting the account.
      await reauthenticateCurrentUser(password);

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

      // Cloud deletions succeeded — only now delete the auth account
      // (fires onAuthStateChanged → guest mode).
      await deleteCurrentAuthUser();

      // Wipe this device's local data; identity (guest id) is preserved.
      await clearLocalUserData();
      setFriendsState([]);
      setPendingSyncCount(0);
      setSyncFailedCount(0);
    } catch (err: any) {
      setError(err?.message ?? 'Account deletion failed');
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
