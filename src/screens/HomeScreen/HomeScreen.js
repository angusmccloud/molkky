import React, { useState, useEffect, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Dialog, Portal } from "react-native-paper";
import { SortDirection } from 'aws-amplify';
import { Games } from '../../models';
import { View, Pressable } from 'react-native';
import { Text, Icon, Button } from '../../components';
import styles from './HomeScreenStyles';
import { colors, typography } from '../../styles';
import { AuthModal, GameBoard } from '../../containers';
import { DataStore } from '../../utils';
import { AuthContext } from '../../contexts';

const HomeScreen = ({ navigation, route }) => {
  const [activeGames, setActiveGames] = useState([]);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const authStatus = useContext(AuthContext).authStatus;

  const newGameButton = () => {
    return (
      <Pressable onPress={() => navigation.navigate('New Game')}>
        <View>
          <Icon
            name='addItem'
            color={colors.white}
            iconSize={typography.fontSizeXXL}
          />
        </View>
      </Pressable>
    );
  }

  const abandonGameButton = () => {
    return (
      <Pressable onPress={showDeleteDialog}>
        <View>
          <Icon
            name='trash'
            color={colors.white}
            iconSize={typography.fontSizeXXL}
          />
        </View>
      </Pressable>
    );
  }

  const showDeleteDialog = () => {
    setDeleteDialogVisible(true);
  };

  const hideDeleteDialog = () => {
    setDeleteDialogVisible(false);
  };

  const endGame = async () => {
    // console.log('-- End Game --');
    const game = activeGames[0];
    if (game) {
      try {
        await DataStore.save(
          Games.copyOf(game, updatedGame => {
            updatedGame.gameStatus = 'abandoned';
          })
        );
        hideDeleteDialog();
      } catch (err) {
        console.log('error abandoning game', err)
        hideDeleteDialog();
      }
    }
  }

  const fetchGames = async () => {
    if (authStatus && authStatus.isAuthed) {
      try {
        const gamesData = await DataStore.query(Games, g => g.owner("eq", authStatus.id).gameStatus("ne", "abandoned"), {
          sort: s => s.createdAt(SortDirection.DESCENDING)
        });

        if(gamesData !== activeGames) {
          setActiveGames(gamesData);
        }
        // console.log('-- gamesData --', gamesData);
      } catch (err) { console.log('error fetching Games', err) }
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const subscription = DataStore.observe(Games).subscribe((game) => {
        // console.log('-- SUBSCRIPTION EVENT --');
        fetchGames();
      });
      return () => subscription.unsubscribe();
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <AuthModal />
    });
    if (authStatus && authStatus.isAuthed && (activeGames.length === 0 || activeGames[0].gameStatus === 'finished')) {
      navigation.setOptions({
        headerLeft: () => newGameButton()
      });
    } else if (authStatus && authStatus.isAuthed && activeGames.length > 0 && activeGames[0].gameStatus === 'inProgress') {
      navigation.setOptions({
        headerLeft: () => abandonGameButton()
      });
    } else {
      navigation.setOptions({
        headerLeft: () => null
      });
    }
  }, [authStatus, activeGames]);

  useEffect(() => {
    fetchGames();
  }, [authStatus]);

  return (
    <View style={styles.pageWrapper}>
      {authStatus && authStatus.isAuthed && activeGames.length > 0 ? (
        <>
          <GameBoard game={activeGames[0]} />
          <Portal>
            <Dialog visible={deleteDialogVisible} onDismiss={hideDeleteDialog}>
              <Dialog.Title>End Game</Dialog.Title>
              <Dialog.Content>
                <Text>Abandon Progress on this Game. This cannot be undone</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={hideDeleteDialog} text="Cancel" variant='secondary' />
                <Button onPress={endGame} text="End Game" />
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </>
      ) : (
        <View style={{ padding: 10, alignItems: 'center', width: '100%' }}>
          {authStatus && authStatus.isAuthed && activeGames.length === 0 ? (
            <>
              <Text>
                Start your first game now
              </Text>
              <View style={{paddingTop: 20}}>
                <Button onPress={() => navigation.navigate('New Game')} text="Start New Game" />
              </View>
            </>
          ) : (
            <Text size='L' bold>
              Login to start your first game
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default HomeScreen;