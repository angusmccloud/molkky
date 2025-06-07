import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Switch, StyleSheet, Keyboard } from 'react-native';
import { useNavigation } from 'expo-router';
import { useTheme } from 'react-native-paper';
import uuid from 'react-native-uuid'; 
import { MagicScroll } from '@appandflow/react-native-magic-scroll';
import { createGame } from '@/services/games';
import { AuthContext } from '@/contexts/AuthContext';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Text from '@/components/Text';
import IconButton from '@/components/IconButton';
import ActivityIndicator from '@/components/ActivityIndicator';
import useReusableStyles from '@/hooks/useReusableStyles';

const NewGameScreen = () => {
  const [winningScore, setWinningScore] = useState('50');
  const [goBackToScore, setGoBackToScore] = useState('25');
  const [outAfterThreeMisses, setOutAfterThreeMisses] = useState(false);
  const [outAfterThreeTimesOver, setOutAfterThreeTimesOver] = useState(false);
  const [players, setPlayers] = useState([]);
  const [readyToStart, setReadyToStart] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [error, setError] = useState(null);

  const navigation = useNavigation();
  const ref_goBackToScore = useRef();

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user } = authContext;
  const theme = useTheme();
  const styles = useStyles(theme);

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Home',
      title: 'New Game',
    });
  }, []);

  const addNewPlayer = () => {
    const newPlayer = {
      id: uuid.v4(),
      name: '',
    };
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(player => player.id !== id));
  };

  const setPlayerName = (id, name) => {
    const updatedPlayers = players.map(player =>
      player.id === id ? { ...player, name } : player
    );
    setPlayers(updatedPlayers);
  };

  const shuffleOrder = () => {
    const shuffledPlayers = [...players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }
    setPlayers(shuffledPlayers);
  };

  const startGame = async () => {
    setCreatingGame(true);
    setError(null);

    try {
      const gameData = {
        uid: user.uid,
        players: players.map(player => ({
          id: player.id,
          name: player.name,
        })),
        rules: {
          winningScore: parseInt(winningScore),
          goBackToScore: parseInt(goBackToScore),
          outAfterThreeMisses,
          outAfterThreeTimesOver,
        },
        gameStatus: 'inProgress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createGame(gameData);
      navigation.goBack();
    } catch (err) {
      setError('Failed to create game. Please try again.');
    } finally {
      setCreatingGame(false);
    }
  };

  useEffect(() => {
    const isReady = players.length >= 2 &&
      players.every(player => player.name.trim() !== '') &&
      winningScore.trim() !== '' &&
      goBackToScore.trim() !== '';
    setReadyToStart(isReady);
  }, [players, winningScore, goBackToScore]);

  return (
    <MagicScroll.ScrollView>
      <View style={styles.textInputWrapper}>
        <MagicScroll.TextInput
          name="targetScore"
          renderInput={(magicProps) => (
            <TextInput 
              value={winningScore} 
              onChangeText={setWinningScore}
              label="Target Score" 
              keyboardType="number-pad"
              placeholder="Points to Win"
              clearButtonMode="while-editing"
              maxLength={3}
              {...magicProps}
            />
          )}
          chainTo="fallBackPoints"
        />
      </View>
      <View style={styles.textInputWrapper}>
        <MagicScroll.TextInput
          name="fallBackPoints"
          renderInput={(magicProps) => (
            <TextInput 
              label='Fall-Back-To Points'
              value={goBackToScore}
              onChangeText={setGoBackToScore}
              keyboardType="number-pad"
              placeholder="Go-Over Points"
              clearButtonMode="while-editing"
              maxLength={3}
              {...magicProps}
            />
          )}
          // chainTo="fallBackPoints"
        />
      </View>
      <View style={styles.inputWrapper}>
        <Text>3-Misses and You're Out:</Text>
        <Switch
          value={outAfterThreeMisses}
          onValueChange={setOutAfterThreeMisses}
        />
      </View>
      <View style={styles.inputWrapper}>
        <Text>3-Overs and You're Out:</Text>
        <Switch
          value={outAfterThreeTimesOver}
          onValueChange={setOutAfterThreeTimesOver}
        />
      </View>
      <Button onPress={addNewPlayer}>
        Add Player
      </Button>
      {players.map((player, i) => (
        <View key={player.id} style={styles.playerRow}>
          <MagicScroll.TextInput
            name={`playerName-${i}`}
            textInputProps={{
              onSubmitEditing: (e) => {
                // If this is the last player, hide the keyboard
                if (i === players.length - 1) {
                  Keyboard.dismiss();
                }
              }
            }}
            renderInput={(magicProps) => (
              <TextInput
                value={player.name}
                onChangeText={name => setPlayerName(player.id, name)}
                clearButtonMode="while-editing"
                maxLength={50}
                returnKeyType={i === players.length - 1 ? 'done' : 'next'}
                label="Player Name"
                autoCapitalize="words"
                enablesReturnKeyAutomatically={true}
                textContentType="name"
                {...magicProps}
              />
            )}
            containerStyle={{flex: 1, marginRight: 10}}
            // Only have a chain to if there are more players
            chainTo={i < players.length - 1 ? `playerName-${i + 1}` : undefined}
          />
          <IconButton 
            icon="delete" 
            onPress={() => removePlayer(player.id)} 
            containerColor={theme.colors.primary}
          />
        </View>
      ))}
      <Button onPress={shuffleOrder} disabled={!readyToStart} style={{marginTop: 10}}>
        Shuffle Order
      </Button>
      {creatingGame ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button onPress={startGame} disabled={!readyToStart} style={{marginTop: 10}}>
          Start Game
        </Button>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </MagicScroll.ScrollView>
  );
};

const useStyles = theme => {
  const reusableStyles = useReusableStyles(theme);
  return StyleSheet.create({
    ...reusableStyles,
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      marginTop: 5,
    },
    error: {
      marginTop: 16,
    },
    textInputWrapper: {
      marginBottom: 10,
    },
    inputWrapper: {
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
    }
  });
}

export default NewGameScreen;