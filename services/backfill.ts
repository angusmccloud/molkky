import {
  getIdentity,
  getAllGames,
  upsertGame,
  reassignGamesOwner,
  getFriends,
  setFriends,
  type Game,
  type Friend,
} from '@/services/localStore';
import {
  enqueueGameUpsert,
  enqueueUpdateFriends,
  processQueue,
} from '@/services/syncQueue';
import { pullAndMergeGames } from '@/services/cloudSync';
import { findOrCreateCloudUser } from '@/services/cloudUsers';

/**
 * On sign-in we want three things:
 *
 * 1) Make sure the firebase user doc exists in Firestore (idempotent).
 * 2) Reassign any local games that belonged to the device's local identity
 *    over to the firebase uid, mark them pending, and queue them up.
 * 3) On FIRST sign-in for this firebase uid (per-device), pull existing
 *    games down from Firestore into local storage and merge friends.
 *
 * After that, kick the sync queue.
 */
export const runLoginBackfill = async (firebaseUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
}): Promise<{
  friends: Friend[];
  reassignedCount: number;
  pulledCount: number;
}> => {
  const { uid, email, displayName } = firebaseUser;

  // Ensure cloud user record exists. Errors here shouldn't block anything —
  // local data is still safe. We swallow + log.
  let cloudFriends: Friend[] = [];
  try {
    const cloudUser = await findOrCreateCloudUser({
      userId: uid,
      email,
      name: displayName,
    });
    cloudFriends = (cloudUser.friends || []) as Friend[];
  } catch (e) {
    console.log('[backfill] findOrCreateCloudUser failed (continuing offline)', e);
  }

  // 1) Reassign local-owned games to this uid.
  const identity = await getIdentity();
  const reassigned = await reassignGamesOwner(identity.localUserId, uid);

  // Also catch the case where the user already had games owned by a previous
  // firebase uid (sign-out → sign-in as someone else). We don't touch those
  // because they belonged to a different account.

  // Enqueue the freshly-reassigned games.
  for (const g of reassigned) {
    await enqueueGameUpsert(g);
  }

  // 2) Pull any games already in Firestore for this uid and merge them in.
  //    This runs on every sign-in (not just the first) so a device that's been
  //    away picks up games created on the user's other devices. The merge is
  //    union + last-write-wins and never deletes local games. See cloudSync.
  const pulledCount = await pullAndMergeGames(uid);

  // 3) Merge cloud friends into local friends — DEDUP BY NAME, not id.
  //    When the same person exists with different ids on each side (e.g.
  //    guest play created "John Smith" with a local uuid; cloud already
  //    had a "John Smith" with a different uuid from a prior session),
  //    cloud's id wins as the canonical one. Build an idMap so we can
  //    rewrite local games to use the canonical player ids — otherwise
  //    "John Smith" appears twice in the friends picker forever.
  const localFriends = await getFriends();
  const nameKey = (n: string) => n.trim().toLowerCase();

  const idMap = new Map<string, string>(); // local id → canonical id
  const mergedByName = new Map<string, Friend>();
  for (const f of cloudFriends) {
    // First cloud entry per name wins (in case the cloud doc has dupes too).
    if (!mergedByName.has(nameKey(f.name))) mergedByName.set(nameKey(f.name), f);
  }
  for (const local of localFriends) {
    const key = nameKey(local.name);
    const canonical = mergedByName.get(key);
    if (canonical) {
      if (canonical.id !== local.id) idMap.set(local.id, canonical.id);
    } else {
      mergedByName.set(key, local);
    }
  }
  const mergedFriends: Friend[] = Array.from(mergedByName.values());
  await setFriends(mergedFriends);

  // 4) If any local friends collapsed into cloud canonicals, rewrite
  //    every local game so the orphan ids in players/scores/turns/turn-
  //    pointers point at the canonical friend ids. Without this, games
  //    still display the duplicate entries and stat aggregation breaks.
  if (idMap.size > 0) {
    const allGames = await getAllGames();
    for (const game of allGames) {
      const rewritten = remapPlayerIdsInGame(game, idMap);
      if (rewritten !== game) {
        const updated: Game = {
          ...rewritten,
          syncStatus: 'pending',
          localUpdatedAt: Date.now(),
        };
        await upsertGame(updated);
        await enqueueGameUpsert(updated);
      }
    }
  }

  // Push the deduplicated friends list back up.
  if (mergedFriends.length > 0) {
    await enqueueUpdateFriends(uid, mergedFriends);
  }

  // Kick the queue to start pushing.
  void processQueue();

  return {
    friends: mergedFriends,
    reassignedCount: reassigned.length,
    pulledCount,
  };
};

/**
 * Rewrite every player-id reference inside a Game using `idMap`. Returns
 * the original game reference unchanged when nothing matched, so callers
 * can cheaply detect "did anything change" via identity.
 */
const remapPlayerIdsInGame = (game: Game, idMap: Map<string, string>): Game => {
  let changed = false;
  const map = (id: string): string => {
    const mapped = idMap.get(id);
    if (mapped && mapped !== id) {
      changed = true;
      return mapped;
    }
    return id;
  };
  const players = game.players.map((p) => ({ ...p, id: map(p.id) }));
  const scores = game.scores.map((s) => ({ ...s, playerId: map(s.playerId) }));
  const turns = game.turns.map((t) => ({ ...t, playerId: map(t.playerId) }));
  const whichPlayersTurn = map(game.whichPlayersTurn);
  const winningPlayerId = game.winningPlayerId ? map(game.winningPlayerId) : game.winningPlayerId;
  if (!changed) return game;
  return {
    ...game,
    players,
    scores,
    turns,
    whichPlayersTurn,
    winningPlayerId,
  };
};
