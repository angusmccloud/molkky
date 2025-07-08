'use-client';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeOutDown, FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useTheme } from 'react-native-paper';
import Text from '@/components/Text';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import useStyles from './GameBoardStyles';
import typography from '@/constants/Typography';

const PlayerStatus = (props) => {
  const { player, winningPlayerId, whichPlayersTurn, gameStatus, scores, turns, updatedAt, rules } = props;
  const theme = useTheme();
  const styles = useStyles(theme);

  const playerScore = scores.find(score => score.playerId === player.id);
  const playerTurns = turns.filter(turn => turn.playerId === player.id);

  // TO-DO: This render was a DISASTER, unclear why it didn't work once Icons came in
  const turnsString = playerTurns.map(turn => {
    if (turn.skipped) {
      return 'Skipped';
    } else if (turn.eliminated) {
      return `${turn.score} (ELIMINATED)`;
    } else {
      return `${turn.score}${turn.wentOver ? ' (Went Over)' : ''}`;
    }
  }).join(', ');
  //   <Icon name='skip' size={typography.fontSizeS} color={theme.colors.onBackground} />
  // <Icon name='wentOver' size={typography.fontSizeS} color={theme.colors.error} />

  const isEliminated = playerScore?.isOut || false;

  return (
    <Animated.View
      style={[styles.container, isEliminated && { opacity: 0.5 }]}
      layout={LinearTransition}
      entering={FadeInUp}
      exiting={FadeOutDown}
    >
      <View style={styles.playerWrapper}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 10 }}>
            <Avatar name={player.name} size={(typography.fontSizeXL + typography.fontSizeS) * 1.5} textSize='XL' />
          </View>
          <View style={{ flexDirection: 'column' }}>
            <View style={styles.playerHeader}>
              {/* {(winningPlayerId && winningPlayerId === player.id && gameStatus !== 'inProgress') && (
                <Icon name='winner' color={theme.colors.primary} size={typography.fontSizeXL} />
              )} */}
              {(whichPlayersTurn === player.id && gameStatus === 'inProgress' && !isEliminated) && (
                <Icon name='collapsed' color={theme.colors.primary} size={typography.fontSizeXL} />
              )}
              <Text size='XL' bold style={isEliminated && { textDecorationLine: 'line-through' }}>
                {player.name}:{' '}
              </Text>
              <Text size='XL' style={isEliminated && { textDecorationLine: 'line-through' }}>
                {playerScore?.score || 0}
              </Text>
              {isEliminated && (
                <Text size='M' style={{ color: theme.colors.error, marginLeft: 10 }}>
                  ELIMINATED
                </Text>
              )}
            </View>
            <View style={styles.turnsWrapper}>
              <Text size='S' style={{ color: theme.colors.onBackground }}>
                {playerTurns.length === 0 ? 
                  (
                    'Hasn\'t had a turn yet'
                  ) : 
                  (
                    turnsString
                  )
                }
              </Text>
            </View>
            {/* Show miss and over counts if the rules are enabled */}
            {((rules?.outAfterThreeMisses && playerScore?.misses > 0) || (rules?.outAfterThreeTimesOver && playerScore?.timesOver > 0)) && (
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                {(rules?.outAfterThreeMisses && playerScore?.misses > 0) && (
                  <Text size='XS' style={{ color: theme.colors.error, marginRight: 10 }}>
                    Misses: {playerScore.misses}/3
                  </Text>
                )}
                {(rules?.outAfterThreeTimesOver && playerScore?.timesOver > 0) && (
                  <Text size='XS' style={{ color: theme.colors.error }}>
                    Overs: {playerScore.timesOver}/3
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

export default PlayerStatus;