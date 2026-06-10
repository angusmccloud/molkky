import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigation, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Portal, Dialog, useTheme } from 'react-native-paper';
import Text, { TextSizes } from '@/components/Text';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import IconButton from '@/components/IconButton';
import { AuthContext } from '@/contexts/AuthContext';
import GameBoard from '@/containers/GameBoard';
import NewGameModal from '@/containers/NewGameModal';
import GameHistoryList from '@/containers/GameHistoryList';
import { getAllUsergames, createGame, deleteGame } from '@/services/games';
import type { Game } from '@/services/localStore';

export default function HomeScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);
  const theme = useTheme();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);

  if (!authContext) throw new Error('AuthContext must be used within an AuthProvider');
  const { user, effectiveUid, dataVersion } = authContext;

  const fetchGames = useCallback(async () => {
    if (!effectiveUid) {
      setGames([]);
      return;
    }
    try {
      const all = await getAllUsergames(effectiveUid);
      setGames(all.filter((g) => g.gameStatus !== 'abandoned'));
    } catch (e) {
      console.log('Error fetching games:', e);
      setGames([]);
    }
  }, [effectiveUid]);

  useEffect(() => {
    fetchGames();
  }, [effectiveUid, dataVersion, fetchGames]);

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [fetchGames]),
  );

  // HeaderLeft: a back arrow while viewing a game's scorecard, otherwise the
  // "New Game" action that opens the new-game modal.
  useEffect(() => {
    if (!navigation) return;
    if (selectedGameId) {
      navigation.setOptions?.({
        headerLeft: () => (
          <View style={{ marginLeft: 4 }}>
            <IconButton
              icon="arrow-left"
              mode="standard"
              iconColor={theme.colors.onPrimary}
              onPress={() => {
                setSelectedGameId(null);
                fetchGames();
              }}
              accessibilityLabel="Back to games"
            />
          </View>
        ),
      });
    } else {
      navigation.setOptions?.({
        headerLeft: () => (
          <View style={{ marginLeft: 10 }}>
            <Button variant="secondary" onPress={() => setShowNewGameModal(true)} short>
              New Game
            </Button>
          </View>
        ),
      });
    }
  }, [navigation, selectedGameId, fetchGames, theme]);

  const handleGameCreated = useCallback(
    async (gameId: string) => {
      setShowNewGameModal(false);
      await fetchGames();
      if (gameId) setSelectedGameId(gameId);
    },
    [fetchGames],
  );

  const handleViewGame = useCallback((game: Game) => {
    setSelectedGameId(game.id);
  }, []);

  // Start a fresh game with the same players, order, and rules.
  const handlePlayAgain = useCallback(
    async (game: Game) => {
      try {
        const newGameId = await createGame({
          uid: game.uid,
          players: game.players,
          rules: game.rules,
          scores: game.players.map((player) => ({
            playerId: player.id,
            score: 0,
            timesOver: 0,
            misses: 0,
            isOut: false,
            isWinner: false,
          })),
          gameStatus: 'inProgress',
          gameRound: 1,
          turns: [],
          whichPlayersTurn: game.players[0].id,
        });
        await fetchGames();
        if (newGameId) setSelectedGameId(newGameId);
      } catch (e) {
        console.log('Error starting new game:', e);
      }
    },
    [fetchGames],
  );

  const handleDeleteGame = useCallback((game: Game) => {
    setDeleteTarget(game);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteGame(id);
    if (selectedGameId === id) setSelectedGameId(null);
    await fetchGames();
  }, [deleteTarget, selectedGameId, fetchGames]);

  return (
    <PageWrapper>
      <Portal>
        <Dialog visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)}>
          <Dialog.Title>Delete Game</Dialog.Title>
          <Dialog.Content>
            <Text>Delete this game permanently? This cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)} variant="secondary">
              Cancel
            </Button>
            <Button onPress={confirmDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <NewGameModal
        showModal={showNewGameModal}
        closeModal={() => setShowNewGameModal(false)}
        onGameCreated={handleGameCreated}
      />
      {!user && <GuestBanner />}
      {selectedGameId ? (
        <GameBoard
          gameId={selectedGameId}
          updateGameStatus={() => fetchGames()}
          onGameCreated={handleGameCreated}
        />
      ) : (
        <GameHistoryList
          games={games}
          onViewGame={handleViewGame}
          onPlayAgain={handlePlayAgain}
          onDeleteGame={handleDeleteGame}
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
