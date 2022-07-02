import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Text, Icon, IconButton, Avatar } from '../../components';
import styles from './GameBoardStyles';
import { colors, typography } from '../../styles';
import { DataStore } from '../../utils';
import { Games } from '../../models';

const GameBoard = (props) => {
  const [turnPosting, setTurnPosting] = useState(false);

  const { game } = props;
  // const { createdAt, gameStatus, id, rules, whichPlayersTurn, gameRound } = props.game;
  const { createdAt, gameStatus, id, rules, whichPlayersTurn, gameRound, players, scores, turns, winningPlayerId } = props.game;
  // console.log('-- Game Props --', game);

  const logScore = async (score) => {
    // console.log('-- Score --', score);
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
        }
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
      eliminated: false, // Update this
    };
    // console.log('-- This Turn --', thisTurn);
    const newTurns = [...turns, thisTurn];

    try {
      await DataStore.save(
        Games.copyOf(game, updatedGame => {
          updatedGame.whichPlayersTurn = nextPlayerId;
          updatedGame.turns = newTurns;
          updatedGame.gameRound = newRound;
          updatedGame.scores = newScores;
          updatedGame.gameStatus = winningTurn ? 'finished' : game.gameStatus;
          updatedGame.winningPlayerId = winningTurn ? whichPlayersTurn : game.winningPlayerId;
        })
      );
      setTurnPosting(false);
    } catch (err) {
      console.log('error posting Score Items', err)
      setTurnPosting(false);
    }
  }

  const undoTurn = async () => {
    setTurnPosting(true);

    const lastTurn = turns[turns.length - 1];
    // console.log('-- Last Turn --', lastTurn);
    const newTurns = turns.slice(0, turns.length - 1);

    const nextPlayerId = lastTurn.playerId;
    const newRound = lastTurn.gameRound;
    const newScores = scores.map(score => {
      if (score.playerId === lastTurn.playerId) {
        return {
          playerId: score.playerId,
          score: lastTurn.startingScore,
        }
      } else {
        return score;
      }
    });

    try {
      await DataStore.save(
        Games.copyOf(game, updatedGame => {
          updatedGame.whichPlayersTurn = nextPlayerId;
          updatedGame.turns = newTurns;
          updatedGame.gameRound = newRound;
          updatedGame.scores = newScores;
          updatedGame.gameStatus = 'inProgress';
          updatedGame.winningPlayerId = null;
        })
      );
      setTurnPosting(false);
    } catch (err) {
      console.log('error posting Undo Turn', err)
      setTurnPosting(false);
    }
  }

  const skipTurn = async () => {
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
    // console.log('-- This Turn --', thisTurn);
    const newTurns = [...turns, thisTurn];

    try {
      await DataStore.save(
        Games.copyOf(game, updatedGame => {
          updatedGame.whichPlayersTurn = nextPlayerId;
          updatedGame.turns = newTurns;
          updatedGame.gameRound = newRound;
        })
      );
      setTurnPosting(false);
    } catch (err) {
      console.log('error posting Skip Turn', err);
      setTurnPosting(false);
    }
  }

  const playAgain = async () => {
    setTurnPosting(true);
    try {
      await DataStore.save(
        new Games({
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
        })
      );
      setTurnPosting(false);
    } catch (err) {
      console.log('error starting new game', err)
      setTurnPosting(false);
    }
  }

  return (
    <View style={styles.pageWrapper}>
      <KeyboardAwareScrollView style={styles.scrollablePageWrapper} keyboardShouldPersistTaps='always'>
        {players.map((player, index) => {
          return (
            <View key={index} style={[styles.playerWrapper, whichPlayersTurn === player.id && gameStatus === 'inProgress' ? styles.activePlayerWrapper : null]}>
              <View style={{flexDirection: 'row'}}>
                <View style={{alignItems: 'center', justifyContent: 'center', paddingRight: 10}}>
                  <Avatar name={player.name} size={typography.fontSizeXL + typography.fontSizeS + 10} textSize='XL' />
                </View>
                <View style={{flexDirection: 'column'}}>
                  <View style={styles.playerHeader}>
                    {winningPlayerId === player.id && (
                      <Icon name='winner' color={colors.primaryBlue} size={typography.fontSizeXL} />
                    )}
                    <Text size='XL' bold>
                      {player.name}:{' '}
                    </Text>
                    <Text size='XL'>
                      {scores.find(score => score.playerId === player.id).score}
                    </Text>
                  </View>
                  <View style={styles.turnsWrapper}>
                    {turns.filter(turn => turn.playerId === player.id).length > 0 ? (
                      turns.filter(turn => turn.playerId === player.id).map((turn, index) => {
                        return (
                          <View key={index} style={{flexDirection: 'row'}}>
                            <Text size='S'>
                              {index > 0 ? ', ' : ''}
                            </Text>
                            {turn.skipped ? (
                              <Icon name='skip' size={typography.fontSizeS} color={colors.primaryBlue} />
                            ) : (
                              <>
                                <Text size='S'>
                                  {turn.score}
                                </Text>
                                {turn.wentOver ? (
                                  <Icon name='wentOver' size={typography.fontSizeS} color={colors.red} />
                                ) : null}
                              </>
                            )}
                          </View>
                        )
                      })
                    ) : (
                      <Text size='S'>
                        Hasn't had a turn yet
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )
        })}
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
          <View style={{padding: 10, alignItems: 'center'}}>
            <Text bold size='XL'>
              {players.find((p) => p.id === winningPlayerId).name} won!
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
      </KeyboardAwareScrollView>
    </View>
  );
}

export default GameBoard;