import React, { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button from '@/components/Button';
import Text from '@/components/Text';
import styles from './GameBoardStyles';
import PlayerStatus from './PlayerStatus';
import { updateGame, createGame } from '@/services/games';

const GameBoard = (props) => {
  const [turnPosting, setTurnPosting] = useState(false);

  const { game } = props;
  const { createdAt, gameStatus, rules, whichPlayersTurn, gameRound, players, scores, turns, winningPlayerId } = game;

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
        await updateGame(game.id, {
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          scores: newScores,
          gameStatus: winningTurn ? 'finished' : game.gameStatus,
          winningPlayerId: winningTurn ? whichPlayersTurn : game.winningPlayerId,
        });
        setTimeout(() => {
          setTurnPosting(false);
        }, 300);
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
        await updateGame(game.id, {
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
          scores: newScores,
          gameStatus: 'inProgress',
          winningPlayerId: null,
        });
        setTimeout(() => {
          setTurnPosting(false);
        }, 300);
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
        await updateGame(game.id, {
          whichPlayersTurn: nextPlayerId,
          turns: newTurns,
          gameRound: newRound,
        });
        setTimeout(() => {
          setTurnPosting(false);
        }, 300);
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
          owner: game.owner,
          players: game.players,
          scores: game.players.map(player => ({
            playerId: player.id,
            score: 0,
          })),
          gameStatus: 'inProgress',
          rules: game.rules,
          turns: [],
          whichPlayersTurn: game.players[0].id,
          gameRound: 1,
        };
        await createGame(newGameData);
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
      <KeyboardAwareScrollView style={styles.scrollablePageWrapper} keyboardShouldPersistTaps='always'>
        {playersInOrder.map((player, index) => {
          return (
            <PlayerStatus key={player.id} player={player} winningPlayerId={winningPlayerId} whichPlayersTurn={whichPlayersTurn} gameStatus={gameStatus} scores={scores} turns={turns} />
          )
        })}
      </KeyboardAwareScrollView>
      <View style={styles.buttonSectionWrapper}>
        {gameStatus === 'inProgress' ? (
          <>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(1)} text='1' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(2)} text='2' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(3)} text='3' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(4)} text='4' />
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(5)} text='5' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(6)} text='6' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(7)} text='7' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(8)} text='8' />
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(9)} text='9' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(10)} text='10' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(11)} text='11' />
              </View>
              <View style={styles.fourButtonWrapper}>
                <Button onPress={() => logScore(12)} text='12' />
              </View>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => undoTurn()} text='Undo' disabled={turns.length === 0} />
              </View>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => logScore(0)} text='0' />
              </View>
              <View style={styles.threeButtonWrapper}>
                <Button onPress={() => skipTurn()} text='Skip' />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ padding: 10, alignItems: 'center' }}>
              <Text bold size='XL'>
                {players.find((p) => p.id === winningPlayerId).name} Won!
              </Text>
            </View>
            <View style={styles.buttonsWrapper}>
              <View style={styles.twoButtonWrapper}>
                <Button onPress={() => undoTurn()} text='Undo Last Turn' disabled={turns.length === 0} />
              </View>
              <View style={styles.twoButtonWrapper}>
                <Button onPress={() => playAgain()} text='Play Again' />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default GameBoard;