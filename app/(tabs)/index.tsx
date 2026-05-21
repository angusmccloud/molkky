import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigation, useFocusEffect } from 'expo-router';
import { View, Pressable } from 'react-native';
import { Portal, Dialog, useTheme } from 'react-native-paper';
import Text, { TextSizes } from '@/components/Text';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import GameBoard from '@/containers/GameBoard';
import NewGameModal from '@/containers/NewGameModal';
import { getAllUsergames, updateGame } from '@/services/games';
import type { Game } from '@/services/localStore';

export default function HomeScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);
  const theme = useTheme();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  if (!authContext) throw new Error('AuthContext must be used within an AuthProvider');
  const { user, effectiveUid } = authContext;

  const fetchLatestGame = useCallback(async () => {
    if (!effectiveUid) {
      setCurrentGame(null);
      return;
    }
    try {
      const games = await getAllUsergames(effectiveUid);
      const filtered = games
        .filter((g) => g.gameStatus !== 'abandoned')
        .sort((a, b) => {
          const ta = Date.parse(a.createdAt || '') || 0;
          const tb = Date.parse(b.createdAt || '') || 0;
          return tb - ta;
        });
      setCurrentGame(filtered.length > 0 ? filtered[0] : null);
    } catch (e) {
      console.log('Error fetching latest game:', e);
      setCurrentGame(null);
    }
  }, [effectiveUid]);

  useEffect(() => {
    fetchLatestGame();
  }, [effectiveUid, showNewGameModal, fetchLatestGame]);

  useFocusEffect(
    useCallback(() => {
      fetchLatestGame();
    }, [fetchLatestGame]),
  );

  // HeaderLeft button logic
  useEffect(() => {
    if (!navigation) return;
    if (!currentGame || currentGame.gameStatus === 'finished') {
      navigation.setOptions?.({
        headerLeft: () => (
          <View style={{ marginLeft: 10 }}>
            <Button variant="secondary" onPress={() => setShowNewGameModal(true)} short>
              New Game
            </Button>
          </View>
        ),
      });
    } else if (currentGame.gameStatus === 'inProgress') {
      navigation.setOptions?.({
        headerLeft: () => (
          <View style={{ marginLeft: 10 }}>
            <Button variant="secondary" onPress={() => setDeleteDialogVisible(true)} short>
              End Game
            </Button>
          </View>
        ),
      });
    } else {
      navigation.setOptions?.({ headerLeft: () => null });
    }
  }, [navigation, currentGame]);

  const abandonGame = async () => {
    if (!currentGame) return;
    try {
      await updateGame(currentGame.id, { gameStatus: 'abandoned' });
      setDeleteDialogVisible(false);
      setCurrentGame(null);
    } catch (e) {
      setDeleteDialogVisible(false);
    }
  };

  const handleGameCreated = async (_gameId: string) => {
    setShowNewGameModal(false);
    fetchLatestGame();
  };

  return (
    <PageWrapper>
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>End Game</Dialog.Title>
          <Dialog.Content>
            <Text>Abandon Progress on this Game. This cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} variant="secondary">
              Cancel
            </Button>
            <Button onPress={abandonGame}>End Game</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <NewGameModal
        showModal={showNewGameModal}
        closeModal={() => setShowNewGameModal(false)}
        onGameCreated={handleGameCreated}
      />
      {!user && <GuestBanner />}
      {!currentGame ? (
        <View style={{ alignItems: 'center', padding: 20, width: '100%' }}>
          <View style={{ paddingTop: 20 }}>
            <Button onPress={() => setShowNewGameModal(true)}>Start a New Game</Button>
          </View>
        </View>
      ) : (
        <GameBoard
          gameId={currentGame.id}
          updateGameStatus={() => fetchLatestGame()}
          onGameCreated={handleGameCreated}
        />
      )}
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// GuestBanner — persistent reminder that data isn't backed up.
// ---------------------------------------------------------------------------

const GuestBanner = () => {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.secondaryContainer ?? '#444',
        paddingVertical: 8,
        paddingHorizontal: 12,
        width: '100%',
      }}
    >
      <Text size={TextSizes.S} color={theme.colors.onSecondaryContainer ?? theme.colors.onBackground}>
        Playing as guest — your games stay on this device. Tap the user icon in the top-right to sign in and back them up.
      </Text>
    </View>
  );
};
