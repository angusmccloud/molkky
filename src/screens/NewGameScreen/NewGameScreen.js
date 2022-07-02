import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, TextInput, Switch, ScrollView } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { Layout, SlideInLeft, SlideOutRight } from 'react-native-reanimated';
import uuid from 'react-native-uuid';
import { Games, Users } from '../../models';
import { Button, Text, IconButton, ActivityIndicator, Modal, Avatar } from '../../components';
import { colors, typography } from '../../styles';
import { DataStore } from '../../utils';
import { AuthContext } from '../../contexts';
import styles from './NewGameScreenStyles';

const NewGameScreen = ({ navigation, route }) => {
  const [error, setError] = useState('');
  const [winningScore, setWinningScore] = useState('50');
  const [goBackToScore, setGoBackToScore] = useState('25');
  const [outAfterThreeMisses, setOutAfterThreeMisses] = useState(false);
  const [outAfterThreeTimesOver, setOutAfterThreeTimesOver] = useState(false);
  const [players, setPlayers] = useState([]);
  const [readyToStart, setReadyToStart] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [existingFriends, setExistingFriends] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const authStatus = useContext(AuthContext).authStatus;

  const ref_goBackToScore = useRef();

  const addNewPlayer = () => {
    const newPlayer = {
      id: uuid.v4(),
      userType: 'friend',
      name: '',
      type: 'new',
    };
    setPlayers([...players, newPlayer]);
  }

  const addFriend = () => {
    setShowFriendsModal(true);
  }

  const removePlayer = (id) => {
    setPlayers(players.filter(player => player.id !== id));
  }

  const setPlayerName = (id, name) => {
    const newPlayers = players.map(player => {
      if (player.id === id) {
        return { ...player, name };
      }
      return player;
    });
    setPlayers(newPlayers);
  };

  const shuffleOrder = () => {
    const newPlayers = [...players];
    for (let i = newPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPlayers[i], newPlayers[j]] = [newPlayers[j], newPlayers[i]];
    }
    setPlayers(newPlayers);
  };

  const addNewPlayersAsFriends = async () => {
    const newPlayers = players.filter((p) => p.type === 'new');
    if (newPlayers.length > 0) {
      try {
        // console.log('-- newPlayers --', newPlayers);
        const oldUsers = await DataStore.query(Users, u => u.owner("eq", authStatus.id));
        const oldUser = oldUsers[0];
        const newFriends = newPlayers.map(p => {
          return {
            id: p.id,
            userType: 'friend',
            name: p.name,
          };
        })
        const oldFriends = oldUser.friends ? oldUser.friends : [];
        const newFriendsList = [...oldFriends, ...newFriends];
        await DataStore.save(
          Users.copyOf(oldUser, updatedUser => {
            updatedUser.friends = JSON.stringify(newFriendsList);
          })
        );
      } catch (e) {
        console.log('-- Error setting your new friends', e)
      }
    }
  }

  const startGame = async () => {
    // console.log('-- LET\'S PLAY! --', players);
    // console.log('-- Rules --', winningScore, goBackToScore, outAfterThreeMisses, outAfterThreeTimesOver);
    setCreatingGame(true);

    try {
      const gameDb = await DataStore.save(
        new Games({
          owner: authStatus.id,
          players: players.map(player => ({
            id: player.id,
            name: player.name,
            userType: player.userType,
          })),
          scores: players.map(player => ({
            playerId: player.id,
            score: 0,
          })),
          gameStatus: 'inProgress',
          rules: {
            winningScore: parseInt(winningScore),
            goBackToScore: parseInt(goBackToScore),
            outAfterThreeMisses,
            outAfterThreeTimesOver,
          },
          turns: [],
          whichPlayersTurn: players[0].id,
          gameRound: 1,
        })
      );
      // console.log('-- And saved in the DataStore --', gameDb);
      await addNewPlayersAsFriends();
      await setCreatingGame(false);
      navigation.dispatch(StackActions.popToTop())
    } catch (err) {
      console.log('error creating game up...', err);
      setError('There was an error creating your game');
      setCreatingGame(false);
    }
  }

  const addRemoveFriendFromGame = (friend, addOrRemove) => {
    // console.log('-- addRemoveFriendFromGame --', friend, addOrRemove);
    if (addOrRemove === 'add') {
      setPlayers([...players, friend]);
    } else {
      setPlayers(players.filter(player => player.id !== friend.id));
    }
  }

  useEffect(() => {
    if (players.length < 2) {
      setReadyToStart(false);
    } else if (players.filter(p => p.name === '').length > 0) {
      setReadyToStart(false);
    } else if (winningScore.length === 0) {
      setReadyToStart(false);
    } else if (goBackToScore.length === 0) {
      setReadyToStart(false);
    } else {
      setReadyToStart(true);
    }
  }, [players, winningScore, goBackToScore]);

  useEffect(() => {
    const loadFriends = async () => {
      // console.log('-- loadFriends --');
      try {
        const users = await DataStore.query(Users, u => u.owner("eq", authStatus.id));
        const user = users[0];
        const friends = user.friends ? user.friends : [];
        setExistingFriends(friends);
      } catch (e) {
        console.log('-- Error loading your friends', e)
      }
    }
    const loadGameHistory = async () => {
      // console.log('-- loadGameHistory --');
      try {
        const games = await DataStore.query(Games, g => g.owner("eq", authStatus.id).gameStatus("eq", 'finished'));
        const playerGameHistory = [];
        games.forEach(game => {
          game.players.forEach(player => {
            playerGameHistory.push({
              gameId: game.id,
              playerId: player.id,
              playerName: player.name,
              wonGame: game.winningPlayerId === player.id,
            });
          });
        });
        // console.log('-- playerGameHistory --', playerGameHistory);
        setGameHistory(playerGameHistory);
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
    <KeyboardAwareScrollView style={styles.scrollablePageWrapper} keyboardShouldPersistTaps='always'>
      <View style={styles.pageWrapper}>
        <View style={{ width: '100%', padding: 10, paddingBottom: 0 }}>
          <Text size='XL' bold>
            Rules:
          </Text>
        </View>
        <View style={styles.inputWrapper}>
          <Text size='L'>
            Target Score:
          </Text>
          <TextInput
            clearButtonMode='always'
            maxLength={3}
            returnKeyType="done"
            placeholder="Points to Win"
            value={winningScore}
            placeholderTextColor={colors.textInputPlaceholder}
            enablesReturnKeyAutomatically={true}
            keyboardType='number-pad'
            style={[styles.textInput, styles.textInputWrapper, styles.inputSmall]}
            onChangeText={(text) => setWinningScore(text)}
            onSubmitEditing={() => ref_goBackToScore.current.focus()}
          />
        </View>
        <View style={styles.inputWrapper}>
          <Text size='L'>
            Fall-Back-To Points:
          </Text>
          <TextInput
            clearButtonMode='always'
            maxLength={3}
            returnKeyType='done'
            placeholder="Go-Over Points"
            value={goBackToScore}
            placeholderTextColor={colors.textInputPlaceholder}
            enablesReturnKeyAutomatically={true}
            keyboardType='number-pad'
            style={[styles.textInput, styles.textInputWrapper, styles.inputSmall]}
            onChangeText={(text) => setGoBackToScore(text)}
            ref={ref_goBackToScore}
          />
        </View>
        <View style={styles.inputWrapper}>
          <Text size='L'>
            3-Misses and You're Out:
          </Text>
          <Switch
            trackColor={{ false: colors.gray, true: colors.primaryBlue }}
            thumbColor={outAfterThreeMisses ? colors.white : colors.white}
            ios_backgroundColor={colors.gray}
            onValueChange={() => setOutAfterThreeMisses(!outAfterThreeMisses)}
            value={outAfterThreeMisses}
          />
        </View>
        <View style={styles.inputWrapper}>
          <Text size='L'>
            3-Overs and You're Out:
          </Text>
          <Switch
            trackColor={{ false: colors.gray, true: colors.primaryBlue }}
            thumbColor={outAfterThreeTimesOver ? colors.white : colors.white}
            ios_backgroundColor={colors.gray}
            onValueChange={() => setOutAfterThreeTimesOver(!outAfterThreeTimesOver)}
            value={outAfterThreeTimesOver}
          />
        </View>
        <View style={styles.buttonsWrapper}>
          <View style={styles.twoButtonWrapper}>
            <Button text={'Add Friend'} onPress={addFriend} disabled={creatingGame} />
          </View>
          <View style={styles.twoButtonWrapper}>
            <Button text={'Add Newbie'} onPress={addNewPlayer} disabled={creatingGame} />
          </View>
        </View>
        {players.map(player => (
          <Animated.View
            key={player.id}
            style={styles.inputWrapper}
            layout={Layout}
            entering={SlideInLeft}
            exiting={SlideOutRight}
          >
            {existingFriends.find(friend => friend.id === player.id) ? (
              <PlayerWithGamesPlayed player={player} gameHistory={gameHistory} />
            ) : (
              <TextInput
                clearButtonMode='always'
                maxLength={50}
                returnKeyType="done"
                placeholder="Player Name"
                value={player.name}
                placeholderTextColor={colors.textInputPlaceholder}
                enablesReturnKeyAutomatically={true}
                keyboardType='default'
                autoCapitalize='words'
                style={[styles.textInput, styles.textInputWrapper]}
                onChangeText={(text) => setPlayerName(player.id, text)}
              />
            )}
            <IconButton iconName={'close'} size={typography.fontSizeXL} variant='warning' onPress={() => removePlayer(player.id)} />
          </Animated.View>
        ))}
        <View style={styles.buttonsWrapper}>
          {creatingGame ? (
            <ActivityIndicator size={40} />
          ) : (
            <>
              <View style={styles.twoButtonWrapper}>
                <Button text={'Shuffle Order'} onPress={shuffleOrder} disabled={!readyToStart} />
              </View>
              <View style={styles.twoButtonWrapper}>
                <Button text={'Start Game'} onPress={startGame} disabled={!readyToStart} />
              </View>
            </>
          )}
        </View>
      </View>
      <Modal
        visible={showFriendsModal}
        onRequestClose={() => setShowModal(false)}
        avoidKeyboard={true}
        style={{ padding: 0, margin: 0 }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 2, alignItems: "flex-end" }}>
                <Text color={colors.white} bold size="M">
                  Add Friends
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Button
                  variant="secondary"
                  text="Done"
                  onPress={() => setShowFriendsModal(false)}
                  size="small"
                />
              </View>
            </View>
            <View style={styles.modalContentWrapper}>
              <ScrollView style={{ width: '100%' }}>
                {existingFriends.length > 0 ? (
                  existingFriends.map(friend => (
                    <FriendInModal key={friend.id} friend={friend} addRemoveFriendFromGame={addRemoveFriendFromGame} players={players} gameHistory={gameHistory} />
                  ))
                ) : (
                  <Text>
                    You haven't played any games yet. After your first game, everyone you've played with before will show up here to easily add to more games
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollView >

  );
}

export default NewGameScreen;

const FriendInModal = (props) => {
  const { friend, players, addRemoveFriendFromGame, gameHistory } = props;
  const friendInGame = players.find(player => player.id === friend.id);

  return (
    <View style={styles.modalFriendWrapper}>
      <PlayerWithGamesPlayed player={friend} gameHistory={gameHistory} />
      <View style={{ alignItems: 'center', }}>
        <Button text={friendInGame ? 'Remove' : 'Add'} variant={friendInGame ? 'secondary' : 'primary'} onPress={() => addRemoveFriendFromGame(friend, friendInGame ? 'remove' : 'add')} />
      </View>
    </View>
  )
}

const PlayerWithGamesPlayed = (props) => {
  const { player, gameHistory} = props;
  const gamesPlayed = gameHistory.filter(game => game.playerId === player.id).length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ paddingRight: 5 }}>
        <Avatar name={player.name} size={50} />
      </View>
      <View>
        <Text size="M" bold>{player.name}</Text>
        <Text size="XS">{gamesPlayed} Game{gamesPlayed !== 1 ? 's' : ''} Played</Text>
      </View>
    </View>
  )
}