import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import Button from '@/components/Button';
import Text from '@/components/Text';
import PlayerStatus from './PlayerStatus';
import ActivityIndicator from '@/components/ActivityIndicator';
import { getGame, updateGame, createGame } from '@/services/games';
import useStyles from './GameBoardStyles';


const GameBoard = (props) => {
  const [turnPosting, setTurnPosting] = useState(false);
  const [game, setGame] = useState(null);
  const { gameId, updateGameStatus, onGameCreated } = props;

  const theme = useTheme();
  const styles = useStyles(theme);

  if(!gameId) {
    return null;
  }

  useEffect(() => {
    const fetchGame = async (gameId) => {
      try {
        const fetchedGame = await getGame(gameId);
        if (fetchedGame) {
          setGame(fetchedGame);
        }
        // console.log("FETCH THAT GAME", gameId);
      } catch (err) {
        console.log('error fetching game (Board)', err);
      }
    };

    if(gameId && updateGameStatus) {
      fetchGame(gameId);
    }
  }, [gameId, updateGameStatus]);

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

  const getNextPlayerId = (currentPlayerId) => {
    const currentPlayerIndex = players.findIndex(player => player.id === currentPlayerId);
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    
    // Skip eliminated players
    while (scores.find(s => s.playerId === players[nextIndex].id).isOut) {
      nextIndex = (nextIndex + 1) % players.length;
      // If we've gone through all players and they're all eliminated except one, break
      if (nextIndex === currentPlayerIndex) break;
    }
    
    return players[nextIndex].id;
  };

  const checkForWinByElimination = (newScores) => {
    const playersNotOut = newScores.filter(score => !score.isOut);
    return playersNotOut.length === 1 ? playersNotOut[0].playerId : null;
  };

  const logScore = async (score) => {
    if (!turnPosting) {
      setTurnPosting(true);

      const currentPlayerIndex = players.findIndex(player => player.id === whichPlayersTurn);
      const nextPlayerId = getNextPlayerId(whichPlayersTurn);
      const newRound = players[currentPlayerIndex + 1] ? gameRound : gameRound + 1;
      const startingScore = scores.filter(score => score.playerId === whichPlayersTurn)[0].score;
      const endingScore = startingScore + score > rules.winningScore ? rules.goBackToScore : startingScore + score;
      const winningTurn = endingScore === rules.winningScore;
      const wentOver = startingScore + score > rules.winningScore;
      const gotZero = score === 0;
      
      const newScores = scores.map(scoreEntry => {
        if (scoreEntry.playerId === whichPlayersTurn) {
          const currentMisses = gotZero ? scoreEntry.misses + 1 : 0;
          const currentTimesOver = wentOver ? scoreEntry.timesOver + 1 : scoreEntry.timesOver;
          
          // Check for elimination
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

      // Check for win by elimination
      const winByElimination = checkForWinByElimination(newScores);
      const finalWinningTurn = winningTurn || winByElimination;
      const finalWinningPlayerId = winningTurn ? whichPlayersTurn : winByElimination;

      const thisTurn = {
        playerId: whichPlayersTurn,
        score,
        gameRound,
        startingScore,
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
        updateGame(game.id, newGame);
        setGame(newGame);
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
          // Calculate what the misses and timesOver should be after undoing
          let newMisses = scoreEntry.misses;
          let newTimesOver = scoreEntry.timesOver;
          
          // If the last turn was a zero or skip, decrease misses
          if ((lastTurn.gotZero || lastTurn.skipped) && newMisses > 0) {
            newMisses = newMisses - 1;
          }
          
          // If the last turn went over, decrease timesOver
          if (lastTurn.wentOver && newTimesOver > 0) {
            newTimesOver = newTimesOver - 1;
          }
          
          // Check if player should still be eliminated after undo
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
        updateGame(game.id, newGame);
        setTurnPosting(false);
        if (winningPlayerId) {
          updateGameStatus('inProgress');
        }
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
      const startingScore = scores.filter(score => score.playerId === whichPlayersTurn)[0].score;

      // Handle miss counting for skip (treated as a zero)
      const newScores = scores.map(scoreEntry => {
        if (scoreEntry.playerId === whichPlayersTurn) {
          const currentMisses = scoreEntry.misses + 1; // Skip counts as a miss
          const eliminatedByMisses = rules.outAfterThreeMisses && currentMisses >= 3;
          const eliminatedByOvers = rules.outAfterThreeTimesOver && scoreEntry.timesOver >= 3;
          const isOut = eliminatedByMisses || eliminatedByOvers;
          
          return {
            ...scoreEntry,
            misses: currentMisses,
            isOut: isOut,
          };
        } else {
          return scoreEntry;
        }
      });

      // Check for win by elimination
      const winByElimination = checkForWinByElimination(newScores);

      const thisTurn = {
        playerId: whichPlayersTurn,
        score: 0,
        gameRound,
        startingScore,
        winnableTurn: (rules.winningScore - startingScore) <= 12,
        wonOnTurn: false,
        endingScore: startingScore,
        skipped: true,
        wentOver: false,
        eliminated: newScores.find(s => s.playerId === whichPlayersTurn).isOut,
        gotZero: true, // Skip counts as getting zero
      };
      const newTurns = [...turns, thisTurn];

      try {
        const newGame = {
          ...game,
          updatedAt: new Date().toISOString(),
          whichPlayersTurn: winByElimination ? whichPlayersTurn : nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          scores: newScores,
          gameStatus: winByElimination ? 'finished' : game.gameStatus,
          winningPlayerId: winByElimination ? winByElimination : game.winningPlayerId,
        };
        setGame(newGame);
        updateGame(game.id, newGame);
        if (winByElimination) {
          updateGameStatus(newGame);
        }
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
    <View style={styles.pageWrapper}>
      <ScrollView style={styles.scrollablePageWrapper} keyboardShouldPersistTaps='always'>
        {playersInOrder.map((player, index) => {
          return (
            <PlayerStatus key={player.id} player={player} winningPlayerId={winningPlayerId} whichPlayersTurn={whichPlayersTurn} gameStatus={gameStatus} scores={scores} turns={turns} updatedAt={updatedAt} rules={rules} />
          )
        })}
      </ScrollView>
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
          </>
        )}
      </View>
    </View>
  );
}

export default GameBoard;