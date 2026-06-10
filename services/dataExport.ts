import { File, Paths } from 'expo-file-system';
import Share from 'react-native-share';
import {
  getAllGames,
  getFriends,
  getIdentity,
  getMeta,
} from '@/services/localStore';
import { auth } from '@/lib/firebase';

/**
 * GDPR "right to data portability": gather everything this device holds for the
 * user — account info, the stable local identity, friends, every game, and the
 * sync metadata — into a single JSON file and hand it to the OS share sheet so
 * the user can save / email / AirDrop it.
 *
 * All data is read from the local store (the offline-first source of truth), so
 * the export works offline and includes guest-owned games too. The file is
 * written to the cache dir (transient is fine — the share sheet copies it).
 */
export const exportUserData = async (): Promise<void> => {
  const [games, friends, identity, syncMeta] = await Promise.all([
    getAllGames(),
    getFriends(),
    getIdentity(),
    getMeta(),
  ]);

  const user = auth.currentUser;
  const payload = {
    app: 'Mölkky Scores',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    account: user
      ? { uid: user.uid, email: user.email, displayName: user.displayName }
      : null,
    localIdentity: identity,
    friends,
    games,
    syncMeta,
  };

  const json = JSON.stringify(payload, null, 2);

  const file = new File(Paths.cache, 'molkky-data-export.json');
  // Overwrite any previous export (create() throws if the file already exists).
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  await Share.open({
    url: file.uri,
    type: 'application/json',
    filename: 'molkky-data-export.json',
    failOnCancel: false, // dismissing the share sheet shouldn't throw
  });
};
