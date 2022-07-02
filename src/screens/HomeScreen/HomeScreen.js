import React, {useState, useEffect, useContext} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Games } from '../../models';
import { View, Pressable } from 'react-native';
import { Text, Icon } from '../../components';
import styles from './HomeScreenStyles';
import { colors, typography } from '../../styles';
import { AuthModal, GameBoard } from '../../containers';
import { DataStore } from '../../utils';
import { AuthContext } from '../../contexts';

const HomeScreen = ({ navigation, route }) => {
  const [activeGames, setActiveGames] = useState([]);
  const authStatus = useContext(AuthContext).authStatus;

  const addItemButton = () => {
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

  const fetchGames = async () => {
    if(authStatus && authStatus.isAuthed) {
      try {
        const gamesData = await DataStore.query(Games, g => g.owner("eq", authStatus.id).gameStatus("eq", "inProgress"));
        setActiveGames(gamesData);
        // console.log('-- gamesData --', gamesData);
      } catch (err) { console.log('error fetching Games', err) }
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const subscription = DataStore.observe(Games).subscribe((game) => {
        console.log('-- SUBSCRIPTION EVENT --');
        fetchGames();
      });
      return () => subscription.unsubscribe();
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <AuthModal />
    });
    if (authStatus && authStatus.isAuthed && activeGames.length === 0) {
      navigation.setOptions({
        headerLeft: () => addItemButton()
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
        <GameBoard game={activeGames[0]} /> 
      ) : (
        <Text>
          Start a game to get started!
        </Text>
      )}
    </View>
  );
}

export default HomeScreen;