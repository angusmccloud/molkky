import React from 'react';
import { View } from 'react-native';
import { Text, Icon, Divider, Avatar } from '../../components';
import styles from './GameBoardStyles';
import { colors, typography } from '../../styles';

const PlayerStatus = (props) => {
  const { index, player, winningPlayerId, whichPlayersTurn, gameStatus, scores, turns } = props;

  return (
    <View>
      {index !== 0 && (
        <View style={{ paddingTop: 3, paddingBottom: 3 }}>
          <Divider />
        </View>
      )}
      <View style={styles.playerWrapper}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 10 }}>
            <Avatar name={player.name} size={(typography.fontSizeXL + typography.fontSizeS) * 1.5} textSize='XL' />
          </View>
          <View style={{ flexDirection: 'column' }}>
            <View style={styles.playerHeader}>
              {winningPlayerId === player.id && (
                <Icon name='winner' color={colors.primaryBlue} size={typography.fontSizeXL} />
              )}
              {whichPlayersTurn === player.id && gameStatus === 'inProgress' && (
                <Icon name='play' color={colors.primaryBlue} size={typography.fontSizeXL} />
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
                    <View key={index} style={{ flexDirection: 'row' }}>
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
    </View>
  )
}

export default PlayerStatus;