import {
  getAllGames as localGetAllGames,
  getGamesForUid as localGetGamesForUid,
  getLocalGame,
  upsertGame as localUpsertGame,
  newLocalId,
  type Game,
} from '@/services/localStore';
import { enqueueGameUpsert } from '@/services/syncQueue';

/**
 * Local-first games API.
 *
 * UI code calls into this module exactly the way it used to call the old
 * Firestore-backed games.js. All reads come from AsyncStorage. All writes go
 * to AsyncStorage first and are then enqueued on the sync queue (fire-and-
 * forget) so they can be pushed to Firestore when online + signed-in.
 */

const nowISO = () => new Date().toISOString();

/**
 * Input shape for createGame matches the old service: an object that does NOT
 * yet need to have an `id`, `syncStatus`, or `localUpdatedAt`. Returns the new
 * game's id (matching the old API contract). We type this loosely (`any`-ish)
 * to remain backwards-compatible with the JS-flavoured callers that built up
 * game objects without the strict `Game` type.
 */
export type CreateGameInput = {
  id?: string;
  uid: string;
  players: Game['players'];
  rules: Game['rules'];
  scores: Game['scores'];
  gameStatus: Game['gameStatus'] | string;
  gameRound: number;
  turns: Game['turns'];
  whichPlayersTurn: string;
  winningPlayerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
};

export const createGame = async (gameInput: CreateGameInput): Promise<string | null> => {
  try {
    const id = gameInput.id || newLocalId();
    const game: Game = {
      ...gameInput,
      id,
      gameStatus: gameInput.gameStatus as Game['gameStatus'],
      createdAt: gameInput.createdAt || nowISO(),
      updatedAt: gameInput.updatedAt || nowISO(),
      syncStatus: 'local',
      localUpdatedAt: Date.now(),
    };
    const saved = await localUpsertGame(game);
    // Fire-and-forget — sync queue handles the rest.
    void enqueueGameUpsert(saved);
    return saved.id;
  } catch (e) {
    console.log('[games] createGame error', e);
    return null;
  }
};

export const getGame = async (gameId: string): Promise<Game | null> => {
  return getLocalGame(gameId);
};

/**
 * Update a game. Accepts either a full Game or a partial patch (the old API
 * accepted partials — e.g. `updateGame(id, { gameStatus: 'abandoned' })`).
 */
export const updateGame = async (
  gameId: string,
  gameData: Partial<Game>,
): Promise<boolean> => {
  try {
    const existing = await getLocalGame(gameId);
    if (!existing) {
      // Caller passed a full game object with same id — treat as create
      // if it actually has the required fields.
      if (
        (gameData as Game).uid &&
        Array.isArray((gameData as Game).players) &&
        Array.isArray((gameData as Game).scores)
      ) {
        const created: Game = {
          ...(gameData as Game),
          id: gameId,
          createdAt: (gameData as Game).createdAt || nowISO(),
          updatedAt: nowISO(),
          syncStatus: 'local',
          localUpdatedAt: Date.now(),
        };
        const saved = await localUpsertGame(created);
        void enqueueGameUpsert(saved);
        return true;
      }
      console.log('[games] updateGame: game not found locally:', gameId);
      return false;
    }
    const merged: Game = {
      ...existing,
      ...gameData,
      id: gameId,
      updatedAt: nowISO(),
      syncStatus: existing.syncStatus === 'synced' ? 'pending' : existing.syncStatus,
      localUpdatedAt: Date.now(),
    };
    const saved = await localUpsertGame(merged);
    void enqueueGameUpsert(saved);
    return true;
  } catch (e) {
    console.log('[games] updateGame error', e);
    return false;
  }
};

export const getAllUsergames = async (uid: string): Promise<Game[]> => {
  if (!uid) return [];
  return localGetGamesForUid(uid);
};

/** Get every locally-stored game regardless of uid. Used for stats fallback. */
export const getAllLocalGames = async (): Promise<Game[]> => {
  return localGetAllGames();
};
