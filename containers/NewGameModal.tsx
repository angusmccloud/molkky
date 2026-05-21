import React, { useState, useEffect, useContext, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeOutDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import Avatar from '@/components/Avatar';
import MultiSelectInput from '@/components/MultiSelectInput';
import typography from '@/constants/Typography';
import IconButton from "@/components/IconButton";
import DraggableList, {
  DraggableListRenderItemInfo,
  GestureDetector,
} from '@/components/DraggableList';

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
  const [newPlayerName, setNewPlayerName] = useState('');

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { effectiveUid, friends, addFriends } = authContext;

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
    setNewPlayerName('');
    closeModal();
  };

  // Derive selectedFriendIds from players
  const selectedFriendIds = players.filter(p => friends.some(f => f.id === p.id)).map(p => p.id);

  // When MultiSelectInput changes, update players array to include selected friends (preserving custom players and order)
  const handleSetFriendIds = (newIds: string[]) => {
    // Keep custom players in their existing positions, and keep already-selected friends in place too.
    // Append newly-added friends at the end. Remove friends that were deselected.
    const newIdSet = new Set(newIds);
    // Filter: keep custom players + still-selected friends in current order
    const retained = players.filter(
      p => !friends.some(f => f.id === p.id) || newIdSet.has(p.id)
    );
    const existingIds = new Set(retained.map(p => p.id));
    const newlyAddedFriends = friends.filter(
      f => newIdSet.has(f.id) && !existingIds.has(f.id)
    );
    setPlayers([...retained, ...newlyAddedFriends]);
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
  };

  // Remove player (friend or custom)
  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
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
        uid: effectiveUid,
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
  };

  // Stable keyExtractor for DraggableList
  const keyExtractor = useCallback((item: Player) => item.id, []);

  // Render each draggable player row
  const renderPlayerRow = useCallback(
    ({ item, drag, isActive }: DraggableListRenderItemInfo<Player>) => {
      return (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutDown.duration(200)}
          style={styles.playerRowOuter}
        >
          <View
            style={[
              styles.playerRow,
              isActive && styles.playerRowActive,
            ]}
          >
            <View style={styles.playerRowLeft}>
              <Avatar
                name={item.name}
                size={typography.fontSizeS * 2.4}
                textSize={TextSizes.S}
                variant="circle"
                absolute={false}
              />
              <Text
                style={styles.playerRowName}
                color={theme.colors.onBackground}
                size={TextSizes.M}
              >
                {item.name}
              </Text>
            </View>
            <View style={styles.playerRowRight}>
              <GestureDetector gesture={drag}>
                <View
                  style={styles.dragHandle}
                  hitSlop={8}
                  accessibilityLabel={`Drag handle for ${item.name}`}
                  accessibilityHint="Press and hold, then drag to reorder"
                >
                  <MaterialCommunityIcons
                    name="drag-horizontal-variant"
                    size={typography.fontSizeXL}
                    color={theme.colors.onBackground}
                  />
                </View>
              </GestureDetector>
              <IconButton
                icon="close"
                size={typography.fontSizeM}
                onPress={() => removePlayer(item.id)}
                disabled={creatingGame}
                accessibilityLabel={`Remove ${item.name}`}
              />
            </View>
          </View>
        </Animated.View>
      );
    },
    [styles, theme, creatingGame]
  );

  return (
    <>
      <Modal
        isVisible={showModal}
        onBackButtonPress={resetModal}
        onBackdropPress={resetModal}
        avoidKeyboard={true}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={{ padding: 0, margin: 0 }}
      >
        <View style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Button
                variant="onModalHeader"
                onPress={resetModal}
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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 0 }}>
              <IconButton
                icon="shuffle"
                mode="outlined"
                iconColor={theme.colors.primary}
                size={typography.fontSizeXXL}
                onPress={shuffleOrder}
                disabled={players.length < 2 || creatingGame}
                style={{ marginLeft: 0 }}
              />
              <View style={{ flex: 1, marginBottom: 5 }}>
                <MultiSelectInput
                  placeholder="Select Friends"
                  label="Select Friends"
                  focusPlaceholder='...'
                  data={friends
                    .slice()
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
                  renderItem={(item: { label: string; value: string; disabled?: boolean }) => {
                    const isSelected = selectedFriendIds.includes(item.value);
                    // Use color constants directly since theme.colors typing is incomplete
                    const disabledBg = (theme.colors as any).disabled;
                    const onDisabled = (theme.colors as any).onDisabled;
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
            {players.length > 0 && (
              <Text
                size={TextSizes.XS}
                color={theme.colors.onBackground}
                style={styles.reorderHint}
              >
                Press and hold the handle to reorder players
              </Text>
            )}
            {players.length > 0 && (
              <DraggableList
                data={players}
                keyExtractor={keyExtractor}
                onReorder={setPlayers}
                renderItem={renderPlayerRow}
              />
            )}
            {/* Add New Player input */}
            <View style={styles.addPlayerContainer}>
              <View style={styles.addPlayerInputContainer}>
                <TextInput
                  value={newPlayerName}
                  onChangeText={setNewPlayerName}
                  label="Add New Player"
                  placeholder="Enter player name"
                  autoCapitalize="words"
                  onSubmitEditing={handleAddCustomPlayer}
                  returnKeyType="done"
                  style={styles.addPlayerInput}
                />
              </View>
              <IconButton
                icon="plus"
                mode="outlined"
                iconColor={theme.colors.primary}
                size={typography.fontSizeL}
                onPress={handleAddCustomPlayer}
                disabled={!newPlayerName.trim() || creatingGame}
                style={styles.addPlayerButton}
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
    listContent: {
      padding: 5,
      paddingBottom: 20,
    },
    playerRowOuter: {
      flex: 1,
    },
    playerRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginVertical: 3,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
    },
    playerRowActive: {
      // Visual feedback while dragging
      backgroundColor: theme.colors.elevation?.level2 ?? theme.colors.background,
      borderColor: theme.colors.primary,
    },
    playerRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      flex: 1,
    },
    playerRowName: {
      marginLeft: 10,
      flexShrink: 1,
    },
    playerRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dragHandle: {
      paddingHorizontal: 6,
      paddingVertical: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reorderHint: {
      marginTop: 4,
      marginBottom: 2,
      marginLeft: 4,
      opacity: 0.7,
      fontStyle: 'italic',
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
    addPlayerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      marginTop: 6,
    },
    addPlayerInputContainer: {
      flex: 1,
      marginRight: 10,
    },
    addPlayerInput: {
      // Additional styles can be added here if needed
    },
    addPlayerButton: {
      // Additional styles can be added here if needed
    },
  });
}
