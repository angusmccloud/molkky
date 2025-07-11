import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigation, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Portal, Dialog, useTheme } from 'react-native-paper';
import Text from '@/components/Text';
import IconButton from '@/components/IconButton';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import GameBoard from '@/containers/GameBoard';
import NewGameModal from '@/containers/NewGameModal';
import { getAllUsergames, updateGame } from '@/services/games';
import typography from '@/constants/Typography';

export default function HomeScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);
  const theme = useTheme();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);

  if (!authContext) throw new Error('AuthContext must be used within an AuthProvider');
  const { user, loading } = authContext;

  // Move fetchLatestGame to top-level so hooks are not called conditionally
  const fetchLatestGame = useCallback(async () => {
    // console.log('--fetchLatestGame --');
    if (!user) {
      setCurrentGame(null);
      return;
    }
    setLoadingGame(true);
    try {
      const games = await getAllUsergames(user.uid);
      const filtered = games
        .filter(g => g.gameStatus !== 'abandoned')
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCurrentGame(filtered.length > 0 ? filtered[0] : null);
    } catch (e) {
      console.error('Error fetching latest game:', e);
      setCurrentGame(null);
      setLoadingGame(false);
    }
    setLoadingGame(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      // console.log('Fetching latest game for user:', user.uid);
      fetchLatestGame();
    }
  }, [user, showNewGameModal, fetchLatestGame]);

  // Refetch on focus (if returning from another tab)
  useFocusEffect(
    useCallback(() => {
      // console.log('HomeScreen focused, fetching latest game');
      fetchLatestGame();
    }, [fetchLatestGame])
  );

  // HeaderLeft button logic
  useEffect(() => {
    if (!navigation || !user) {
      navigation.setOptions?.({ headerLeft: () => null });
      return;
    } else if (!currentGame || currentGame.gameStatus === 'finished') {
      navigation.setOptions?.({
        headerLeft: () => (
          <View style={{marginLeft: 10}}>
            <Button
              variant='secondary'
              onPress={() => setShowNewGameModal(true)}
              short
            >
              New Game
            </Button>
          </View>
          // <IconButton
          //   icon="plus"
          //   mode={'outlined'}
          //   iconColor={theme.colors.onPrimary}
          //   size={typography.fontSizeXXL / 2}
          //   onPress={() => setShowNewGameModal(true)}
          //   style={{marginLeft: 10}}
          // />
        ),
      });
    } else if (currentGame && currentGame.gameStatus === 'inProgress') {
      navigation.setOptions?.({
        headerLeft: () => (
          <View style={{marginLeft: 10}}>
            <Button
              variant='secondary'
              onPress={() => setDeleteDialogVisible(true)}
              short
            >
              End Game
            </Button>
          </View>
          // <IconButton
          //   icon="delete-outline"
          //   mode={'outlined'}
          //   iconColor={theme.colors.onPrimary}
          //   size={typography.fontSizeXL}
          //   onPress={() => setDeleteDialogVisible(true)}
          //   style={{marginLeft: 10}}
          // />
        ),
      });
    } else {
      navigation.setOptions?.({ headerLeft: () => null });
    }
  }, [navigation, user, currentGame]);

  // Abandon game logic
  const abandonGame = async () => {
    if (!currentGame) return;
    try {
      await updateGame(currentGame.id, { gameStatus: 'abandoned' });
      setDeleteDialogVisible(false);
      setCurrentGame(null);
      // fetchLatestGame();
    } catch (e) {
      setDeleteDialogVisible(false);
    }
  };

  // Callback when a new game is created
  const handleGameCreated = async (gameId: string) => {
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
            <Button onPress={() => setDeleteDialogVisible(false)} variant="secondary">Cancel</Button>
            <Button onPress={abandonGame}>End Game</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <NewGameModal
        showModal={showNewGameModal}
        closeModal={() => setShowNewGameModal(false)}
        onGameCreated={handleGameCreated}
      />
      {loading ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text>Loading...</Text>
        </View>
      ) : !user ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text size="L" bold>
            Login to start your first game
          </Text>
        </View>
      ) : !currentGame ? (
        <View style={{ alignItems: 'center', padding: 20, width: '100%' }}>
          <View style={{ paddingTop: 20 }}>
            <Button onPress={() => setShowNewGameModal(true)}>
              Start Your First Game Now
            </Button>
          </View>
        </View>
      ) : (
        <GameBoard gameId={currentGame.id} updateGameStatus={() => fetchLatestGame()} onGameCreated={handleGameCreated} />
      )}
    </PageWrapper>
  );
}
