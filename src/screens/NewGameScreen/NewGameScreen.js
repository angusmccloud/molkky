import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, TextInput, Switch } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Games } from '../../models';
import uuid from 'react-native-uuid';
import { Button, Text, Divider, IconButton, ActivityIndicator } from '../../components';
import styles from './NewGameScreenStyles';
import { colors, typography } from '../../styles';
import { DataStore } from '../../utils';
import { AuthContext } from '../../contexts';

const NewGameScreen = ({ navigation, route }) => {
  const [error, setError] = useState('');
  const [winningScore, setWinningScore] = useState('50');
  const [goBackToScore, setGoBackToScore] = useState('25');
  const [outAfterThreeMisses, setOutAfterThreeMisses] = useState(false);
  const [outAfterThreeTimesOver, setOutAfterThreeTimesOver] = useState(false);
  const [players, setPlayers] = useState([]);
  const [readyToStart, setReadyToStart] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const authStatus = useContext(AuthContext).authStatus;

  const ref_goBackToScore = useRef();

  const addNewPlayer = () => {
    const newPlayer = {
      id: uuid.v4(),
      userType: 'friend',
      name: '',
    };
    setPlayers([...players, newPlayer]);
  }

  const addFriend = () => {
    console.log('-- Coming Soon! --');
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

  const startGame = async() => {
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
      await setCreatingGame(false);
      navigation.dispatch(StackActions.popToTop())
    } catch (err) {
      console.log('error creating game up...', err);
      setError('There was an error creating your game');
      setCreatingGame(false);
    }
  }

  useEffect(() => {
    if (players.length < 2) {
      setReadyToStart(false);
    } else if (players.filter(p => p.name === '').length > 0) {
      setReadyToStart(false);
    } else if(winningScore.length === 0) {
      setReadyToStart(false);
    } else if(goBackToScore.length === 0) {
      setReadyToStart(false);
    } else {
      setReadyToStart(true);
    }
  }, [players, winningScore, goBackToScore]);

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
            3-Misses And You're Out:
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
            3-Overs And You're Out:
          </Text>
          <Switch
            trackColor={{ false: colors.gray, true: colors.primaryBlue }}
            thumbColor={outAfterThreeTimesOver ? colors.white : colors.white}
            ios_backgroundColor={colors.gray}
            onValueChange={() => setOutAfterThreeTimesOver(!outAfterThreeTimesOver)}
            value={outAfterThreeTimesOver}
          />
        </View>
        <Divider />
        <View style={styles.buttonsWrapper}>
          <Button text={'Add Friend'} onPress={addFriend} disabled={creatingGame} />
          <Button text={'Add Newbie'} onPress={addNewPlayer} disabled={creatingGame} />
        </View>
        {players.map(player => (
          <View key={player.id} style={styles.inputWrapper}>
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
            <IconButton iconName={'close'} size={typography.fontSizeXL} variant='warning' onPress={() => removePlayer(player.id)} />
          </View>
        ))}
        <View style={styles.buttonsWrapper}>
          {creatingGame ? (
            <ActivityIndicator size={40} />
          ) : (
            <>
              <Button text={'Shuffle Order'} onPress={shuffleOrder} disabled={!readyToStart} />
              <Button text={'Start Game'} onPress={startGame} disabled={!readyToStart} />
            </>
          )}
        </View>
      </View>
    </KeyboardAwareScrollView >

  );
}

export default NewGameScreen;