import { useContext, useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import Text from '@/components/Text';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import { createGame, getGame } from '@/services/games';
import AuthModal from '@/containers/AuthModal';

export default function HomeScreen() {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, loading, error, signUp, signIn } = authContext;

  const createTestGame = async () => {
    if(user) {
      const newGame = await createGame(
        {
          uid: user.uid,
          players: [
            { id: user.uid, name: 'Connor Tyrrell'},
            { id: 'abc123', name: 'Indigo Miller'},
            { id: 'xyz321', name: 'Anna Wilson'},
          ],
          scores: [
            { playerId: user.uid, score: 0 },
            { playerId: 'abc123', score: 0 },
            { playerId: 'xyz321', score: 0 },
          ],
          gameStatus: 'inProgress',
          rules: {
            winningScore: 50,
            goBackToScore: 25,
            outAfterThreeMisses: false,
            outAfterThreeTimesOver: false,
          },
          turns: [],
          whichPlayersTurn: user.uid,
          gameRound: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      
      if(newGame) {
        const gameId = newGame?.id; // Assuming createGame returns the game object with an id
        console.log('Game created, in Index:', gameId);
        const fetchedGame = await getGame(gameId);
        console.log('Fetched Game:', fetchedGame);
      } else {
        console.error('Failed to create game');
      }
    }
  };

  return (
    <PageWrapper>
      <ScrollView>
        <AuthModal />
        <Button onPress={createTestGame}>
          Create Test Game
        </Button>
        <Text>
          {loading ? 'Loading user...' : user ? `Welcome, ${user.email}` : 'No user found'}
        </Text>
      </ScrollView>
    </PageWrapper>
  );
}
