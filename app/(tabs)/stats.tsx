import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, FlatList, ListRenderItemInfo } from 'react-native';
import Text, { TextSizes } from '@/components/Text';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import ActivityIndicator from '@/components/ActivityIndicator';
import Divider from '@/components/Divider';
import PageWrapper from '@/components/PageWrapper';
import typography from '@/constants/Typography';
import { AuthContext } from '@/contexts/AuthContext';
import { getAllUsergames } from '@/services/games';
import { getUser } from '@/services/users';

type Friend = { id: string; name: string };
type GameHistory = { gameId: string; playerId: string; playerName: string; wonGame: boolean };
type TurnHistory = { gameId: string; playerId: string; score: number; winnableTurn?: boolean; wonOnTurn?: boolean; skipped?: boolean; wentOver?: boolean; eliminated?: boolean };
type ScoreHistory = { gameId: string; playerId: string; score: number };

const StatsScreen: React.FC = () => {
  const authContext = useContext(AuthContext);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [turnHistory, setTurnHistory] = useState<TurnHistory[]>([]);
  const [scoresHistory, setScoresHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { user } = authContext;

  useEffect(() => {
    const loadStats = async () => {
      console.log('-- Loading stats for user --', user?.uid);
      setLoading(true);
      try {
        if (!user) return;
        // Get user record (for friends)
        // @ts-ignore
        const userRecord = await getUser(user.uid);
        let friendsList: Friend[] = [];
        if (userRecord?.friends && userRecord.friends.length > 0) {
          if (typeof userRecord.friends[0] === 'string') {
            const friendObjs = await Promise.all(
              userRecord.friends.map(async (fid: string) => {
                const f = await getUser(fid) as any;
                return f ? { id: f.id, name: (f.name || f.email || f.id) } : null;
              })
            );
            friendsList = friendObjs.filter(Boolean) as Friend[];
          } else {
            friendsList = userRecord.friends.map((f: any) => ({ id: f.id, name: f.name || f.email || f.id }));
          }
        }
        setFriends(friendsList.slice().sort((a: Friend, b: Friend) => (a.name || a.id).localeCompare(b.name || b.id)));

        // Get all finished games for this user
        // @ts-ignore
        const allGames = await getAllUsergames(user.uid);
        const finishedGames = allGames.filter((g: any) => g.gameStatus === 'finished');

        // Build histories
        const playerGameHistory: GameHistory[] = [];
        const playerTurnHistory: TurnHistory[] = [];
        const playerScoreHistory: ScoreHistory[] = [];
        finishedGames.forEach((game: any) => {
          (game.players || []).forEach((player: any) => {
            playerGameHistory.push({
              gameId: game.id,
              playerId: player.id,
              playerName: player.name,
              wonGame: game.winningPlayerId === player.id,
            });
          });
          (game.turns || []).forEach((turn: any) => {
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
          (game.scores || []).forEach((score: any) => {
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
        setLoading(false);
      }
    };

    if (user) loadStats();
  }, [user]);

  const keyExtractor = useCallback((item: Friend) => item.id, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Friend>) => (
      <PlayerStats
        key={item.id}
        friend={item}
        gameHistory={gameHistory.filter((game) => game.playerId === item.id)}
        turnHistory={turnHistory.filter((turn) => turn.playerId === item.id && !turn.skipped)}
        scoresHistory={scoresHistory.filter((score) => score.playerId === item.id)}
        allScoresHistory={scoresHistory}
      />
    ),
    [gameHistory, turnHistory, scoresHistory]
  );

  return (
    <PageWrapper>
      {!user ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text>You must be logged in and have played games to see your stats.</Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading Stats...</Text>
          <ActivityIndicator style={{marginTop: 10}} size={100} />
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
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ friend, gameHistory, turnHistory, scoresHistory, allScoresHistory }) => {
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

  const stats = gamesPlayed === 0 ? [] : [
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

  return (
    <View style={playerStatsStyles.wrapper}>
      <Pressable onPress={toggleExpanded}>
        <View style={playerStatsStyles.headerRow}>
          <View style={playerStatsStyles.avatarRow}>
            <View style={{ paddingRight: 5 }}>
              <Avatar name={friend.name} size={typography.fontSizeXXXL} />
            </View>
            <View>
              <Text size={TextSizes.M} bold>{String(friend.name)}</Text>
              <Text size={TextSizes.XS}>{`${gamesPlayed} Game${gamesPlayed !== 1 ? 's' : ''} Played`}</Text>
            </View>
          </View>
          {gamesPlayed > 0 && (
            <Icon name={expanded ? 'expanded' : 'collapsed'} size={typography.fontSizeXL} />
          )}
        </View>
      </Pressable>
      {expanded && gamesPlayed > 0 && (
        <View>
          {stats.map((stat) => (
            <View key={stat.title} style={playerStatsStyles.statRow}>
              <View style={{ paddingRight: 5 }}>
                <Text size={TextSizes.M} bold>{String(stat.title) + ':'}</Text>
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