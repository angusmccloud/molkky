import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { signUpNewUser, signInUser, signOutUser } from '@/services/auth';
import {
  getIdentity,
  getFriends as localGetFriends,
  setFriends as localSetFriends,
  type Friend,
} from '@/services/localStore';
import { addFriendsLocal } from '@/services/users';
import { runLoginBackfill } from '@/services/backfill';
import {
  getPendingCount,
  isOnlineHint,
  processQueue,
  startSyncQueueLifecycle,
  subscribeToSyncQueue,
} from '@/services/syncQueue';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface User extends FirebaseUser {
  name?: string | null;
  friends?: Friend[];
}

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
   * True when signed in AND online AND queue is empty. Indicates the user's
   * data is fully backed up to the cloud right now.
   */
  cloudSyncEnabled: boolean;
  /** Best-guess online flag (based on recent network attempts). */
  isOnline: boolean;

  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;

  /** Add friends locally. Syncs to cloud when signed in. */
  addFriends: (newFriends: Friend[]) => Promise<void>;
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
  const [isOnline, setIsOnline] = useState<boolean>(true);

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
    })();
    startSyncQueueLifecycle();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Subscribe to sync queue updates -----------------------------------
  useEffect(() => {
    const unsub = subscribeToSyncQueue(() => {
      void (async () => {
        const count = await getPendingCount();
        setPendingSyncCount(count);
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

  // ---- Firebase auth state subscription ----------------------------------
  useEffect(() => {
    const auth = getAuth();
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

  const addFriends = async (newFriends: Friend[]): Promise<void> => {
    if (!newFriends.length) return;
    const merged = await addFriendsLocal(newFriends, user?.uid ?? null);
    setFriendsState(merged);
    if (user) {
      setUser({ ...user, friends: merged });
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
        cloudSyncEnabled,
        isOnline,
        signUp,
        signIn,
        signOut,
        addFriends,
        refreshFriends,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Re-export so existing callers that import processQueue elsewhere still work
export { processQueue };
