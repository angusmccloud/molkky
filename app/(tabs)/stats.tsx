import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, FlatList, ListRenderItemInfo, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Portal, Dialog, useTheme } from 'react-native-paper';
import Text, { TextSizes } from '@/components/Text';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import IconButton from '@/components/IconButton';
import Button from '@/components/Button';
import ActivityIndicator from '@/components/ActivityIndicator';
import Divider from '@/components/Divider';
import PageWrapper from '@/components/PageWrapper';
import typography from '@/constants/Typography';
import { AuthContext } from '@/contexts/AuthContext';
import { getAllUsergames } from '@/services/games';
import type { Game } from '@/services/localStore';

type Friend = { id: string; name: string };
type GameHistory = { gameId: string; playerId: string; playerName: string; wonGame: boolean };
type TurnHistory = {
  gameId: string;
  playerId: string;
  score: number;
  winnableTurn?: boolean;
  wonOnTurn?: boolean;
  skipped?: boolean;
  wentOver?: boolean;
  eliminated?: boolean;
};
type ScoreHistory = { gameId: string; playerId: string; score: number };

const StatsScreen: React.FC = () => {
  const authContext = useContext(AuthContext);
  const theme = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [turnHistory, setTurnHistory] = useState<TurnHistory[]>([]);
  const [scoresHistory, setScoresHistory] = useState<ScoreHistory[]>([]);
  const [activeGameCounts, setActiveGameCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

  if (!authContext) throw new Error('AuthContext must be used within an AuthProvider');
  const { effectiveUid, friends: localFriends, removeFriend, dataVersion } = authContext;

  // The tab bar is `position: 'absolute'` on iOS so content scrolls under
  // it. Pad the bottom of the list so the last item can be scrolled fully
  // into view above the tab bar.
  const tabBarHeight = useBottomTabBarHeight();
  const bottomInset = Platform.OS === 'ios' ? tabBarHeight : 0;

  // Only show the full-screen "Loading Stats..." spinner on the very first
  // load. Later recalculations (tab refocus, cloud pull) refresh silently so
  // the list doesn't flash on every visit.
  const hasLoadedRef = useRef(false);

  const loadStats = useCallback(
    async () => {
      if (!effectiveUid) return;
      if (!hasLoadedRef.current) setLoading(true);
      try {
        // Get all finished games for this effective uid from local store.
        const allGames = (await getAllUsergames(effectiveUid)) as Game[];
        const finishedGames = allGames.filter((g) => g.gameStatus === 'finished');
        const activeGames = allGames.filter((g) => g.gameStatus !== 'abandoned');

        // Friends list comes from local store via AuthContext. Augment with
        // any player names that appear in finished games but aren't in the
        // friends list (e.g. custom one-off players) so stats still render.
        const friendIdSet = new Set(localFriends.map((f) => f.id));
        const extras = new Map<string, Friend>();
        for (const g of finishedGames) {
          for (const p of g.players || []) {
            if (!friendIdSet.has(p.id) && !extras.has(p.id)) {
              extras.set(p.id, { id: p.id, name: p.name });
            }
          }
        }
        const combined: Friend[] = [
          ...localFriends,
          ...Array.from(extras.values()),
        ].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
        setFriends(combined);

        // Count finished + in-progress game participations per player so the
        // delete affordance hides for anyone in a current game.
        const counts: Record<string, number> = {};
        for (const g of activeGames) {
          const seen = new Set<string>();
          for (const p of g.players || []) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            counts[p.id] = (counts[p.id] || 0) + 1;
          }
        }
        setActiveGameCounts(counts);

        // Build histories
        const playerGameHistory: GameHistory[] = [];
        const playerTurnHistory: TurnHistory[] = [];
        const playerScoreHistory: ScoreHistory[] = [];
        finishedGames.forEach((game) => {
          (game.players || []).forEach((player) => {
            playerGameHistory.push({
              gameId: game.id,
              playerId: player.id,
              playerName: player.name,
              wonGame: game.winningPlayerId === player.id,
            });
          });
          (game.turns || []).forEach((turn) => {
            playerTurnHistory.push({
              gameId: game.id,
              playerId: turn.playerId,
              score: turn.score,
              winnableTurn: turn.winnableTurn,
              wonOnTurn: turn.wonOnTurn,
              skipped: turn.skipped,
              wentOver: turn.wentOver,
              eliminated: turn.eliminated,
            });
          });
          (game.scores || []).forEach((score) => {
            playerScoreHistory.push({
              gameId: game.id,
              playerId: score.playerId,
              score: score.score,
            });
          });
        });
        setGameHistory(playerGameHistory);
        setTurnHistory(playerTurnHistory);
        setScoresHistory(playerScoreHistory);
      } catch (e) {
        console.log('-- Error loading stats', e);
      } finally {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    },
    [effectiveUid, localFriends],
  );

  // Recalculate on mount and whenever a background cloud pull changes data.
  useEffect(() => {
    loadStats();
  }, [loadStats, dataVersion]);

  // Recalculate whenever the Stats tab gains focus — this is what refreshes
  // the page after a game finishes or a finished game is deleted on the Home
  // tab, since both happen while this screen is unfocused.
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const keyExtractor = useCallback((item: Friend) => item.id, []);

  const friendIdSet = React.useMemo(
    () => new Set(localFriends.map((f) => f.id)),
    [localFriends],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Friend>) => (
      <PlayerStats
        key={item.id}
        friend={item}
        gameHistory={gameHistory.filter((game) => game.playerId === item.id)}
        turnHistory={turnHistory.filter((turn) => turn.playerId === item.id && !turn.skipped)}
        scoresHistory={scoresHistory.filter((score) => score.playerId === item.id)}
        allScoresHistory={scoresHistory}
        totalGameCount={activeGameCounts[item.id] || 0}
        canRemove={friendIdSet.has(item.id)}
        onRequestRemove={() => setFriendToRemove(item)}
      />
    ),
    [gameHistory, turnHistory, scoresHistory, activeGameCounts, friendIdSet],
  );

  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    const id = friendToRemove.id;
    setFriendToRemove(null);
    try {
      await removeFriend(id);
    } catch (e) {
      console.log('-- Error removing friend', e);
    }
  };

  return (
    <PageWrapper>
      <Portal>
        <Dialog visible={!!friendToRemove} onDismiss={() => setFriendToRemove(null)}>
          <Dialog.Title>Remove friend?</Dialog.Title>
          <Dialog.Content>
            <Text>
              {`${friendToRemove?.name ?? ''} will be removed from your friends list. They've played 0 games so this won't affect any stats.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFriendToRemove(null)} variant="secondary">
              Cancel
            </Button>
            <Button onPress={handleConfirmRemove} buttonColor={theme.colors.error}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading Stats...</Text>
          <ActivityIndicator style={{ marginTop: 10 }} size={100} />
        </View>
      ) : friends.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text>Stats will start once you finish your first game.</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={Divider}
          style={{ width: '100%' }}
          contentContainerStyle={{ paddingBottom: bottomInset }}
        />
      )}
    </PageWrapper>
  );
};

interface PlayerStatsProps {
  friend: Friend;
  gameHistory: GameHistory[];
  turnHistory: TurnHistory[];
  scoresHistory: ScoreHistory[];
  allScoresHistory: ScoreHistory[];
  totalGameCount: number;
  canRemove: boolean;
  onRequestRemove: () => void;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({
  friend,
  gameHistory,
  turnHistory,
  scoresHistory,
  allScoresHistory,
  totalGameCount,
  canRemove,
  onRequestRemove,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const gamesPlayed = gameHistory.length;
  const gamesWon = gameHistory.filter((game) => game.wonGame).length;
  const totalPoints = turnHistory.reduce((acc, turn) => acc + (turn.score || 0), 0);
  const winnableTurns = turnHistory.filter((turn) => turn.winnableTurn).length;
  const winningTurns = turnHistory.filter((turn) => turn.wonOnTurn).length;
  const wentOver = turnHistory.filter((turn) => turn.wentOver).length;
  const zeroPointTurns = turnHistory.filter((turn) => (turn.score || 0) === 0).length;
  const totalEndingScores = scoresHistory.reduce((acc, score) => acc + (score.score || 0), 0);
  let numberSecondPlace = 0;
  gameHistory.forEach((game) => {
    const gameScores = allScoresHistory.filter((score) => score.gameId === game.gameId);
    const sortedScores = [...gameScores].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sortedScores.length > 1 && sortedScores[1].playerId === friend.id) {
      numberSecondPlace++;
    }
  });

  const toggleExpanded = () => setExpanded((e) => !e);

  const stats =
    gamesPlayed === 0
      ? []
      : [
          {
            title: 'Winning Percentage',
            value: `${Math.round((gamesWon / gamesPlayed) * 100)}%${gamesWon > 0 ? ` (${gamesWon})` : ''}`,
          },
          {
            title: 'Second Place Percentage',
            value: `${Math.round((numberSecondPlace / gamesPlayed) * 100)}%${numberSecondPlace > 0 ? ` (${numberSecondPlace})` : ''}`,
          },
          {
            title: 'Average Points per Game',
            value: `${gamesPlayed > 0 ? Math.round((totalEndingScores / gamesPlayed) * 10) / 10 : 0}`,
          },
          {
            title: 'Average Points per Throw',
            value: `${turnHistory.length > 0 ? Math.round((totalPoints / turnHistory.length) * 10) / 10 : 0}`,
          },
          {
            title: 'Winnable Turn Success',
            value: `${winningTurns} of ${winnableTurns}${winnableTurns > 0 ? ` (${Math.round((winningTurns / winnableTurns) * 100)}%)` : ''}`,
          },
          {
            title: 'Zero Point Turns',
            value: `${turnHistory.length > 0 ? Math.round((zeroPointTurns / turnHistory.length) * 100) : 0}%`,
          },
          {
            title: 'Overs per Game',
            value: `${gamesPlayed > 0 ? Math.round((wentOver / gamesPlayed) * 10) / 10 : 0}`,
          },
        ];

  const showRemove = canRemove && totalGameCount === 0;

  return (
    <View style={playerStatsStyles.wrapper}>
      <Pressable onPress={toggleExpanded}>
        <View style={playerStatsStyles.headerRow}>
          <View style={playerStatsStyles.avatarRow}>
            <View style={{ paddingRight: 5 }}>
              <Avatar name={friend.name} size={typography.fontSizeXXXL} />
            </View>
            <View>
              <Text size={TextSizes.M} bold>
                {String(friend.name)}
              </Text>
              <Text size={TextSizes.XS}>{`${gamesPlayed} Game${gamesPlayed !== 1 ? 's' : ''} Played`}</Text>
            </View>
          </View>
          {showRemove ? (
            <IconButton
              icon="trash-can-outline"
              mode="standard"
              size={typography.fontSizeXL}
              iconColor={theme.colors.error}
              onPress={onRequestRemove}
              accessibilityLabel={`Remove ${friend.name}`}
            />
          ) : (
            gamesPlayed > 0 && <Icon name={expanded ? 'expanded' : 'collapsed'} size={typography.fontSizeXL} />
          )}
        </View>
      </Pressable>
      {expanded && gamesPlayed > 0 && (
        <View>
          {stats.map((stat) => (
            <View key={stat.title} style={playerStatsStyles.statRow}>
              <View style={{ paddingRight: 5 }}>
                <Text size={TextSizes.M} bold>
                  {String(stat.title) + ':'}
                </Text>
              </View>
              <View>
                <Text size={TextSizes.M}>{String(stat.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const playerStatsStyles = StyleSheet.create({
  wrapper: { padding: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 2 },
});

export default StatsScreen;
