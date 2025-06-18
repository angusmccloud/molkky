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
  const { player, winningPlayerId, whichPlayersTurn, gameStatus, scores, turns, updatedAt } = props;
  const theme = useTheme();
  const styles = useStyles(theme);

  const playerTurns = turns.filter(turn => turn.playerId === player.id);

  // TO-DO: This render was a DISASTER, unclear why it didn't work once Icons came in
  const turnsString = playerTurns.map(turn => {
    if (turn.skipped) {
      return 'Skipped';
    } else {
      return `${turn.score}${turn.wentOver ? ' (Went Over)' : ''}`;
    }
  }).join(', ');
  //   <Icon name='skip' size={typography.fontSizeS} color={theme.colors.onBackground} />
  // <Icon name='wentOver' size={typography.fontSizeS} color={theme.colors.error} />

  return (
    <Animated.View
      style={styles.container}
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
              {(whichPlayersTurn === player.id && gameStatus === 'inProgress') && (
                <Icon name='collapsed' color={theme.colors.primary} size={typography.fontSizeXL} />
              )}
              <Text size='XL' bold>
                {player.name}:{' '}
              </Text>
              <Text size='XL'>
                {scores.find(score => score.playerId === player.id).score}
              </Text>
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
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

export default PlayerStatus;