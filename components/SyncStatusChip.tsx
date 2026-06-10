import React, { useContext } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import Text, { TextSizes } from '@/components/Text';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Small status dot + label that summarises sync state:
 *   - gray:  guest mode (not signed in)
 *   - green: signed in, online, queue empty
 *   - amber: signed in, pending ops in queue (or offline)
 *   - red:   signed in, some ops are stuck and need attention
 */
const SyncStatusChip: React.FC = () => {
  const theme = useTheme();
  const colors = theme.colors as typeof theme.colors & {
    syncSynced: string;
    syncPending: string;
    syncError: string;
    syncGuest: string;
  };
  const ctx = useContext(AuthContext);
  if (!ctx) return null;

  const { user, pendingSyncCount, syncFailedCount, cloudSyncEnabled } = ctx;

  let color = colors.syncGuest;
  let label = 'Guest';
  if (user) {
    if (syncFailedCount > 0) {
      color = colors.syncError;
      label = `Sync issue (${syncFailedCount})`;
    } else if (cloudSyncEnabled) {
      color = colors.syncSynced;
      label = 'Synced';
    } else if (pendingSyncCount > 0) {
      color = colors.syncPending;
      label = `Syncing (${pendingSyncCount})`;
    } else {
      color = colors.syncPending;
      label = 'Offline';
    }
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 4,
        }}
      />
      <Text size={TextSizes.XS} color={theme.colors.onPrimary}>
        {label}
      </Text>
    </View>
  );
};

export default SyncStatusChip;
