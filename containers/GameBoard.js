import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import Share from 'react-native-share';
import { useTheme } from 'react-native-paper';
import Button from '@/components/Button';
import Text from '@/components/Text';
import IconButton from '@/components/IconButton';
import PlayerStatus from './PlayerStatus';
import AddPlayerModal from './AddPlayerModal';
import ActivityIndicator from '@/components/ActivityIndicator';
import { getGame, updateGame, createGame } from '@/services/games';
import useBottomContentInset from '@/hooks/useBottomContentInset';
import useStyles from './GameBoardStyles';
import typography from '@/constants/Typography';

const appIcon = require('@/assets/images/icon.png');

const GameBoard = (props) => {
  const [turnPosting, setTurnPosting] = useState(false);
  const [game, setGame] = useState(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const { gameId, updateGameStatus, onGameCreated } = props;

  const theme = useTheme();
  const styles = useStyles(theme);
  // Pad the bottom past the (iOS-absolute) tab bar and the floating ad
  // banner so the action buttons sit above both.
  const bottomInset = useBottomContentInset();

  // All hooks must run before any early return (rules-of-hooks) — the
  // `if (!gameId) return null` guard lives below this effect. The effect
  // itself no-ops when gameId is falsy.
  useEffect(() => {
    const fetchGame = async (gameId) => {
      try {
        const fetchedGame = await getGame(gameId);
        if (fetchedGame) {
          setGame(fetchedGame);
        }
      } catch (err) {
        console.log('error fetching game (Board)', err);
      }
    };

    if (gameId) {
      fetchGame(gameId);
    }
    // Intentionally only re-fetch when gameId changes. After mount, this
    // component owns its own game state — mutations update React state
    // directly and write through to local storage. Refetching on parent
    // re-renders would race with in-flight local writes and overwrite
    // fresh state with stale.
  }, [gameId]);

  if (!gameId) {
    return null;
  }

  if (!game) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading Game...</Text>
        <ActivityIndicator style={{marginTop: 10}} size={100} />
      </View>
    );
  }

  const { 
    createdAt, 
    updatedAt,
    gameStatus, 
    rules, 
    whichPlayersTurn, 
    gameRound, 
    players, 
    scores, 
    turns, 
    winningPlayerId 
  } = game;

  const getNextPlayerIdFrom = (currentPlayerId, scoresSource) => {
    const currentPlayerIndex = players.findIndex(player => player.id === currentPlayerId);
    let nextIndex = (currentPlayerIndex + 1) % players.length;

    while (scoresSource.find(s => s.playerId === players[nextIndex].id)?.isOut) {
      nextIndex = (nextIndex + 1) % players.length;
      if (nextIndex === currentPlayerIndex) break;
    }

    return players[nextIndex].id;
  };

  const getNextPlayerId = (currentPlayerId) => getNextPlayerIdFrom(currentPlayerId, scores);

  const checkForWinByElimination = (newScores) => {
    const playersNotOut = newScores.filter(score => !score.isOut);
    return playersNotOut.length === 1 ? playersNotOut[0].playerId : null;
  };

  const logScore = async (score) => {
    if (!turnPosting) {
      setTurnPosting(true);

      const currentPlayerIndex = players.findIndex(player => player.id === whichPlayersTurn);
      const newRound = players[currentPlayerIndex + 1] ? gameRound : gameRound + 1;
      const currentScoreEntry = scores.find(s => s.playerId === whichPlayersTurn);
      const startingScore = currentScoreEntry.score;
      const startingMisses = currentScoreEntry.misses;
      const startingTimesOver = currentScoreEntry.timesOver;
      const endingScore = startingScore + score > rules.winningScore ? rules.goBackToScore : startingScore + score;
      const winningTurn = endingScore === rules.winningScore;
      const wentOver = startingScore + score > rules.winningScore;
      const gotZero = score === 0;

      const newScores = scores.map(scoreEntry => {
        if (scoreEntry.playerId === whichPlayersTurn) {
          // `misses` is the *consecutive*-zero streak; any pin contact (1-12) resets it,
          // even when the score caused a go-over reset.
          const currentMisses = gotZero ? scoreEntry.misses + 1 : 0;
          const currentTimesOver = wentOver ? scoreEntry.timesOver + 1 : scoreEntry.timesOver;

          const eliminatedByMisses = rules.outAfterThreeMisses && currentMisses >= 3;
          const eliminatedByOvers = rules.outAfterThreeTimesOver && currentTimesOver >= 3;
          const isOut = eliminatedByMisses || eliminatedByOvers;

          return {
            ...scoreEntry,
            score: endingScore,
            misses: currentMisses,
            timesOver: currentTimesOver,
            isOut: isOut,
          };
        } else {
          return scoreEntry;
        }
      });

      const winByElimination = checkForWinByElimination(newScores);
      const finalWinningTurn = winningTurn || winByElimination;
      const finalWinningPlayerId = winningTurn ? whichPlayersTurn : winByElimination;

      // Use newScores so a just-eliminated current player isn't picked as the next turn.
      const nextPlayerId = getNextPlayerIdFrom(whichPlayersTurn, newScores);

      const thisTurn = {
        playerId: whichPlayersTurn,
        score,
        gameRound,
        startingScore,
        startingMisses,
        startingTimesOver,
        winnableTurn: (rules.winningScore - startingScore) <= 12,
        wonOnTurn: winningTurn,
        endingScore,
        skipped: false,
        wentOver: startingScore + score > rules.winningScore,
        eliminated: newScores.find(s => s.playerId === whichPlayersTurn).isOut,
        gotZero: score === 0,
      };
      const newTurns = [...turns, thisTurn];

      try {

        const newGame = {
          ...game,
          updatedAt: new Date().toISOString(),
          whichPlayersTurn: finalWinningTurn ? whichPlayersTurn : nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          scores: newScores,
          gameStatus: finalWinningTurn ? 'finished' : game.gameStatus,
          winningPlayerId: finalWinningTurn ? finalWinningPlayerId : game.winningPlayerId ? game.winningPlayerId : null,
        };
        setGame(newGame);
        await updateGame(game.id, newGame);
        if (finalWinningTurn) {
          updateGameStatus(newGame);
        }
        setTurnPosting(false);
      
      } catch (err) {
        console.log('error posting Score Items', err);
        setTurnPosting(false);
      }
    }
  };

  const undoTurn = async () => {
    if (!turnPosting) {
      setTurnPosting(true);

      const lastTurn = turns[turns.length - 1];
      const newTurns = turns.slice(0, turns.length - 1);

      const nextPlayerId = lastTurn.playerId;
      const newRound = lastTurn.gameRound;
      const newScores = scores.map(scoreEntry => {
        if (scoreEntry.playerId === lastTurn.playerId) {
          // Prefer the snapshot stored on the turn (correct restore for any case,
          // including non-zero scores that reset the streak). Fall back to a
          // best-effort delta for older turns that predate the snapshot fields.
          let newMisses;
          if (lastTurn.startingMisses !== undefined) {
            newMisses = lastTurn.startingMisses;
          } else if (lastTurn.gotZero && scoreEntry.misses > 0) {
            newMisses = scoreEntry.misses - 1;
          } else {
            newMisses = scoreEntry.misses;
          }

          let newTimesOver;
          if (lastTurn.startingTimesOver !== undefined) {
            newTimesOver = lastTurn.startingTimesOver;
          } else if (lastTurn.wentOver && scoreEntry.timesOver > 0) {
            newTimesOver = scoreEntry.timesOver - 1;
          } else {
            newTimesOver = scoreEntry.timesOver;
          }

          const eliminatedByMisses = rules.outAfterThreeMisses && newMisses >= 3;
          const eliminatedByOvers = rules.outAfterThreeTimesOver && newTimesOver >= 3;
          const isOut = eliminatedByMisses || eliminatedByOvers;

          return {
            ...scoreEntry,
            score: lastTurn.startingScore,
            misses: newMisses,
            timesOver: newTimesOver,
            isOut: isOut,
          };
        } else {
          return scoreEntry;
        }
      });

      try {
        const newGame = {
          ...game,
          updatedAt: new Date().toISOString(),
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          scores: newScores,
          gameStatus: 'inProgress',
          winningPlayerId: null,
        }
        setGame(newGame);
        await updateGame(game.id, newGame);
        if (winningPlayerId) {
          updateGameStatus('inProgress');
        }
        setTurnPosting(false);
      } catch (err) {
        console.log('error posting Undo Turn', err);
        setTurnPosting(false);
      }
    }
  };

  const skipTurn = async () => {
    if (!turnPosting) {
      setTurnPosting(true);

      const currentPlayerIndex = players.findIndex(player => player.id === whichPlayersTurn);
      const nextPlayerId = getNextPlayerId(whichPlayersTurn);
      const newRound = players[currentPlayerIndex + 1] ? gameRound : gameRound + 1;
      const currentScoreEntry = scores.find(s => s.playerId === whichPlayersTurn);
      const startingScore = currentScoreEntry.score;

      // A skip is "as if the turn never happened" for elimination rules:
      // it doesn't count as a zero and doesn't reset the streak.
      const thisTurn = {
        playerId: whichPlayersTurn,
        score: 0,
        gameRound,
        startingScore,
        startingMisses: currentScoreEntry.misses,
        startingTimesOver: currentScoreEntry.timesOver,
        winnableTurn: (rules.winningScore - startingScore) <= 12,
        wonOnTurn: false,
        endingScore: startingScore,
        skipped: true,
        wentOver: false,
        eliminated: false,
        gotZero: false,
      };
      const newTurns = [...turns, thisTurn];

      try {
        const newGame = {
          ...game,
          updatedAt: new Date().toISOString(),
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          gameStatus: game.gameStatus,
          winningPlayerId: game.winningPlayerId,
        };
        setGame(newGame);
        await updateGame(game.id, newGame);
        setTurnPosting(false);
      } catch (err) {
        console.log('error posting Skip Turn', err);
        setTurnPosting(false);
      }
    }
  };

  const playAgain = async () => {
    if (!turnPosting) {
      try {
        const newGameData = {
          uid: game.uid,
          players: game.players,
          rules: game.rules,
          scores: game.players.map(player => ({
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),

        };
        const newGameId = await createGame(newGameData);
        onGameCreated(newGameId);
      } catch (err) {
        console.log('error starting new game', err);
      }
    }
  };

  const shareResult = async () => {
    try {
      const winnerName = players.find((p) => p.id === winningPlayerId)?.name || 'Someone';
      const standings = scores
        .map((s) => ({
          name: players.find((p) => p.id === s.playerId)?.name || 'Player',
          score: s.score,
          isOut: s.isOut,
        }))
        .sort((a, b) => b.score - a.score)
        .map((s, i) => `${i + 1}. ${s.name} — ${s.score}${s.isOut ? ' (out)' : ''}`)
        .join('\n');
      const message = `🎯 Mölkky result\n${winnerName} wins!\n\n${standings}`;

      if (Platform.OS === 'ios') {
        // Resolve the bundled app icon to a base64 data URI. iOS uses it only
        // for the share-sheet preview thumbnail (linkMetadata.icon) — the
        // shared item is the text (item.default), so the icon is NOT attached
        // to the message. See react-native-share activityItemSources docs.
        let iconDataUri;
        try {
          const asset = Asset.fromModule(appIcon);
          await asset.downloadAsync(); // ensure a local file URI exists
          if (asset.localUri) {
            const base64 = await new File(asset.localUri).base64();
            iconDataUri = `data:image/png;base64,${base64}`;
          }
        } catch (iconErr) {
          // Non-fatal — share still works, just without the custom preview icon.
          console.log('could not load app icon for share preview', iconErr);
        }

        await Share.open({
          failOnCancel: false, // dismissing the sheet shouldn't throw
          activityItemSources: [
            {
              placeholderItem: iconDataUri
                ? { type: 'url', content: iconDataUri }
                : { type: 'text', content: message },
              item: {
                default: { type: 'text', content: message },
              },
              linkMetadata: iconDataUri
                ? { title: message, icon: iconDataUri }
                : { title: message },
            },
          ],
        });
      } else {
        await Share.open({ message, failOnCancel: false });
      }
    } catch (err) {
      console.log('error sharing result', err);
    }
  };

  const addPlayerToGame = ({ newPlayer, insertAfterPlayerId, startingScore }) => {
    if (!game || gameStatus !== 'inProgress') return;

    // Build the new players array: splice in after the chosen player, or push to end.
    let newPlayers;
    if (insertAfterPlayerId) {
      const idx = players.findIndex((p) => p.id === insertAfterPlayerId);
      if (idx === -1) {
        newPlayers = [...players, newPlayer];
      } else {
        newPlayers = [
          ...players.slice(0, idx + 1),
          newPlayer,
          ...players.slice(idx + 1),
        ];
      }
    } else {
      newPlayers = [...players, newPlayer];
    }

    const newScores = [
      ...scores,
      {
        playerId: newPlayer.id,
        score: startingScore || 0,
        timesOver: 0,
        misses: 0,
        isOut: false,
        isWinner: false,
      },
    ];

    const newGame = {
      ...game,
      players: newPlayers,
      scores: newScores,
      updatedAt: new Date().toISOString(),
    };
    setGame(newGame);
    updateGame(game.id, newGame);
  };

  const playersInOrder = [];
  const endOfOrder = [];
  let foundCurrentPlayer = false;
  players.forEach(player => {
    if (player.id === whichPlayersTurn || foundCurrentPlayer) {
      playersInOrder.push(player);
      foundCurrentPlayer = true;
    } else {
      endOfOrder.push(player);
    }
  });
  playersInOrder.push(...endOfOrder);

  // Don't disable buttons for eliminated players - they can still be undone
  const currentPlayerEliminated = scores.find(s => s.playerId === whichPlayersTurn)?.isOut;

  return (
    <View style={[styles.pageWrapper, { paddingBottom: bottomInset }]}>
      <ScrollView style={styles.scrollablePageWrapper} keyboardShouldPersistTaps='always'>
        {playersInOrder.map((player, index) => {
          return (
            <PlayerStatus key={player.id} player={player} winningPlayerId={winningPlayerId} whichPlayersTurn={whichPlayersTurn} gameStatus={gameStatus} scores={scores} turns={turns} updatedAt={updatedAt} rules={rules} />
          )
        })}
        {gameStatus === 'inProgress' && (
          <View style={styles.addPlayerRow}>
            <IconButton
              icon="account-plus"
              iconColor={theme.colors.onPrimary}
              containerColor={theme.colors.primary}
              size={typography.fontSizeL}
              onPress={() => setShowAddPlayerModal(true)}
              accessibilityLabel="Add player to game"
            />
            <Text size='S' style={styles.addPlayerLabel}>
              Add Player
            </Text>
          </View>
        )}
      </ScrollView>
      <AddPlayerModal
        showModal={showAddPlayerModal}
        closeModal={() => setShowAddPlayerModal(false)}
        players={players}
        whichPlayersTurn={whichPlayersTurn}
        winningScore={rules.winningScore}
        onAddPlayer={addPlayerToGame}
      />
      <View style={styles.buttonSectionWrapper}>
        {gameStatus === 'inProgress' ? (
          <>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(1)} >
                  <Text size='XL' color='white'>1</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(2)} >
                  <Text size='XL' color='white'>2</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(3)} >
                  <Text size='XL' color='white'>3</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(4)} >
                  <Text size='XL' color='white'>4</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(5)} >
                  <Text size='XL' color='white'>5</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(6)} >
                  <Text size='XL' color='white'>6</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(7)} >
                  <Text size='XL' color='white'>7</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(8)} >
                  <Text size='XL' color='white'>8</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(9)} >
                  <Text size='XL' color='white'>9</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(10)} >
                  <Text size='XL' color='white'>10</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(11)} >
                  <Text size='XL' color='white'>11</Text>
                </Pressable>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(12)} >
                  <Text size='XL' color='white'>12</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => undoTurn()} disabled={turns.length === 0} >
                  Undo
                </Button>
              </View>
              <View style={styles.threeButtonWrapper}>
                <Pressable style={styles.fourWideButton} onPress={() => logScore(0)} >
                  <Text size='XL' color='white'>0</Text>
                </Pressable>
              </View>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => skipTurn()} >
                  Skip
                </Button>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ padding: 10, alignItems: 'center' }}>
              <Text bold size='XL'>
                {players.find((p) => p.id === winningPlayerId)?.name || 'Winner'} Wins!
              </Text>
              {/* Show if win was by elimination */}
              {scores.filter(s => !s.isOut).length === 1 && (
                <Text size='M' style={{ color: theme.colors.primary, marginTop: 5 }}>
                  Victory by Elimination!
                </Text>
              )}
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.twoButtonWrapper}>
                <Button onPress={() => undoTurn()}>
                  Undo Last Turn
                </Button>
              </View>
              <View style={styles.twoButtonWrapper}>
                <Button onPress={() => playAgain()}>
                  Play Again
                </Button>
              </View>
            </View>
            {/* Match the two-button row above: full row width (flex:1 fills
                the row, so it spans both buttons + the gap between them) and
                paddingTop:10 so the gap above mirrors the gap the buttons have
                to the winner text above them. */}
            <View style={{ flexDirection: 'row', paddingTop: 10, paddingHorizontal: 10, paddingBottom: 10 }}>
              <Button
                variant="secondary"
                icon="share-variant"
                onPress={shareResult}
                style={{ flex: 1 }}
              >
                Share Result
              </Button>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default GameBoard;