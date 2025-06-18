import { useContext, useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Text from '@/components/Text';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import MultiSelectInput from '@/components/MultiSelectInput';
import TextInput from '@/components/TextInput';
import Chip from '@/components/Chip';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import typography from '@/constants/Typography';
import { TextSizes } from '@/components/Text';
import NewGameModal from '@/containers/NewGameModal';
import GameBoard from '@/containers/GameBoard';

export default function HomeScreen() {
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [currentGameStatus, setCurrentGameStatus] = useState<string | null>(null);
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, loading, error, signUp, signIn } = authContext;

  const handleGameCreated = async (gameId: string) => {
    setCurrentGameId(gameId);
    setCurrentGameStatus('inProgress');
  };

  return (
    <PageWrapper>
        {/* <Text>
          {loading ? 'Loading user...' : user ? `Welcome, ${user.displayName}` : 'Login to Backup Data in the Cloud'}
        </Text> */}
        <Button onPress={() => setShowNewGameModal(true)}>
          Show New Game Modal
        </Button>
        <NewGameModal
          showModal={showNewGameModal}
          closeModal={() => setShowNewGameModal(false)}
          onGameCreated={handleGameCreated}
        />
        {/* <Text>
          {currentGameId ? `Current Game ID: ${currentGameId}` : 'No game created yet'}
        </Text> */}
        {currentGameId && (
          <GameBoard gameId={currentGameId} setCurrentGameStatus ={setCurrentGameStatus} onGameCreated={handleGameCreated} />
        )}
    </PageWrapper>
  );
}
