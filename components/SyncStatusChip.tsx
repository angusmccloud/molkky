import React, { useContext } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import Text, { TextSizes } from '@/components/Text';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Small status dot + label that summarises sync state:
 *   - gray: guest mode (not signed in)
 *   - green: signed in, online, queue empty
 *   - yellow: signed in, pending ops in queue (or offline)
 */
const SyncStatusChip: React.FC = () => {
  const theme = useTheme();
  const ctx = useContext(AuthContext);
  if (!ctx) return null;

  const { user, pendingSyncCount, cloudSyncEnabled } = ctx;

  let color = '#888';
  let label = 'Guest';
  if (user) {
    if (cloudSyncEnabled) {
      color = '#2e7d32'; // green
      label = 'Synced';
    } else if (pendingSyncCount > 0) {
      color = '#f9a825'; // yellow
      label = `Syncing (${pendingSyncCount})`;
    } else {
      color = '#f9a825';
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
