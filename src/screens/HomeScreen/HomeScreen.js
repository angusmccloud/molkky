import React, {useState, useEffect} from 'react';
import { View, Pressable } from 'react-native';
import { Button, Text, Icon } from '../../components';
import styles from './HomeScreenStyles';
import { colors, typography } from '../../styles';
import { AuthModal } from '../../containers';
import { checkAuthStatus } from '../../utils';

const HomeScreen = ({ navigation, route }) => {
  const [authStatus, setAuthStatus] = useState(undefined);
  const [showModal, setShowModal] = useState(false);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <AuthModal />
    });
    if (authStatus && authStatus.isAuthed) {
      navigation.setOptions({
        headerLeft: () => addItemButton()
      });
    }
  }, [authStatus]);

  useEffect(() => {
    const getAuthStatus = async () => {
      const auth = await checkAuthStatus();
      setAuthStatus(auth);
      // console.log('-- AUTH STATUS --', auth);
    };

    getAuthStatus();
  }, []);
 
  return (
    <View style={styles.pageWrapper}>
      <Text>
        Home Screen
      </Text>
    </View>
  );
}

export default HomeScreen;