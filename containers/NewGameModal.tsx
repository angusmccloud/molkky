import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeOutDown, FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useTheme } from "react-native-paper";
import uuid from 'react-native-uuid'; 
import { createGame } from '@/services/games';
import { AuthContext } from '@/contexts/AuthContext';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Text, { TextSizes } from '@/components/Text';
import Switch from '@/components/Switch';
import ActivityIndicator from '@/components/ActivityIndicator';
import useReusableStyles from '@/hooks/useReusableStyles';
import Modal from '@/components/Modal';
import Chip from '@/components/Chip';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import MultiSelectInput from '@/components/MultiSelectInput';
import typography from '@/constants/Typography';
import IconButton from "@/components/IconButton";

// --- Types for state ---
type Player = { id: string; name: string };

const NewGameModal = (props: { showModal: boolean; closeModal: () => void; onGameCreated: (gameId: string) => void; }) => {
  const { showModal, closeModal, onGameCreated } = props;
  const [winningScore, setWinningScore] = useState('50');
  const [goBackToScore, setGoBackToScore] = useState('25');
  const [outAfterThreeMisses, setOutAfterThreeMisses] = useState(false);
  const [outAfterThreeTimesOver, setOutAfterThreeTimesOver] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]); // unified array
  const [readyToStart, setReadyToStart] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, addFriends } = authContext;
  
  // Get friends from user context
  const friends = user?.friends || [];

  const theme = useTheme();
  const styles = useStyles(theme);

  const resetModal = () => {
    setWinningScore('50');
    setGoBackToScore('25');
    setOutAfterThreeMisses(false);
    setOutAfterThreeTimesOver(false);
    setPlayers([]);
    setReadyToStart(false);
    setCreatingGame(false);
    setError(null);
    setShowAddModal(false);
    setNewPlayerName('');
    closeModal();
  };

  // Derive selectedFriendIds from players
  const selectedFriendIds = players.filter(p => friends.some(f => f.id === p.id)).map(p => p.id);

  // When MultiSelectInput changes, update players array to include selected friends (preserving custom players and order)
  const handleSetFriendIds = (newIds: string[]) => {
    const customPlayers = players.filter(
      p => !friends.some(f => f.id === p.id)
    );
    const selectedFriends = friends.filter(f => newIds.includes(f.id));
    setPlayers([...selectedFriends, ...customPlayers]);
  };

  // Add new custom player
  const handleAddCustomPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    // Prevent duplicate names (case-insensitive)
    if (
      players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())
    ) return;
    setPlayers([...players, { id: String(uuid.v4()), name: trimmed }]);
    setNewPlayerName('');
    setShowAddModal(false);
  };

  // Remove player (friend or custom)
  const removePlayer = (id: string) => {
    // If it's a friend, remove from players
    if (friends.some(f => f.id === id)) {
      setPlayers(players.filter(p => p.id !== id));
    } else {
      // Remove custom player directly
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const startGame = async () => {
    setCreatingGame(true);
    setError(null);
    try {
      // Identify new players who aren't already friends
      const existingFriendIds = friends.map(f => f.id);
      const newFriends = players.filter(
        player => !existingFriendIds.includes(player.id) && friends.every(f => f.id !== player.id)
      );
      
      // Add new players as friends if any (async, no await)
      if (newFriends.length > 0) {
        addFriends(newFriends);
      }

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
        scores: players.map(player => ({
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
        whichPlayersTurn: players[0].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // console.log('-- gameData --', gameData);
      const newGame = await createGame(gameData);
      console.log('-- newGame (in Modal) --', newGame);
      if(newGame) {
        onGameCreated(newGame);
        resetModal();
      } else {
        setError('Failed to create game. Please try again.');
      }
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.log('-- Error creating game --', err);
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

  // Shuffle order for players
  const shuffleOrder = () => {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPlayers(shuffled);
    // No need to update selectedFriendIds, it's derived from players
  };

  return (
    <>
      <Modal
        isVisible={showModal}
        onBackButtonPress={resetModal}
        onBackdropPress={resetModal}
        avoidKeyboard={true}
        style={{ padding: 0, margin: 0 }}
      >
        <View style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Button
                variant="onModalHeader"
                onPress={resetModal}
                size="small"
              >
                Cancel
              </Button>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text color={theme.colors.onBackground} bold size={TextSizes.M}>
                New Game
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Button onPress={startGame} disabled={!readyToStart || creatingGame} variant="onModalHeader">
                Start
              </Button>
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{padding: 5}}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 0}}>
              <IconButton
                icon="shuffle"
                mode="outlined"
                iconColor={theme.colors.primary}
                size={typography.fontSizeXXL}
                onPress={shuffleOrder}
                disabled={players.length < 2 || creatingGame}
                style={{marginLeft: 0}}
              />
              <View style={{flex: 1, marginBottom: 5}}>
                <MultiSelectInput
                  placeholder="Select Friends"
                  label="Select Friends"
                  focusPlaceholder='...'
                  searchPlaceholder="Search..."
                  renderLeftIcon={(item) => (
                    <View style={{paddingRight: 10}}>
                      <Icon
                        size={typography.fontSizeXS * 2}
                        name={'user'}
                      />
                    </View>
                  )}
                  search={true}
                  data={friends
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(f => ({
                      label: f.name,
                      value: f.id,
                      // Disable if a custom player with the same name exists (case-insensitive)
                      disabled: players.some(
                        p => p.name.toLowerCase() === f.name.toLowerCase() && !friends.some(mf => mf.id === p.id)
                      )
                    }))}
                  values={selectedFriendIds}
                  setValues={handleSetFriendIds as (values: string[]) => void}
                  valueField="value"
                  renderItem={(item) => {
                    const isSelected = selectedFriendIds.includes(item.value);
                    // Use color constants directly since theme.colors typing is incomplete
                    const disabledBg = theme.colors.disabled;
                    const onDisabled = theme.colors.onDisabled;
                    return (
                      <View style={{
                        paddingLeft: 5,
                        backgroundColor: isSelected ? disabledBg : 'black',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Avatar 
                          name={item.label}
                          size={typography.fontSizeXS * 2}
                          textSize={TextSizes.S}
                          variant="circle"
                          absolute={false}
                        />
                        <Text style={{
                          padding: 10,
                          color: isSelected ? onDisabled : theme.colors.onBackground
                        }}>{item.label}</Text>
                      </View>
                    );
                  }}
                />
              </View>
            </View>
            {/* Chips for all players */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
              {players.map(player => (
                <Animated.View
                  key={player.id}
                  entering={FadeInUp.duration(200).delay(100)}
                  exiting={FadeOutDown.duration(200)}
                  layout={LinearTransition}
                >
                  <Chip
                    key={player.id}
                    icon={() => (
                      <Avatar 
                        name={player.name}
                        size={typography.fontSizeS * 2}
                        textSize={TextSizes.S}
                        variant="circle"
                        absolute={false}
                      />
                    )}
                    closeIcon={() => (
                      <Icon size={typography.fontSizeS * 2} name="close" />
                    )}
                    onClose={() => removePlayer(player.id)}
                    style={{ marginRight: 6, marginBottom: 6 }}
                  >
                    {player.name}
                  </Chip>
                </Animated.View>
              ))}
            </View>
            {/* Add New Player button */}
            <Button onPress={() => setShowAddModal(true)} style={{ marginBottom: 10 }}>
              Add New Player
            </Button>
            {/* Modal for adding custom player */}
            <Modal
              isVisible={showAddModal}
              onBackButtonPress={() => setShowAddModal(false)}
              onBackdropPress={() => setShowAddModal(false)}
              avoidKeyboard={true}
              style={{ padding: 0, margin: 0 }}
            >
              <View style={styles.modalBody}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, alignItems: "flex-start" }}>
                    <Button
                      variant="onModalHeader"
                      onPress={() => setShowAddModal(false)}
                    >
                      Cancel
                    </Button>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text color={theme.colors.onBackground} bold>
                      Add Player
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button onPress={handleAddCustomPlayer} variant="onModalHeader" disabled={!newPlayerName.trim()}>
                      Add
                    </Button>
                  </View>
                </View>
                <View style={{ padding: 10, alignItems: "center" }}>
                  <TextInput
                    value={newPlayerName}
                    onChangeText={setNewPlayerName}
                    label="Player Name"
                    autoCapitalize="words"
                    autoFocus
                    onSubmitEditing={handleAddCustomPlayer}
                    returnKeyType="done"
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                  />
                </View>
              </View>
            </Modal>
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
            <View style={styles.textInputWrapper}>
              <TextInput 
                value={winningScore} 
                onChangeText={setWinningScore}
                label="Target Score" 
                keyboardType="number-pad"
                placeholder="Points to Win"
                clearButtonMode="while-editing"
                maxLength={3}
              />
            </View>
            <View style={styles.textInputWrapper}>
              <TextInput 
                label='Fall-Back-To Points'
                value={goBackToScore}
                onChangeText={setGoBackToScore}
                keyboardType="number-pad"
                placeholder="Go-Over Points"
                clearButtonMode="while-editing"
                maxLength={3}
              />
            </View>
            {creatingGame && (
              <ActivityIndicator size="large" />
            )}
            {error && <Text color={theme.colors.error}>{error}</Text>}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default NewGameModal;

const useStyles = (theme: any) => {
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
    },
  });
}