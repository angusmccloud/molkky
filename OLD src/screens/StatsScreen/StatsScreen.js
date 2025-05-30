import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { Games, Users } from '../../models';
import { Text, Avatar, Icon, Divider } from '../../components';
import { typography } from '../../styles';
import { DataStore } from '../../utils';
import { AuthContext } from '../../contexts';
import styles from './StatsScreenStyles';

const StatsScreen = ({ navigation, route }) => {
  const [existingFriends, setExistingFriends] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [turnHistory, setTurnHistory] = useState([]);
  const [scoresHistory, setScoresHistory] = useState([]);
  const authStatus = useContext(AuthContext).authStatus;

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <PlayerStats 
          key={item.id}
          friend={item}
          gameHistory={gameHistory.filter(game => game.playerId === item.id)}
          turnHistory={turnHistory.filter(turn => turn.playerId === item.id && !turn.skipped)} 
          scoresHistory={scoresHistory.filter(score => score.playerId === item.id)}
          allScoresHistory={scoresHistory}
        />
      )
    }
  );

  useEffect(() => {
    const loadFriends = async () => {
      // console.log('-- loadFriends --');
      try {
        const users = await DataStore.query(Users, u => u.owner("eq", authStatus.id));
        const user = users[0];
        const friends = user.friends ? user.friends : [];
        setExistingFriends(friends.slice().sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.log('-- Error loading your friends', e)
      }
    }
    const loadGameHistory = async () => {
      // console.log('-- loadGameHistory --');
      try {
        const games = await DataStore.query(Games, g => g.owner("eq", authStatus.id).gameStatus("eq", 'finished'));
        const playerGameHistory = [];
        const playerTurnHistory = [];
        const playerScoreHistory = [];
        games.forEach(game => {
          game.players.forEach(player => {
            playerGameHistory.push({
              gameId: game.id,
              playerId: player.id,
              playerName: player.name,
              wonGame: game.winningPlayerId === player.id,
            });
          });

          game.turns.forEach(turn => {
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

          game.scores.forEach(score => {
            playerScoreHistory.push({
              gameId: game.id,
              playerId: score.playerId,
              score: score.score,
            });
          });
        });

        // console.log('-- playerGameHistory --', playerGameHistory);
        setGameHistory(playerGameHistory);
        setTurnHistory(playerTurnHistory);
        setScoresHistory(playerScoreHistory);
      } catch (e) {
        console.log('-- Error loading your games', e)
      }
    }

    if (authStatus.isAuthed && authStatus.id) {
      loadFriends();
      loadGameHistory();
    }
  }, [authStatus])

  return (
    <View style={styles.pageWrapper}>
      <FlatList
        data={existingFriends}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Divider}
        style={{ width: '100%' }}
      />
    </View>
  );
}

export default StatsScreen;

const PlayerStats = (props) => {
  const [expanded, setExpanded] = useState(false);

  const { friend, gameHistory, turnHistory, scoresHistory, allScoresHistory } = props;

  const gamesPlayed = gameHistory.length;
  const gamesWon = gameHistory.filter(game => game.wonGame).length;
  const totalPoints = turnHistory.reduce((acc, turn) => acc + turn.score, 0);
  const winnableTurns = turnHistory.filter(turn => turn.winnableTurn).length;
  const winningTurns = turnHistory.filter(turn => turn.wonOnTurn).length;
  const wentOver = turnHistory.filter(turn => turn.wentOver).length;
  const zeroPointTurns = turnHistory.filter(turn => turn.score === 0).length;
  const totalEndingScores = scoresHistory.reduce((acc, score) => acc + score.score, 0);
  let numberSecondPlace = 0;
  gameHistory.forEach(game => {
    const gameScores = allScoresHistory.filter(score => score.gameId === game.gameId);
    const sortedScores = gameScores.sort((a, b) => b.score - a.score);
    if (sortedScores.length > 0 && sortedScores[1].playerId === friend.id) {
      numberSecondPlace++;
    }
  })

  const toggleExpanded = () => {
    setExpanded(!expanded);
  }

  const stats = gamesPlayed === 0 ? [] : [
    {
      title: 'Winning Percentage',
      value: `${Math.round((gamesWon / gamesPlayed) * 100)}% ${gamesWon > 0 ? `(${gamesWon})` : ''}`,
    },
    {
      title: 'Second Place Percentage',
      value: `${Math.round((numberSecondPlace / gamesPlayed) * 100)}% ${numberSecondPlace > 0 ? `(${numberSecondPlace})` : ''}`,
    },
    {
      title: 'Average Points per Game',
      value: `${Math.round((totalEndingScores / gamesPlayed) * 10) / 10}`
    },
    {
      title: 'Average Points per Throw',
      value: `${Math.round((totalPoints / turnHistory.length) * 10) / 10}`
    },
    {
      title: 'Winnable Turn Success',
      value: `${winningTurns} of ${winnableTurns} ${winnableTurns > 0 ? `(${Math.round((winningTurns / winnableTurns) * 100)}%)` : ''}`
    },
    {
      title: 'Zero Point Turns',
      value: `${Math.round((zeroPointTurns / turnHistory.length) * 100)}%`
    },
    {
      title: 'Overs per Game',
      value: `${Math.round((wentOver / gamesPlayed) * 10) / 10}`
    }
  ]

  return (
    <View style={{ padding: 10 }}>
      <Pressable onPress={toggleExpanded}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ paddingRight: 5 }}>
              <Avatar name={friend.name} size={typography.fontSizeXXXL} />
            </View>
            <View>
              <Text size="M" bold>{friend.name}</Text>
              <Text size="XS">{gamesPlayed} Game{gamesPlayed !== 1 ? 's' : ''} Played</Text>
            </View>
          </View>
          {gamesPlayed > 0 && (
            <Icon name={expanded ? 'expanded' : 'collapsed'} size={typography.fontSizeXL} />
          )}
        </View>
      </Pressable>
      {expanded && gamesPlayed > 0 && (
        <View>
          {stats.map(stat => (
            <View key={stat.title} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 2}}>
              <View style={{ paddingRight: 5 }}>
                <Text size="M" bold>{stat.title}:</Text>
              </View>
              <View>
                <Text size="M">{stat.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}