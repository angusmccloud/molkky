import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
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

  const logScore = async (score) => {
    if (!turnPosting) {
      setTurnPosting(true);

      const currentPlayerIndex = players.findIndex(player => player.id === whichPlayersTurn);
      const nextPlayerId = players[currentPlayerIndex + 1] ? players[currentPlayerIndex + 1].id : players[0].id;
      const newRound = players[currentPlayerIndex + 1] ? gameRound : gameRound + 1;
      const startingScore = scores.filter(score => score.playerId === whichPlayersTurn)[0].score;
      const endingScore = startingScore + score > rules.winningScore ? rules.goBackToScore : startingScore + score;
      const winningTurn = endingScore === rules.winningScore;
      const newScores = scores.map(score => {
        if (score.playerId === whichPlayersTurn) {
          return {
            playerId: score.playerId,
            score: endingScore,
          };
        } else {
          return score;
        }
      });

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
        eliminated: false,
      };
      const newTurns = [...turns, thisTurn];

      try {

        const newGame = {
          ...game,
          updatedAt: new Date().toISOString(),
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          scores: newScores,
          gameStatus: winningTurn ? 'finished' : game.gameStatus,
          winningPlayerId: winningTurn ? whichPlayersTurn : game.winningPlayerId ? game.winningPlayerId : null,
        };
        updateGame(game.id, newGame);
        setGame(newGame);
        if (winningTurn) {
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
      const newScores = scores.map(score => {
        if (score.playerId === lastTurn.playerId) {
          return {
            playerId: score.playerId,
            score: lastTurn.startingScore,
          };
        } else {
          return score;
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
      const nextPlayerId = players[currentPlayerIndex + 1] ? players[currentPlayerIndex + 1].id : players[0].id;
      const newRound = players[currentPlayerIndex + 1] ? gameRound : gameRound + 1;
      const startingScore = scores.filter(score => score.playerId === whichPlayersTurn)[0].score;

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
        eliminated: false,
      };
      const newTurns = [...turns, thisTurn];

      try {
        const newGame = {
          ...game,
          updatedAt: new Date().toISOString(),
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
        };
        setGame(newGame);
        updateGame(game.id, newGame);
        if (winningTurn) {
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

  return (
    <View style={styles.pageWrapper}>
      <ScrollView style={styles.scrollablePageWrapper} keyboardShouldPersistTaps='always'>
        {playersInOrder.map((player, index) => {
          return (
            <PlayerStatus key={player.id} player={player} winningPlayerId={winningPlayerId} whichPlayersTurn={whichPlayersTurn} gameStatus={gameStatus} scores={scores} turns={turns} updatedAt={updatedAt} />
          )
        })}
      </ScrollView>
      <View style={styles.buttonSectionWrapper}>
        {gameStatus === 'inProgress' ? (
          <>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(1)} >
                  1
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(2)} >
                  2
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(3)} >
                  3
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(4)} >
                  4
                </Button>
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(5)} >
                  5
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(6)} >
                  6
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(7)} >
                  7
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(8)} >
                  8
                </Button>
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(9)} >
                  9
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(10)} >
                  10
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(11)} >
                  11
                </Button>
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(12)} >
                  12
                </Button>
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => undoTurn()} disabled={turns.length === 0} >
                  Undo
                </Button>
              </View>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => logScore(0)} >
                  0
                </Button>
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
                {players.find((p) => p.id === winningPlayerId).name} Wins!
              </Text>
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